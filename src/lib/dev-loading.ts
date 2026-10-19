/** Development-only delay for inspecting real route fallbacks without changing their data. */
export async function waitForLoadingPreview(searchParams: Promise<{ delay?: string }>) {
  if (process.env.NODE_ENV !== 'development') return;
  const { delay } = await searchParams;
  const milliseconds = Math.min(8000, Math.max(0, Number(delay) || 0));
  if (milliseconds) await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
