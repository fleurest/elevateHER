// allows alphanumeric, underscore, dash, dot, and @
function sanitizeUsername(value) {
  return value.replace(/[^\w.@-]/g, '');
}

function sanitizePassword(value) {
  return value.replace(/[\x00-\x1F\x7F]/g, '');
}