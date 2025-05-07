import validator from 'validator';

export function sanitizeUsername(value) {
  return (value || '').trim().replace(/[^\w\s.-]/g, '');
}
export function sanitizeEmail(value) {
  return validator.normalizeEmail(value || '', { gmail_remove_dots: false }) || '';
}
export function sanitizePassword(value) {
  return (value || '').trim();
}