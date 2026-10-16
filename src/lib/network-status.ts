const slowRequestDelayMs = 5000;
const listeners = new Set<() => void>();
const initialSnapshot = { online: true, offlineEpisode: 0, slowRequests: 0, slowEpisode: 0 };
let snapshot = initialSnapshot;

function publish(next: typeof snapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

function updateConnectivity() {
  const online = navigator.onLine;
  if (online === snapshot.online) return;
  publish({
    ...snapshot,
    online,
    offlineEpisode: snapshot.offlineEpisode + (online ? 0 : 1),
  });
}

export function subscribeNetworkStatus(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== 'undefined') {
    window.addEventListener('online', updateConnectivity);
    window.addEventListener('offline', updateConnectivity);
    updateConnectivity();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && typeof window !== 'undefined') {
      window.removeEventListener('online', updateConnectivity);
      window.removeEventListener('offline', updateConnectivity);
    }
  };
}

export function getNetworkStatus() {
  return snapshot;
}

export function getServerNetworkStatus() {
  return initialSnapshot;
}

export function beginLoadingNotice() {
  let slow = false;
  let finished = false;
  const timer = setTimeout(() => {
    slow = true;
    publish({
      ...snapshot,
      slowRequests: snapshot.slowRequests + 1,
      slowEpisode: snapshot.slowEpisode + (snapshot.slowRequests === 0 ? 1 : 0),
    });
  }, slowRequestDelayMs);

  return function finishLoadingNotice() {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    if (slow) publish({ ...snapshot, slowRequests: snapshot.slowRequests - 1 });
  };
}

export async function withLoadingNotice<T>(work: () => Promise<T>): Promise<T> {
  const finish = beginLoadingNotice();
  try {
    return await work();
  } finally {
    finish();
  }
}

// Preserve the caller's response, cancellation, and error handling. Never retry a write here.
export function fetchWithStatus(...args: Parameters<typeof fetch>) {
  return withLoadingNotice(() => fetch(...args));
}
