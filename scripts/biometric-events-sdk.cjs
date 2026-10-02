/* Isolated NetSDK process: never pass credentials via argv or log native payloads. */
const path = require('node:path');
const readline = require('node:readline');

let started = false;
let stopping = false;
let sdk;
let loginHandle;
let subscription;
let heartbeat;
const emit = message => process.stdout.write(JSON.stringify(message) + '\n');
const call = (fn, ...args) =>
  new Promise((resolve, reject) => {
    fn.async(...args, (error, value) => (error ? reject(error) : resolve(value)));
  });

async function stop() {
  if (stopping) return;
  stopping = true;
  clearInterval(heartbeat);
  // The parent also has a kill deadline in case the native SDK stops responding.
  try {
    if (subscription) await call(sdk.func('int CLIENT_StopLoadPic(int64 handle)'), subscription);
    if (loginHandle) await call(sdk.func('int CLIENT_Logout(int64 handle)'), loginHandle);
  } finally {
    process.exit(0);
  }
}

async function start(credentials) {
  if (process.platform !== 'win32' || process.arch !== 'x64')
    throw new Error('Unsupported SDK platform');
  const koffi = require('koffi');
  const directory = process.env.DAHUA_SDK_DIR || 'C:\\Program Files\\SmartPSSLite';
  process.env.PATH = `${process.env.PATH || ''};${directory}`;
  sdk = koffi.load(path.join(directory, 'dhnetsdk.dll'));
  const disconnectType = koffi.proto(
    'void DisconnectEvent(int64 handle, const char *ip, int port, uintptr_t user)'
  );
  const disconnected = koffi.register(() => {
    if (!stopping) emit({ type: 'disconnected' });
  }, koffi.pointer(disconnectType));
  if (!sdk.func('int CLIENT_Init(void *callback, uintptr_t user)')(disconnected, 0)) {
    throw new Error('SDK init failed');
  }
  const login = sdk.func(
    'int64 CLIENT_LoginEx2(const char *ip, uint16_t port, const char *user, const char *password, int mode, void *cap, void *info, void *error)'
  );
  loginHandle = await call(
    login,
    credentials.ip,
    37777,
    credentials.usuario,
    credentials.clave,
    0,
    null,
    Buffer.alloc(8192),
    Buffer.alloc(4)
  );
  if (!loginHandle) throw new Error('SDK login failed');
  if (stopping) return stop();
  const eventType = koffi.proto(
    'int AccessEvent(int64 handle, uint32_t type, void *info, void *buffer, uint32_t size, uintptr_t user, int sequence, void *reserved)'
  );
  const callback = koffi.register((_handle, code) => {
    // No SDK/database operations inside the callback. The parent retrieves
    // canonical access records, avoiding firmware-specific binary structures.
    if (!stopping) emit({ type: 'event', code });
    return 0;
  }, koffi.pointer(eventType));
  const subscribe = sdk.func(
    'int64 CLIENT_RealLoadPictureEx(int64 login, int channel, uint32_t type, int pictures, void *callback, uintptr_t user, void *reserved)'
  );
  // EVENT_IVS_ALL = 1, channel 0, no picture payloads.
  subscription = await call(subscribe, loginHandle, 0, 1, 0, callback, 0, null);
  if (!subscription) throw new Error('SDK subscription failed');
  if (stopping) return stop();
  emit({ type: 'ready' });
  heartbeat = setInterval(() => emit({ type: 'heartbeat' }), 5000);
}

const input = readline.createInterface({ input: process.stdin });
input.on('line', line => {
  if (started) {
    if (line === 'stop') void stop();
    return;
  }
  started = true;
  void Promise.resolve()
    .then(() => start(JSON.parse(line)))
    .catch(() => {
      // Do not expose exceptions from FFI: they may include credentials.
      emit({ type: 'error' });
      void stop();
    });
});
input.on('close', () => void stop());
process.on('SIGTERM', () => void stop());
