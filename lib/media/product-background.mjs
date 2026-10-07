import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const MODEL_URL = 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx';
const MODEL_SHA256 = '309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8';
const SIZE = 320;
const CACHE_VERSION = 'u2netp-2';
const cacheDir = path.join(process.cwd(), '.cache', 'product-photos');
const modelPath = path.join(cacheDir, 'models', 'u2netp.onnx');

// HMR must not create additional native sessions or inference queues.
const stateKey = Symbol.for(`lasmunecas.product-background.${CACHE_VERSION}`);
const state = (globalThis[stateKey] ??= {
  session: null,
  queue: Promise.resolve(),
  pending: new Map()
});

async function atomicWrite(filename, bytes) {
  await mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${randomUUID()}.tmp`;
  await writeFile(temporary, bytes);
  await rename(temporary, filename);
}

async function loadSession() {
  let bytes;
  try {
    bytes = await readFile(modelPath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const response = await fetch(MODEL_URL, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`Product mask model HTTP ${response.status}`);
    if (Number(response.headers.get('content-length') ?? 0) > 8 * 1024 * 1024)
      throw new Error('Product mask model exceeds download limit');
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (
    bytes.length > 8 * 1024 * 1024 ||
    createHash('sha256').update(bytes).digest('hex') !== MODEL_SHA256
  )
    throw new Error('Product mask model checksum mismatch');
  await atomicWrite(modelPath, bytes);
  const ort = await import('onnxruntime-node');
  const session = await ort.InferenceSession.create(bytes, {
    executionProviders: ['cpu'],
    intraOpNumThreads: 1,
    interOpNumThreads: 1
  });
  return { ort, session };
}

function getSession() {
  if (!state.session) {
    state.session = loadSession().catch(error => {
      state.session = null;
      throw error;
    });
  }
  return state.session;
}

async function segment(source) {
  const { data: rgba, info } = await sharp(source, { limitInputPixels: 16000000 })
    .rotate()
    .resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true })
    .toColourspace('srgb')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const corners = [0, width - 1, (height - 1) * width, width * height - 1];
  const alreadyTransparent = corners.filter(index => rgba[index * 4 + 3] < 16).length >= 3;

  if (!alreadyTransparent) {
    const rgb = await sharp(rgba, { raw: { width, height, channels: 4 } })
      .flatten({ background: '#ffffff' })
      .resize(SIZE, SIZE, { fit: 'fill', kernel: 'lanczos3' })
      .removeAlpha()
      .raw()
      .toBuffer();
    let maximum = 1;
    for (const value of rgb) maximum = Math.max(maximum, value);
    const input = new Float32Array(3 * SIZE * SIZE);
    const means = [0.485, 0.456, 0.406];
    const deviations = [0.229, 0.224, 0.225];
    for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
      for (let channel = 0; channel < 3; channel++) {
        input[channel * SIZE * SIZE + pixel] =
          (rgb[pixel * 3 + channel] / maximum - means[channel]) / deviations[channel];
      }
    }
    const { ort, session } = await getSession();
    const outputName = session.outputNames[0];
    const output = await session.run(
      { [session.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, SIZE, SIZE]) },
      [outputName]
    );
    const prediction = output[outputName].data;
    let low = Infinity;
    let high = -Infinity;
    for (const value of prediction) {
      low = Math.min(low, value);
      high = Math.max(high, value);
    }
    if (!Number.isFinite(high - low) || high - low < 1e-6)
      throw new Error('Product mask has no foreground');
    const mask = Buffer.alloc(SIZE * SIZE);
    for (let index = 0; index < mask.length; index++) {
      const confidence = (prediction[index] - low) / (high - low);
      mask[index] = Math.round(255 * Math.min(1, Math.max(0, (confidence - 0.08) / 0.84)));
    }
    const alpha = await sharp(mask, { raw: { width: SIZE, height: SIZE, channels: 1 } })
      .resize(width, height, { kernel: 'lanczos3' })
      .toColourspace('b-w')
      .raw()
      .toBuffer();
    for (let index = 0; index < width * height; index++) {
      rgba[index * 4 + 3] = Math.round((rgba[index * 4 + 3] * alpha[index]) / 255);
    }
  }
  // Discard hidden RGB in transparent pixels to keep the PNG small.
  for (let offset = 0; offset < rgba.length; offset += 4) {
    if (rgba[offset + 3] === 0) {
      rgba[offset] = 0;
      rgba[offset + 1] = 0;
      rgba[offset + 2] = 0;
    }
  }
  return sharp(rgba, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}

/** Local inference; cache is keyed by source contents and processing version. */
export async function removeProductBackground(source) {
  const key = createHash('sha256').update(CACHE_VERSION).update(source).digest('hex');
  const filename = path.join(cacheDir, 'images', `${key}.png`);
  try {
    return await readFile(filename);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (state.pending.has(key)) return state.pending.get(key);
  const task = state.queue.then(async () => {
    const output = await segment(source);
    await atomicWrite(filename, output);
    return output;
  });
  state.queue = task.then(
    () => undefined,
    () => undefined
  );
  state.pending.set(key, task);
  try {
    return await task;
  } finally {
    state.pending.delete(key);
  }
}
