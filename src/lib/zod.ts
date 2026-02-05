import { z } from 'zod';

export { z };

// ——— Rider validation (dashboard/riders and elsewhere) ———

/** Name: alphabet (letters) and spaces only, 2–40 chars */
export const riderNameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(40, 'Name must not exceed 40 characters')
  .regex(/^[a-zA-Z\s]+$/, 'Name must contain only letters and spaces');

/** Phone: numbers only (digits); optional + at start; 5–15 digits */
export const riderPhoneSchema = z
  .string()
  .min(1, 'Phone is required')
  .regex(/^\+?\d{5,15}$/, 'Phone must contain only numbers between 5 and 15, optional + at start');

/** Optional date of birth: dd/mm/yyyy, yyyy-mm-dd, or mm/dd/yyyy; max = today (current date); year min 1900 */
export const riderDateOfBirthSchema = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(
    (val) => {
      const s = (val ?? '').trim();
      if (!s) return true;
      const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{1,4})$/.exec(s);
      const ymd = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/.exec(s);
      const mdy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{1,4})$/.exec(s);
      let day: number | undefined;
      let month: number | undefined;
      let year: number | undefined;
      if (dmy) {
        day = parseInt(dmy[1], 10);
        month = parseInt(dmy[2], 10);
        year = parseInt(dmy[3], 10);
      } else if (ymd) {
        year = parseInt(ymd[1], 10);
        month = parseInt(ymd[2], 10);
        day = parseInt(ymd[3], 10);
      } else if (mdy) {
        month = parseInt(mdy[1], 10);
        day = parseInt(mdy[2], 10);
        year = parseInt(mdy[3], 10);
      } else return false;
      const now = new Date();
      const maxYear = now.getFullYear();
      const maxMonth = now.getMonth() + 1; // 1–12
      const maxDay = now.getDate();
      if (year == null || year < 1900 || year > maxYear) return false;
      if (month == null || month < 1 || month > 12) return false;
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day == null || day < 1 || day > daysInMonth) return false;
      if (year === maxYear && month > maxMonth) return false;
      if (year === maxYear && month === maxMonth && day > maxDay) return false;
      return true;
    },
    { message: 'Date of birth cannot be in the future; use format dd/mm/yyyy,(year 1900–today)' }
  );

export const riderLicenseExpirySchema = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(
    (val) => {
      const s = (val ?? '').trim();
      if (!s) return true;
      const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{1,4})$/.exec(s);
      const ymd = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/.exec(s);
      const mdy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{1,4})$/.exec(s);
      let month: number | undefined;
      let year: number | undefined;
      if (dmy) {
        month = parseInt(dmy[2], 10);
        year = parseInt(dmy[3], 10);
      } else if (ymd) {
        year = parseInt(ymd[1], 10);
        month = parseInt(ymd[2], 10);
      } else if (mdy) {
        month = parseInt(mdy[1], 10);
        year = parseInt(mdy[3], 10);
      } else return false;
      if (year != null && (year < 1 || year >= 9999)) return false;
      if (month != null && (month < 1 || month > 12)) return false;
      return true;
    },
    { message: 'Use dd/mm/yyyy, yyyy-mm-dd, or mm/dd/yyyy; year < 9999, month 1–12' }
  );

/** License number: optional; if set, min 2 chars (letters, digits, spaces, hyphen, slash, period) */
export const riderLicenseNumberSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || val === '' || (val.length >= 2 && /^[a-zA-Z0-9\s\-/.]+$/.test(val)),
    { message: 'License number must be at least 2 characters (letters, digits, spaces, hyphen, slash, or period)' }
  );

/** ID number: alphanumeric (letters and numbers only), min 2 chars */
export const riderIdNumberSchema = z
  .string()
  .min(2, 'ID number must be at least 2 characters')
  .regex(/^[a-zA-Z0-9]+$/, 'ID must be alphanumeric (letters and numbers only); no special characters');

/** Address: optional; alphanumeric, spaces, comma (,), plus (+), slash (/), hyphen (-) */
export const riderAddressSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || val === '' || /^[a-zA-Z0-9\s,+\/\-]+$/.test(val),
    { message: 'Address must be alphanumeric and can only include spaces, comma (,), plus (+), slash (/), and hyphen (-)' }
  );

/** Rider add/edit form schema. Pass true when county selection is required (e.g. super admin). */
export const riderFormSchema = (needsCountySelection: boolean) =>
  z.object({
    full_name: riderNameSchema,
    id_number: riderIdNumberSchema,
    phone: riderPhoneSchema,
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    date_of_birth: riderDateOfBirthSchema,
    address: riderAddressSchema,
    license_number: riderLicenseNumberSchema,
    license_expiry: riderLicenseExpirySchema,
    sacco_id: z.string().optional(),
    stage_id: z.string().optional(),
    owner_id: z.string().optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'suspended']),
    county_id: needsCountySelection
      ? z.string().min(1, 'County is required')
      : z.string().optional(),
  });

export type RiderFormValues = z.infer<ReturnType<typeof riderFormSchema>>;

// ——— Motorbike validation (dashboard/motorbikes add/edit) ———

const currentYear = new Date().getFullYear();

/** Registration number: required, trimmed/uppercase, 5–20 chars, letters, numbers, hyphens, slashes */
export const motorbikeRegistrationNumberSchema = z
  .string()
  .min(1, 'Registration number is required')
  .transform((s) => s.trim().toUpperCase())
  .pipe(
    z
      .string()
      .min(5, 'Must be at least 5 characters')
      .max(20, 'Must be at most 20 characters')
      .regex(/^[A-Z0-9\-/]+$/, 'Only letters, numbers, hyphens and slashes allowed')
  );

/** Make: optional; if set, 2–50 chars, letters, numbers, spaces */
export const motorbikeMakeSchema = z
  .string()
  .optional()
  .transform((s) => s?.trim() ?? '')
  .pipe(
    z
      .union([
        z.literal(''),
        z
          .string()
          .min(2, 'Must be at least 2 characters')
          .max(50, 'Must be at most 50 characters')
          .regex(/^[a-zA-Z0-9 ]+$/, 'Only letters, numbers, and spaces allowed'),
      ])
  )
  .transform((s) => (s === '' ? undefined : s));

/** Model: optional; if set, 1–50 chars, letters, numbers, spaces */
export const motorbikeModelSchema = z
  .string()
  .optional()
  .transform((s) => s?.trim() ?? '')
  .pipe(
    z
      .union([
        z.literal(''),
        z
          .string()
          .min(1, 'Must be at least 1 character')
          .max(50, 'Must be at most 50 characters')
          .regex(/^[a-zA-Z0-9 ]+$/, 'Only letters, numbers, and spaces allowed'),
      ])
  )
  .transform((s) => (s === '' ? undefined : s));

/** Year: optional; if set, 1980–current year */
export const motorbikeYearSchema = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val?.trim()) return true;
      const n = parseInt(val, 10);
      return !isNaN(n) && n >= 1980 && n <= currentYear;
    },
    `Year must be between 1980 and ${currentYear}`
  );

/** Color: optional; if set, 3–30 chars, letters and spaces */
export const motorbikeColorSchema = z
  .string()
  .optional()
  .transform((s) => s?.trim() ?? '')
  .pipe(
    z
      .union([
        z.literal(''),
        z
          .string()
          .min(3, 'Must be at least 3 characters')
          .max(30, 'Must be at most 30 characters')
          .regex(/^[a-zA-Z ]+$/, 'Letters and spaces only'),
      ])
  )
  .transform((s) => (s === '' ? undefined : s));

/** Chassis number: optional; if set, 5–30 alphanumeric */
export const motorbikeChassisNumberSchema = z
  .string()
  .optional()
  .transform((s) => s?.trim() ?? '')
  .pipe(
    z
      .union([
        z.literal(''),
        z
          .string()
          .min(5, 'Must be at least 5 characters')
          .max(30, 'Must be at most 30 characters')
          .regex(/^[a-zA-Z0-9]+$/, 'Alphanumeric only'),
      ])
  )
  .transform((s) => (s === '' ? undefined : s));

/** Engine number: optional; if set, 5–30 alphanumeric */
export const motorbikeEngineNumberSchema = z
  .string()
  .optional()
  .transform((s) => s?.trim() ?? '')
  .pipe(
    z
      .union([
        z.literal(''),
        z
          .string()
          .min(5, 'Must be at least 5 characters')
          .max(30, 'Must be at most 30 characters')
          .regex(/^[a-zA-Z0-9]+$/, 'Alphanumeric only'),
      ])
  )
  .transform((s) => (s === '' ? undefined : s));

/**
 * Base motorbike add/edit form schema (sync validation only).
 * Use this and add .superRefine() in the dialog for async checks (uniqueness, rider assignment).
 */
export const motorbikeFormSchemaBase = (needsCountySelection: boolean) =>
  z
    .object({
      registration_number: motorbikeRegistrationNumberSchema,
      owner_id: z.string().min(1, 'Owner is required'),
      rider_id: z.string().optional(),
      make: motorbikeMakeSchema,
      model: motorbikeModelSchema,
      year: motorbikeYearSchema,
      color: motorbikeColorSchema,
      chassis_number: motorbikeChassisNumberSchema,
      engine_number: motorbikeEngineNumberSchema,
      photo_url: z.string().optional(),
      status: z.enum(['pending', 'approved', 'rejected', 'suspended']),
      county_id: needsCountySelection
        ? z.string().min(1, 'County is required')
        : z.string().optional(),
    })
    .superRefine((data, refineCtx) => {
      const chassis = data.chassis_number?.trim();
      const engine = data.engine_number?.trim();
      if (!chassis && !engine) {
        refineCtx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Either chassis number or engine number is required',
          path: ['chassis_number'],
        });
        refineCtx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Either chassis number or engine number is required',
          path: ['engine_number'],
        });
      }
    });

export type MotorbikeFormValues = z.output<ReturnType<typeof motorbikeFormSchemaBase>>;

// ——— Owner validation (dashboard/owners add/edit) ———

/** Owner add/edit form schema. Reuses rider name, id, phone, address rules. */
export const ownerFormSchema = z.object({
  full_name: riderNameSchema,
  id_number: riderIdNumberSchema,
  phone: riderPhoneSchema,
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: riderAddressSchema,
  status: z.enum(['pending', 'approved', 'rejected']),
});

export type OwnerFormValues = z.infer<typeof ownerFormSchema>;

// ——— Sacco validation (dashboard/saccos add/edit) ———

/** Optional phone: when provided, numbers only (digits); 5–15 digits; optional + at start */
export const saccoContactPhoneSchema = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(
    (val) => !val || val.trim() === '' || /^\+?\d{5,15}$/.test(val.trim()),
    { message: 'Phone must contain only numbers (digits); 5–15 digits; optional + at start' }
  );

/** Optional registration number: when provided, alphanumeric and hyphen/slash; 2–20 chars */
export const saccoRegistrationNumberSchema = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(
    (val) => !val || val.trim() === '' || (val.trim().length >= 2 && val.trim().length <= 20 && /^[a-zA-Z0-9\-/]+$/.test(val.trim())),
    { message: 'Registration number must be alphanumeric (letters and numbers) and can include hyphen or slash; 2–20 characters' }
  );

/** Sacco add/edit form schema. Name required; contact and address optional with format rules. */
export const saccoFormSchema = z.object({
  name: riderNameSchema,
  registration_number: saccoRegistrationNumberSchema,
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_phone: saccoContactPhoneSchema,
  address: riderAddressSchema,
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']),
});

export type SaccoFormValues = z.infer<typeof saccoFormSchema>;

// ——— Welfare group validation (dashboard/welfare-groups add/edit) ———

/** Welfare group add/edit form schema. Same rules as sacco: name required; contact and address optional. */
export const welfareGroupFormSchema = z.object({
  name: riderNameSchema,
  registration_number: saccoRegistrationNumberSchema,
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_phone: saccoContactPhoneSchema,
  address: riderAddressSchema,
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']),
});

export type WelfareGroupFormValues = z.infer<typeof welfareGroupFormSchema>;

// ——— Stage validation (dashboard/stages add/edit) ———

/** Stage name: letters, numbers, spaces, hyphen; 2–80 chars */
export const stageNameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(80, 'Name must not exceed 80 characters')
  .regex(/^[a-zA-Z0-9\s\-]+$/, 'Stage name must contain only letters (alphabet), numbers, spaces, and hyphen (-)');

/** Optional capacity: when provided, non-negative integer 0–999999 */
export const stageCapacitySchema = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(
    (val) => {
      if (!val || val.trim() === '') return true;
      const n = parseInt(val.trim(), 10);
      return !isNaN(n) && n >= 0 && n <= 99;
    },
    { message: 'Capacity must be a number from 0 to 99' }
  );

/** Stage add/edit form schema. */
export const stageFormSchema = z.object({
  name: stageNameSchema,
  location: riderAddressSchema,
  sacco_id: z.string(),
  capacity: stageCapacitySchema,
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']),
});

export type StageFormValues = z.infer<typeof stageFormSchema>;

// ——— Permit payment / new payment (dashboard/permits + dashboard/payments) ———
// Used by PaymentDialog: "Issue Permit" on dashboard/permits and "New Payment" on dashboard/payments.

const MPESA_PHONE_MESSAGE = 'Use 5 digits (local) or 6–15 digits (with country code, no +).';

/** M-Pesa phone: when provided, digits only; 5 (local) or 6–15 (with country code). */
function isValidMpesaPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return false;
  return digits.length === 5 || (digits.length >= 6 && digits.length <= 15);
}

/** Payment form schema (permits + payments). M-Pesa phone required and validated when payment_method is mobile_money. */
export const permitPaymentFormSchema = (needsCountySelection: boolean) =>
  z
    .object({
      rider_id: z.string().min(1, 'Please select a rider'),
      motorbike_id: z.string().min(1, 'Please select a motorbike'),
      permit_type_id: z.string().min(1, 'Please select a permit type'),
      email: z.string().email('Invalid email'),
      phone: z.string().optional(),
      payment_method: z.enum(['card', 'mobile_money']),
      county_id: needsCountySelection
        ? z.string().min(1, 'County is required')
        : z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.payment_method === 'mobile_money') {
        const phone = (data.phone ?? '').trim();
        if (!phone) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['phone'],
            message: 'M-Pesa phone number is required when paying with M-Pesa',
          });
          return;
        }
        if (!isValidMpesaPhone(phone)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['phone'],
            message: MPESA_PHONE_MESSAGE,
          });
        }
      }
    });

export type PermitPaymentFormValues = z.infer<ReturnType<typeof permitPaymentFormSchema>>;

// ——— Penalty issuance (dashboard/penalties) ———

const PENALTY_DESCRIPTION_MAX_CHARS = 1000;

/** Penalty issuance form schema. Used by PenaltyIssuanceDialog on dashboard/penalties. */
export const penaltyIssuanceFormSchema = z.object({
  rider_id: z.string().min(1, 'Rider is required'),
  penalty_type: z.string().min(1, 'Penalty type is required'),
  description: z
    .string()
    .optional()
    .refine((v) => !v || v.length <= PENALTY_DESCRIPTION_MAX_CHARS, {
      message: `Maximum ${PENALTY_DESCRIPTION_MAX_CHARS} characters allowed.`,
    }),
  amount: z.number().min(0, 'Amount must be positive'),
  due_date: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        const date = new Date(val.trim());
        if (isNaN(date.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
        return date.getTime() >= today.getTime();
      },
      { message: 'Due date cannot be a previous date; use today or a future date' }
    ),
});

export type PenaltyIssuanceFormValues = z.infer<typeof penaltyIssuanceFormSchema>;
