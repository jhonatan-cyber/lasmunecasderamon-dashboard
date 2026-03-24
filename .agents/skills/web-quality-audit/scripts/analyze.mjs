#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

const severityOrder = ['critical', 'high', 'medium', 'low'];
const severityRank = {
  off: -1,
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};
const categoryOrder = ['Performance', 'Accessibility', 'SEO', 'Best Practices'];

function parseArgs(argv) {
  const args = {
    format: 'markdown',
    failOn: 'off',
    failRules: '',
    output: null,
    baseUrl: null,
    port: process.env.WEB_QUALITY_AUDIT_PORT ?? '3210',
  };

  for (const arg of argv) {
    if (arg.startsWith('--format=')) args.format = arg.slice('--format='.length);
    else if (arg.startsWith('--fail-on=')) args.failOn = arg.slice('--fail-on='.length);
    else if (arg.startsWith('--fail-rules=')) args.failRules = arg.slice('--fail-rules='.length);
    else if (arg.startsWith('--output=')) args.output = arg.slice('--output='.length);
    else if (arg.startsWith('--base-url=')) args.baseUrl = arg.slice('--base-url='.length);
    else if (arg.startsWith('--port=')) args.port = arg.slice('--port='.length);
  }

  return args;
}

function readText(filePath) {
  return readFileSync(filePath, 'utf8');
}

function fileExists(filePath) {
  return existsSync(filePath);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function addFinding(collection, finding) {
  collection.push({
    id: slugify(`${finding.severity}-${finding.category}-${finding.title}`),
    ...finding,
  });
}

function summarizeFindings(findings) {
  const bySeverity = Object.fromEntries(severityOrder.map((severity) => [severity, 0]));
  const byCategory = Object.fromEntries(categoryOrder.map((category) => [category, 0]));

  for (const finding of findings) {
    bySeverity[finding.severity] += 1;
    byCategory[finding.category] += 1;
  }

  return {
    total: findings.length,
    bySeverity,
    byCategory,
  };
}

function extractValue(content, pattern) {
  const match = content.match(pattern);
  return match ? match[1] : null;
}

function buildPriorities(findings) {
  return [...findings]
    .sort((left, right) => severityRank[right.severity] - severityRank[left.severity])
    .slice(0, 3)
    .map((finding, index) => `${index + 1}. ${finding.title} (${finding.severity})`);
}

function parseFailRules(rawRules) {
  if (!rawRules) return new Map();

  const rules = new Map();
  for (const rawRule of rawRules.split(',')) {
    const [category, severity] = rawRule.split(':').map((part) => part?.trim());
    if (!category || !severity || !(severity in severityRank)) continue;
    rules.set(category, severity);
  }

  return rules;
}

function shouldFailReport(findings, globalFailOn, failRules) {
  const matchingFinding = findings.find((finding) => {
    const categoryThreshold = failRules.get(finding.category);
    if (categoryThreshold && severityRank[finding.severity] >= severityRank[categoryThreshold]) {
      return true;
    }

    return globalFailOn !== 'off' && severityRank[finding.severity] >= severityRank[globalFailOn];
  });

  return Boolean(matchingFinding);
}

function renderMarkdown(report) {
  const lines = [
    '# Web Quality Audit',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Summary',
    `- Findings: ${report.summary.total} total (${severityOrder
      .map((severity) => `${severity}: ${report.summary.bySeverity[severity]}`)
      .join(', ')})`,
    `- Categories: ${categoryOrder
      .map((category) => `${category}: ${report.summary.byCategory[category]}`)
      .join(', ')}`,
    `- Runtime audit: ${report.runtime.performed ? 'performed' : 'skipped'}`,
  ];

  if (report.runtime.performed) {
    lines.push(`- Audited routes: ${report.runtime.routes.map((route) => route.path).join(', ')}`);
  } else {
    lines.push(`- Runtime note: ${report.runtime.reason}`);
  }
  lines.push('');

  for (const severity of severityOrder) {
    const matchingFindings = report.findings.filter((finding) => finding.severity === severity);
    const heading =
      severity === 'critical'
        ? 'Critical issues'
        : severity === 'high'
          ? 'High priority'
          : severity === 'medium'
            ? 'Medium priority'
            : 'Low priority';

    lines.push(`## ${heading} (${matchingFindings.length} found)`);
    if (matchingFindings.length === 0) {
      lines.push('- None', '');
      continue;
    }

    for (const finding of matchingFindings) {
      lines.push(
        `- **[${finding.category}]** ${finding.title}${finding.location ? ` File: \`${finding.location}\`` : ''}`
      );
      lines.push(`  - **Impact:** ${finding.impact}`);
      lines.push(`  - **Evidence:** ${finding.evidence}`);
      lines.push(`  - **Fix:** ${finding.recommendation}`);
    }
    lines.push('');
  }

  lines.push('## Recommended priority');
  if (report.priorities.length === 0) {
    lines.push('1. No blocking findings; keep the audit in CI and review new regressions.');
  } else {
    lines.push(...report.priorities);
  }

  return `${lines.join('\n')}\n`;
}

async function waitForServer(baseUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/login`, { redirect: 'manual' });
      if (response.status >= 200 && response.status < 500) return;
    } catch {
      // Retry until timeout.
    }
    await delay(1000);
  }

  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function startNextServer(repoRoot, port) {
  const command = process.execPath;
  const nextBin = path.join(repoRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
  const child = spawn(
    command,
    [nextBin, 'start', '--hostname', '127.0.0.1', '--port', String(port)],
    {
      cwd: repoRoot,
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  let stderr = '';
  let stdout = '';
  child.stdout?.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr?.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await waitForServer(baseUrl, 60_000);
  } catch (error) {
    child.kill();
    throw new Error(
      `Unable to start Next server for audit.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}\n${error}`
    );
  }

  return { baseUrl, child };
}

async function stopServer(server) {
  if (!server?.child || server.child.killed) return;
  server.child.kill();
  await delay(1000);
}

async function auditRuntime(baseUrl, findings) {
  const routes = [
    {
      path: '/',
      expectedText: 'Las Mu',
      pageLocation: 'app/landing/page.tsx',
    },
    {
      path: '/login',
      expectedText: 'Iniciar sesi',
      pageLocation: 'app/login/page.tsx',
    },
    {
      path: '/politica-de-privacidad',
      expectedText: 'Politica de Privacidad',
      pageLocation: 'app/politica-de-privacidad/page.tsx',
    },
    {
      path: '/terminos-y-condiciones',
      expectedText: 'DOCUMENTO LEGAL',
      pageLocation: 'app/terminos-y-condiciones/page.tsx',
    },
  ];

  for (const route of routes) {
    const response = await fetch(`${baseUrl}${route.path}`, { redirect: 'manual' });

    if (response.status !== 200) {
      addFinding(findings, {
        severity: 'high',
        category: 'Best Practices',
        title: `Public route ${route.path} is not serving correctly`,
        impact: 'Broken public pages hurt both discoverability and user trust.',
        evidence: `Expected 200 but received ${response.status}.`,
        recommendation: `Fix the route handler or page rendering for ${route.path} before release.`,
        location: route.pageLocation,
      });
      continue;
    }

    const html = await response.text();

    if (route.expectedText && !html.includes(route.expectedText)) {
      addFinding(findings, {
        severity: 'medium',
        category: 'Best Practices',
        title: `Route ${route.path} did not render the expected primary content`,
        impact: 'A route that responds without its expected content can hide runtime rendering regressions.',
        evidence: `The HTML response for ${route.path} did not include "${route.expectedText}".`,
        recommendation: 'Review the route render path and make sure the primary content is present in the server response.',
        location: route.pageLocation,
      });
    }
  }

  return routes;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const findings = [];
  const generatedAt = new Date().toISOString();

  const nextConfigPath = path.join(repoRoot, 'next.config.mjs');
  const layoutPath = path.join(repoRoot, 'app', 'layout.tsx');
  const homePath = path.join(repoRoot, 'app', 'page.tsx');
  const landingPagePath = path.join(repoRoot, 'app', 'landing', 'page.tsx');
  const loginPagePath = path.join(repoRoot, 'app', 'login', 'page.tsx');
  const loginLayoutPath = path.join(repoRoot, 'app', 'login', 'layout.tsx');
  const privacyPagePath = path.join(repoRoot, 'app', 'politica-de-privacidad', 'page.tsx');
  const termsPagePath = path.join(repoRoot, 'app', 'terminos-y-condiciones', 'page.tsx');
  const manifestPath = path.join(repoRoot, 'public', 'manifest.json');
  const robotsPath = path.join(repoRoot, 'public', 'robots.txt');
  const sitemapPath = path.join(repoRoot, 'public', 'sitemap.xml');
  const siteConfigPath = path.join(repoRoot, 'lib', 'site.ts');

  const nextConfig = fileExists(nextConfigPath) ? readText(nextConfigPath) : '';
  const layoutSource = fileExists(layoutPath) ? readText(layoutPath) : '';
  const homeSource = fileExists(homePath) ? readText(homePath) : '';
  const landingPageSource = fileExists(landingPagePath) ? readText(landingPagePath) : '';
  const loginPageSource = fileExists(loginPagePath) ? readText(loginPagePath) : '';
  const loginLayoutSource = fileExists(loginLayoutPath) ? readText(loginLayoutPath) : '';
  const privacyPageSource = fileExists(privacyPagePath) ? readText(privacyPagePath) : '';
  const termsPageSource = fileExists(termsPagePath) ? readText(termsPagePath) : '';
  const siteConfigSource = fileExists(siteConfigPath) ? readText(siteConfigPath) : '';

  const siteUrl = extractValue(siteConfigSource, /url:\s*['"`]([^'"`]+)['"`]/);
  const siteDomain = extractValue(siteConfigSource, /domain:\s*['"`]([^'"`]+)['"`]/);

  if (nextConfig.includes('ignoreBuildErrors: true')) {
    addFinding(findings, {
      severity: 'high',
      category: 'Best Practices',
      title: 'Build currently ignores TypeScript errors',
      impact: 'Type regressions can ship silently, which makes runtime quality and CI confidence worse.',
      evidence: 'next.config.mjs contains typescript.ignoreBuildErrors: true.',
      recommendation: 'Remove ignoreBuildErrors once the repo is green and keep typecheck blocking in CI.',
      location: 'next.config.mjs',
    });
  }

  if (nextConfig.includes('unoptimized: true')) {
    addFinding(findings, {
      severity: 'medium',
      category: 'Performance',
      title: 'Next image optimization is disabled',
      impact: 'Disabling image optimization increases payload size and can hurt LCP on content-heavy pages.',
      evidence: 'next.config.mjs contains images.unoptimized: true.',
      recommendation: 'Re-enable Next image optimization or document a CDN pipeline that replaces it.',
      location: 'next.config.mjs',
    });
  }

  if (!nextConfig.includes('Content-Security-Policy')) {
    addFinding(findings, {
      severity: 'medium',
      category: 'Best Practices',
      title: 'No Content-Security-Policy header is configured',
      impact: 'Without a CSP, accidental XSS sinks and third-party script issues are harder to contain.',
      evidence: 'No Content-Security-Policy header was found in next.config.mjs headers().',
      recommendation: 'Add a baseline CSP for app and public pages, then relax it only where needed.',
      location: 'next.config.mjs',
    });
  }

  if (!layoutSource.includes('<html lang=')) {
    addFinding(findings, {
      severity: 'high',
      category: 'Accessibility',
      title: 'Root layout is missing document language',
      impact: 'Assistive technology and translation services need a declared page language.',
      evidence: 'The root layout does not include a lang attribute on the html element.',
      recommendation: 'Set <html lang="es"> or the correct locale in app/layout.tsx.',
      location: 'app/layout.tsx',
    });
  }

  if (!layoutSource.includes('manifest:')) {
    addFinding(findings, {
      severity: 'medium',
      category: 'SEO',
      title: 'Root layout is not exposing the manifest through metadata',
      impact: 'Browsers and crawlers may miss installability metadata when the manifest is not linked globally.',
      evidence: 'No manifest metadata export was found in app/layout.tsx.',
      recommendation: 'Keep manifest metadata on the root layout so all routes share it.',
      location: 'app/layout.tsx',
    });
  }

  if (!layoutSource.includes('openGraph:')) {
    addFinding(findings, {
      severity: 'medium',
      category: 'SEO',
      title: 'Root layout is missing Open Graph metadata',
      impact: 'Social sharing previews degrade without OG metadata.',
      evidence: 'No openGraph block was found in app/layout.tsx metadata.',
      recommendation: 'Expose Open Graph metadata from the root layout or route-level metadata factory.',
      location: 'app/layout.tsx',
    });
  }

  if (!layoutSource.includes('twitter:')) {
    addFinding(findings, {
      severity: 'low',
      category: 'SEO',
      title: 'Root layout is missing Twitter card metadata',
      impact: 'Link previews on X/Twitter become less consistent without card metadata.',
      evidence: 'No twitter metadata block was found in app/layout.tsx.',
      recommendation: 'Expose twitter metadata alongside Open Graph metadata.',
      location: 'app/layout.tsx',
    });
  }

  if (!layoutSource.includes('robots:')) {
    addFinding(findings, {
      severity: 'medium',
      category: 'SEO',
      title: 'Root layout is missing robots metadata',
      impact: 'Crawler behavior becomes harder to reason about when pages do not emit explicit robots directives.',
      evidence: 'No robots metadata block was found in app/layout.tsx.',
      recommendation: 'Publish default robots metadata in the root layout and override it per route when necessary.',
      location: 'app/layout.tsx',
    });
  }

  if (!homeSource.includes('metadata')) {
    addFinding(findings, {
      severity: 'medium',
      category: 'SEO',
      title: 'Home route does not define route-level marketing metadata',
      impact: 'The public landing page should own its marketing title and description explicitly.',
      evidence: 'No metadata export or metadata factory usage was found in app/page.tsx.',
      recommendation: 'Export route metadata for the home page via createMarketingMetadata or generateMetadata.',
      location: 'app/page.tsx',
    });
  }

  const skipLinkChecks = [
    {
      route: '/',
      location: 'app/landing/page.tsx',
      source: landingPageSource,
      linkTarget: '#landing-content',
      targetId: "id='landing-content'",
    },
    {
      route: '/politica-de-privacidad',
      location: 'app/politica-de-privacidad/page.tsx',
      source: privacyPageSource,
      linkTarget: '#privacy-content',
      targetId: "id='privacy-content'",
    },
    {
      route: '/terminos-y-condiciones',
      location: 'app/terminos-y-condiciones/page.tsx',
      source: termsPageSource,
      linkTarget: '#terms-content',
      targetId: "id='terms-content'",
    },
  ];

  for (const check of skipLinkChecks) {
    const hasSkipLink =
      check.source.includes('Saltar al contenido principal') &&
      check.source.includes(`href='${check.linkTarget}'`);
    const hasTarget = check.source.includes(check.targetId);

    if (!hasSkipLink || !hasTarget) {
      addFinding(findings, {
        severity: 'high',
        category: 'Accessibility',
        title: `${check.route} is missing a complete skip-link pattern`,
        impact: 'Keyboard and assistive-technology users need a working shortcut to bypass repeated chrome.',
        evidence: `Expected a skip-link label, href target ${check.linkTarget}, and matching main landmark id in ${check.location}.`,
        recommendation:
          'Add a visible-on-focus skip link and point it to the main content container for the route.',
        location: check.location,
      });
    }
  }

  const loginHasMetadata =
    loginPageSource.includes('export const metadata') ||
    loginPageSource.includes('generateMetadata') ||
    loginLayoutSource.includes('export const metadata') ||
    loginLayoutSource.includes('generateMetadata');

  if (!loginHasMetadata) {
    addFinding(findings, {
      severity: 'medium',
      category: 'SEO',
      title: 'Login route does not define route-level metadata',
      impact: 'Operational routes can still leak weak titles/descriptions into previews, browser history, and indexing signals.',
      evidence: 'Neither app/login/page.tsx nor app/login/layout.tsx export metadata.',
      recommendation: 'Add route-level metadata to the login segment, including title and robots noindex if desired.',
      location: 'app/login/layout.tsx',
    });
  }

  if (!fileExists(manifestPath)) {
    addFinding(findings, {
      severity: 'high',
      category: 'Best Practices',
      title: 'Manifest file is missing',
      impact: 'PWA installability and metadata consistency degrade when the manifest is absent.',
      evidence: 'public/manifest.json was not found.',
      recommendation: 'Restore public/manifest.json and keep it linked in root metadata.',
      location: 'public/manifest.json',
    });
  } else {
    try {
      const manifest = JSON.parse(readText(manifestPath));
      if (!manifest.name || !manifest.short_name) {
        addFinding(findings, {
          severity: 'medium',
          category: 'Best Practices',
          title: 'Manifest is missing basic identity fields',
          impact: 'Browsers use manifest name fields in install surfaces and app shortcuts.',
          evidence: 'public/manifest.json is missing name or short_name.',
          recommendation: 'Populate both name and short_name in the manifest.',
          location: 'public/manifest.json',
        });
      }
      if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
        addFinding(findings, {
          severity: 'medium',
          category: 'Best Practices',
          title: 'Manifest does not define icons',
          impact: 'Install prompts and OS launchers need manifest icons for a polished experience.',
          evidence: 'public/manifest.json has no icons array entries.',
          recommendation: 'Add at least 192x192 and 512x512 icons to the manifest.',
          location: 'public/manifest.json',
        });
      }
      if (manifest.start_url !== '/') {
        addFinding(findings, {
          severity: 'low',
          category: 'Best Practices',
          title: 'Manifest start_url is not the site root',
          impact: 'Unexpected start URLs can produce confusing install behavior.',
          evidence: `public/manifest.json start_url is "${manifest.start_url ?? 'undefined'}".`,
          recommendation: 'Use "/" as start_url unless you intentionally want a different app entry point.',
          location: 'public/manifest.json',
        });
      }
    } catch (error) {
      addFinding(findings, {
        severity: 'high',
        category: 'Best Practices',
        title: 'Manifest file is not valid JSON',
        impact: 'Browsers ignore malformed manifests, which breaks installability and app metadata.',
        evidence: `public/manifest.json could not be parsed: ${error instanceof Error ? error.message : 'unknown error'}.`,
        recommendation: 'Fix the JSON structure of public/manifest.json.',
        location: 'public/manifest.json',
      });
    }
  }

  if (!fileExists(robotsPath)) {
    addFinding(findings, {
      severity: 'high',
      category: 'SEO',
      title: 'robots.txt is missing',
      impact: 'Search engines lose a primary source of crawl policy and sitemap discovery.',
      evidence: 'public/robots.txt was not found.',
      recommendation: 'Add a valid robots.txt file that references the sitemap and sensitive paths.',
      location: 'public/robots.txt',
    });
  } else {
    const robots = readText(robotsPath);
    if (!robots.includes('Sitemap:')) {
      addFinding(findings, {
        severity: 'medium',
        category: 'SEO',
        title: 'robots.txt does not reference the sitemap',
        impact: 'Crawlers discover important URLs more slowly when the sitemap is not advertised.',
        evidence: 'No Sitemap entry was found in public/robots.txt.',
        recommendation: 'Reference the XML sitemap in robots.txt.',
        location: 'public/robots.txt',
      });
    }
    if (!robots.includes('Disallow: /api/')) {
      addFinding(findings, {
        severity: 'low',
        category: 'SEO',
        title: 'robots.txt does not explicitly disallow API routes',
        impact: 'Public crawlers may waste crawl budget on machine-only endpoints.',
        evidence: 'No API disallow directive was found in public/robots.txt.',
        recommendation: 'Disallow /api/ in robots.txt to reduce noisy crawling.',
        location: 'public/robots.txt',
      });
    }
  }

  if (!fileExists(sitemapPath)) {
    addFinding(findings, {
      severity: 'high',
      category: 'SEO',
      title: 'XML sitemap is missing',
      impact: 'Search engines have less guidance about important URLs and update frequency.',
      evidence: 'public/sitemap.xml was not found.',
      recommendation: 'Add a sitemap.xml file or generate it during build.',
      location: 'public/sitemap.xml',
    });
  } else {
    const sitemap = readText(sitemapPath);
    if (siteUrl && !sitemap.includes(`${siteUrl}/`)) {
      addFinding(findings, {
        severity: 'medium',
        category: 'SEO',
        title: 'Sitemap does not include the canonical site origin',
        impact: 'A mismatch between sitemap URLs and site metadata weakens SEO consistency.',
        evidence: `Site config URL is "${siteUrl}" but sitemap.xml does not reference it.`,
        recommendation: 'Regenerate the sitemap so it uses the same canonical origin as site metadata.',
        location: 'public/sitemap.xml',
      });
    }
    for (const expectedPath of ['/', '/terminos-y-condiciones', '/politica-de-privacidad']) {
      const expectedUrl = expectedPath === '/' ? `${siteUrl}/` : `${siteUrl}${expectedPath}`;
      if (siteUrl && !sitemap.includes(expectedUrl)) {
        addFinding(findings, {
          severity: 'medium',
          category: 'SEO',
          title: `Sitemap is missing ${expectedPath}`,
          impact: 'Important public pages should be discoverable through the sitemap.',
          evidence: `${expectedUrl} was not found in public/sitemap.xml.`,
          recommendation: 'Add the route to the sitemap or make sitemap generation include it.',
          location: 'public/sitemap.xml',
        });
      }
    }
  }

  if (siteDomain && siteUrl && !siteUrl.includes(siteDomain)) {
    addFinding(findings, {
      severity: 'medium',
      category: 'SEO',
      title: 'Site URL and domain config are inconsistent',
      impact: 'Metadata and generated links can drift when domain settings disagree.',
      evidence: `siteConfig.url is "${siteUrl}" while siteConfig.domain is "${siteDomain}".`,
      recommendation: 'Keep the canonical URL and domain aligned in lib/site.ts.',
      location: 'lib/site.ts',
    });
  }

  let runtime = {
    performed: false,
    reason: 'Skipped runtime audit because no production build or base URL was available.',
    routes: [],
  };
  let server = null;

  try {
    const buildExists = fileExists(path.join(repoRoot, '.next', 'BUILD_ID'));
    if (args.baseUrl) {
      runtime.routes = await auditRuntime(args.baseUrl, findings);
      runtime = { performed: true, reason: '', routes: runtime.routes };
    } else if (buildExists) {
      server = await startNextServer(repoRoot, args.port);
      runtime.routes = await auditRuntime(server.baseUrl, findings);
      runtime = { performed: true, reason: '', routes: runtime.routes };
    }
  } finally {
    await stopServer(server);
  }

  const report = {
    generatedAt,
    project: 'lasmunecasderamon',
    skill: 'web-quality-audit',
    failConfig: {
      global: args.failOn,
      byCategory: Object.fromEntries(parseFailRules(args.failRules)),
    },
    summary: summarizeFindings(findings),
    runtime,
    findings,
    priorities: buildPriorities(findings),
  };

  const output = args.format === 'json' ? `${JSON.stringify(report, null, 2)}\n` : renderMarkdown(report);

  if (args.output) {
    const outputPath = path.resolve(repoRoot, args.output);
    await mkdir(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, output, 'utf8');
  }

  process.stdout.write(output);

  const failRules = parseFailRules(args.failRules);

  if (shouldFailReport(findings, args.failOn, failRules)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
