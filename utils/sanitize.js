export function sanitizeName(text) {
  return text.replace(/[^a-zA-Z\s'\-.]/g, '');
}

export function sanitizeAge(text) {
  return text.replace(/[^0-9]/g, '').slice(0, 3);
}
