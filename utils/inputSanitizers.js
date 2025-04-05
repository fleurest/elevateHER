// allows alphanumeric, underscore, dash, dot, and @
export function sanitizeUsername(value) {
  return value.replace(/[^\w.@-]/g, '');
}

export function sanitizePassword(value) {
  return value.replace(/[\x00-\x1F\x7F]/g, '');
}

module.exports = {
  sanitizeUsername,
  sanitizePassword
};