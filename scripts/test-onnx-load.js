const { createHash } = require('node:crypto');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

async function test() {
  const modelPath = path.join(process.cwd(), '.cache', 'biometric-models', 'face_recognition.onnx');
  console.log(`Cargando modelo desde: ${modelPath}`);

  try {
    const bytes = await readFile(modelPath);
    console.log(`Bytes leídos: ${bytes.length}`);

    const ort = require('onnxruntime-node');
    console.log('onnxruntime-node cargado');

    const session = await ort.InferenceSession.create(bytes, {
      executionProviders: ['cpu'],
      intraOpNumThreads: 1,
      interOpNumThreads: 1
    });
    console.log('Sesión ONNX creada con éxito');
    console.log('Input names:', session.inputNames);
    console.log('Output names:', session.outputNames);

    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

test();
