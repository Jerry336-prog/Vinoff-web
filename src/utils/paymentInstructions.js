export const PAYSTACK_INSTRUCTIONS = 'Pay securely with Paystack from checkout, your order, or your invoice. Payment confirmation is automatic; no receipt upload is required.';

export const normalizePaymentInstructions = value => {
  const text = String(value || '').trim();
  return !text || /(?:wire payments transfer slips|upload.{0,45}(?:payment|receipt|proof|screenshot)|(?:slips?|proof).{0,45}(?:submit|support chat)|transfer payment narration)/i.test(text)
    ? PAYSTACK_INSTRUCTIONS : text;
};
