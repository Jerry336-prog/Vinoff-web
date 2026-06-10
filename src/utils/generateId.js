/**
 * Generates a random alphanumeric ID with an optional prefix.
 * @param {string} prefix - Optional prefix for the ID (e.g. 'INV' or 'ORD')
 * @param {number} length - Length of the random suffix (default: 6)
 * @returns {string} The generated reference ID
 */
export const generateId = (prefix = '', length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix ? `${prefix}-${result}` : result;
};

export default generateId;
