import { z } from 'zod';

// 1. Name: only letters (and spaces), min 2, max 40
export const riderNameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(40, 'Name must not exceed 40 characters')
  .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces');

// 2. Phone: optional leading +, then 5–15 digits; no spaces or other symbols
export const riderPhoneSchema = z
  .string()
  .min(1, 'Phone is required')
  .regex(/^\+?\d{5,15}$/, 'Phone: optional + then 5–15 digits; no spaces or other symbols');

// 3. Date (DOB / License expiry): year < 9999 (at most 4 digits), month 1–12
function parseDateParts(value: string): { day?: number; month?: number; year?: number } | null {
  if (!value || !value.trim()) return null;
  const trimmed = value.trim();
  // Try dd/mm/yyyy or dd-mm-yyyy
  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{1,4})$/.exec(trimmed);
  if (dmy) {
    return { day: parseInt(dmy[1], 10), month: parseInt(dmy[2], 10), year: parseInt(dmy[3], 10) };
  }
  // Try yyyy-mm-dd (HTML date input)
  const ymd = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/.exec(trimmed);
  if (ymd) {
    return { year: parseInt(ymd[1], 10), month: parseInt(ymd[2], 10), day: parseInt(ymd[3], 10) };
  }
  // Try mm/dd/yyyy
  const mdy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{1,4})$/.exec(trimmed);
  if (mdy) {
    return { month: parseInt(mdy[1], 10), day: parseInt(mdy[2], 10), year: parseInt(mdy[3], 10) };
  }
  return null;
}

function isValidDateValue(parts: { month?: number; year?: number } | null): boolean {
  if (!parts) return true; // empty optional
  const { month, year } = parts;
  if (year != null) {
    if (year < 1 || year >= 9999) return false; // year < 9999
  }
  if (month != null) {
    if (month < 1 || month > 12) return false;
  }
  return true;
}

// Optional date: empty valid; if set, must be dd/mm/yyyy, yyyy-mm-dd, or mm/dd/yyyy with year < 9999, month 1–12
function isValidOptionalDate(val: string | undefined): boolean {
  const s = (val ?? '').trim();
  if (!s) return true;
  const parts = parseDateParts(s);
  if (!parts) return false; // unrecognized format
  return isValidDateValue(parts);
}

export const riderDateOfBirthSchema = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(isValidOptionalDate, {
    message: 'Use dd/mm/yyyy, yyyy-mm-dd, or mm/dd/yyyy; year < 9999, month 1–12',
  });

export const riderLicenseExpirySchema = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(isValidOptionalDate, {
    message: 'Use dd/mm/yyyy, yyyy-mm-dd, or mm/dd/yyyy; year < 9999, month 1–12',
  });

// 4. License number: optional; if provided, at least 2 characters (letters, digits, and some special characters)
const LICENSE_NUMBER_ALLOWED = /^[a-zA-Z0-9\s\-/.]+$/;
export const riderLicenseNumberSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || val === '' || (val.length >= 2 && LICENSE_NUMBER_ALLOWED.test(val)),
    { message: 'License number must be at least 2 characters (letters, digits, spaces, hyphen, slash, or period)' }
  );

// 5. ID number: no special characters, min 2 characters or digits
export const riderIdNumberSchema = z
  .string()
  .min(2, 'ID number must be at least 2 characters')
  .regex(/^[a-zA-Z0-9]+$/, 'ID number cannot contain special characters');

// 6. Address: no special characters (allow letters, numbers, spaces, comma, period, hyphen)
export const riderAddressSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || val === '' || /^[a-zA-Z0-9\s,.\-]+$/.test(val),
    { message: 'Address cannot contain special characters' }
  );
