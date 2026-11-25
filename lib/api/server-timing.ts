export function addServerTimingMetric(
  response: Response,
  request: Request,
  name: string,
  durationMs: number
): void {
  if (
    process.env.NODE_ENV === 'production' ||
    request.headers.get('x-lmr-profile') !== '1' ||
    !/^[a-z][a-z0-9_-]*$/i.test(name) ||
    !Number.isFinite(durationMs) ||
    durationMs < 0
  ) {
    return;
  }

  const metric = `${name};dur=${durationMs.toFixed(2)}`;
  const existing = response.headers.get('server-timing');
  response.headers.set('server-timing', existing ? `${existing}, ${metric}` : metric);
}
