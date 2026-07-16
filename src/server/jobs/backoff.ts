export function retryBackoffMs(attempt: number) {
  const base = 1000 * 2 ** Math.max(0, attempt - 1);
  const capped = Math.min(base, 15 * 60 * 1000);
  return capped + Math.floor(capped * 0.1);
}
