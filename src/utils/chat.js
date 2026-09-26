export const CHAT_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "awaiting_invoice", label: "Awaiting Invoice" },
  { value: "awaiting_payment", label: "Awaiting Payment Confirmation" },
  { value: "closed", label: "Resolved" },
];

export const toChatStatusValue = (status) => {
  const raw = String(status || "open").trim();
  const found = CHAT_STATUS_OPTIONS.find(
    (option) => option.value === raw || option.label === raw,
  );
  if (found) return found.value;

  const normalized = raw.toLowerCase().replace(/\s+/g, "_");
  if (normalized === "resolved") return "closed";
  return CHAT_STATUS_OPTIONS.some((option) => option.value === normalized)
    ? normalized
    : "open";
};

export const formatChatStatus = (status) => {
  const value = toChatStatusValue(status);
  return (
    CHAT_STATUS_OPTIONS.find((option) => option.value === value)?.label || "Open"
  );
};
