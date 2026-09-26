const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isApiEnvelope = (value) => {
  if (!isPlainObject(value)) return false;

  const keys = Object.keys(value);
  const hasData = Object.prototype.hasOwnProperty.call(value, "data");
  const hasSuccess = Object.prototype.hasOwnProperty.call(value, "success");
  const hasMeta = Object.prototype.hasOwnProperty.call(value, "meta");
  const hasMessage = typeof value.message === "string";
  const envelopeKeys = new Set([
    "data",
    "success",
    "message",
    "meta",
    "pagination",
    "total",
    "count",
    "page",
    "pages",
    "limit",
  ]);

  return (
    hasSuccess ||
    (hasData && (hasMessage || hasMeta || keys.every((key) => envelopeKeys.has(key))))
  );
};

export const unwrapApiRecord = (response) => {
  if (response == null) return null;

  if (isApiEnvelope(response)) {
    if (response.data !== undefined) return unwrapApiRecord(response.data);
    if (response.item !== undefined) return unwrapApiRecord(response.item);
    if (response.record !== undefined) return unwrapApiRecord(response.record);
  }

  return response;
};

export const unwrapApiList = (response) => {
  const payload = unwrapApiRecord(response);

  if (Array.isArray(payload)) return payload;
  if (!isPlainObject(payload)) return [];

  const candidates = [
    payload.items,
    payload.results,
    payload.docs,
    payload.chats,
    payload.rooms,
    payload.orders,
    payload.invoices,
    payload.customers,
    payload.users,
    payload.messages,
    payload.data,
  ];

  return candidates.find(Array.isArray) || [];
};
