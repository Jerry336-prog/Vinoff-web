/**
 * Creates a key that identifies one user-initiated write operation.
 * The API must persist this key with the completed result and return that result
 * when it receives the same key again.
 */
export const createIdempotencyKey = (operation = "mutation") => {
  const id =
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `vinoff-${operation}-${id}`;
};

export const withIdempotencyKey = (key) => ({
  headers: {
    "Idempotency-Key": key,
  },
});
