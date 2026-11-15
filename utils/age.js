export function calculateAgeFromBirthday(birthdayStr) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(birthdayStr || '');
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  const birth = new Date(year, month - 1, day);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthdayThisYear =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthdayThisYear) age--;
  return age;
}

export function isAgeConsistentWithBirthday(age, birthdayStr, tolerance = 1) {
  const computed = calculateAgeFromBirthday(birthdayStr);
  if (computed === null) return true;
  return Math.abs(Number(age) - computed) <= tolerance;
}
