/** Collapse dynamic IDs and unknown paths before emitting telemetry. */
export function performanceRoute(pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0];
  if (/^\/(write|lesson|feedback|revision)\/[^/]+$/.test(path)) {
    return '/' + path.split('/')[1] + '/[id]';
  }
  return [
    '/',
    '/today',
    '/path',
    '/practice',
    '/progress',
    '/portfolio',
    '/settings',
    '/onboarding',
    '/placement',
    '/login',
    '/privacy',
    '/terms',
  ].includes(path)
    ? path
    : '/other';
}
