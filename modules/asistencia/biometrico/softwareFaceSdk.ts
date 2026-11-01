import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import logger from '@/lib/utils/logger';

const MODEL_URL =
  'https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_sc.zip';
const MODEL_SHA256 = '9cc6e4a75f0e2bf0b1aed94578f144d15175f357bdc05e815e5c4a02b319eb4f';
const SIZE = 112; // MobileFaceNet y ArcFace suelen usar 112x112

const cacheDir = path.join(process.cwd(), '.cache', 'biometric-models');
const modelPath = path.join(cacheDir, 'face_recognition.onnx');

interface EstadoMotor {
  session: Promise<Awaited<ReturnType<typeof loadSession>>> | null;
  queue: Promise<unknown>;
}

const stateKey = Symbol.for('lasmunecas.face-recognition-sdk');
const globalConEstado = globalThis as unknown as Record<symbol, EstadoMotor>;
const state = (globalConEstado[stateKey] ??= {
  session: null,
  queue: Promise.resolve()
});

async function atomicWrite(filename: string, bytes: Buffer) {
  await mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${randomUUID()}.tmp`;
  await writeFile(temporary, bytes);
  await rename(temporary, filename);
}

async function loadSession() {
  let bytes: Buffer;
  try {
    bytes = await readFile(modelPath);
  } catch (error: any) {
    if (error.code !== 'ENOENT') throw error;

    throw new Error(`El modelo de reconocimiento facial ONNX no se encuentra en ${modelPath}`);
  }

  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== MODEL_SHA256) {
    throw new Error(
      `El modelo ${modelPath} no es el esperado (SHA256 ${hash}, se esperaba ${MODEL_SHA256}).`
    );
  }

  const ort = await import('onnxruntime-node');
  const session = await ort.InferenceSession.create(bytes, {
    executionProviders: ['cpu'],
    intraOpNumThreads: 1,
    interOpNumThreads: 1
  });
  return { ort, session };
}

async function getSession() {
  if (!state.session) {
    state.session = loadSession().catch(error => {
      state.session = null;
      throw error;
    });
  }
  return state.session;
}

export async function extraerVectorFacialSoftware(foto: Buffer): Promise<Float32Array> {
  const { ort, session } = await getSession();
  const { data: rgb, info } = await sharp(foto)
    .resize(SIZE, SIZE, { fit: 'cover' })
    .toColourspace('srgb')
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const input = new Float32Array(3 * SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    input[0 * SIZE * SIZE + i] = (rgb[i * 3 + 0] - 127.5) / 128.0; // R
    input[1 * SIZE * SIZE + i] = (rgb[i * 3 + 1] - 127.5) / 128.0; // G
    input[2 * SIZE * SIZE + i] = (rgb[i * 3 + 2] - 127.5) / 128.0; // B
  }

  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];

  const feeds = {
    [inputName]: new ort.Tensor('float32', input, [1, 3, SIZE, SIZE])
  };

  const results = await session.run(feeds);
  const embedding = results[outputName].data as Float32Array;

  let norm = 0;
  for (let i = 0; i < embedding.length; i++) norm += embedding[i] * embedding[i];
  norm = Math.sqrt(norm);

  const normalized = new Float32Array(embedding.length);
  for (let i = 0; i < embedding.length; i++) normalized[i] = embedding[i] / (norm + 1e-6);

  return normalized;
}
