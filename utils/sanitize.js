// Strip anything but letters, spaces, hyphens, apostrophes, and periods
// (covers names like "Dela Cruz", "O'Brien", "St. Clair").
export function sanitizeName(text) {
  return text.replace(/[^a-zA-Z\s'\-.]/g, '');
}

// Strip anything but digits, capped at 3 characters (no one is 1000 years old).
export function sanitizeAge(text) {
  return text.replace(/[^0-9]/g, '').slice(0, 3);
}
