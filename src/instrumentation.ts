/** Writes server-side request errors to the log in the same searchable form as browser errors. */
export function onRequestError(err: unknown, request: { path: string }) {
  const e = err instanceof Error ? err : new Error(String(err));
  console.error("[server-error]", JSON.stringify({ message: e.message.slice(0, 500), stack: (e.stack ?? "").slice(0, 2000), path: request.path }));
}
