let pending = 0;
const listeners = new Set<() => void>();

export const subscribeRegistrations = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const getPendingRegistrations = () => pending;
export const getServerPendingRegistrations = () => 0;

export function beginRegistration() {
  pending++;
  listeners.forEach(listener => listener());
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    pending--;
    listeners.forEach(listener => listener());
  };
}
