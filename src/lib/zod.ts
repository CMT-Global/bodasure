import { z } from 'zod';

export { z };

// ——— Textarea (shared limit for UI and validation) ———

/** Textarea character limit: plain text, max 1000 characters. */
export const TEXTAREA_MAX_CHARS = 1000;

/** Returns true if the text exceeds the maximum character count. */
export function isOverCharLimit(value: string, maxChars: number = TEXTAREA_MAX_CHARS): boolean {
  return value.length > maxChars;
}

/** Schema for a string that must not exceed the textarea character limit. */
export const textareaStringSchema = z
  .string()
  .max(TEXTAREA_MAX_CHARS, `Please write less than ${TEXTAREA_MAX_CHARS} characters.`);

// ——— Rider validation (dashboard/riders and elsewhere) ———

/** Name: alphabet (letters) and spaces only, 2–40 chars */
export const riderNameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(40, 'Name must not exceed 40 characters')
  .refine((val) => /^[a-zA-Z\s]+$/.test(val), { message: 'Name must contain only letters and spaces' });

/** Phone: numbers only (digits); optional + at start; 5–15 digits */
export const riderPhoneSchema = z
  .string()
  .min(1, 'Phone is required')
  .refine((val) => /^\+?\d{5,15}$/.test(val), { message: 'Phone must contain only numbers between 5 and 15, optional + at start' });

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
  .refine((val) => /^[a-zA-Z0-9]+$/.test(val), { message: 'ID must be alphanumeric (letters and numbers only); no special characters' });

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

/** Sacco registration support form schema (sacco/registration-support). Same fields as rider form; sacco_id required when saccos exist; status limited to pending/approved. */
export const registrationSupportFormSchema = (hasSaccos: boolean) =>
  z.object({
    full_name: riderNameSchema,
    id_number: riderIdNumberSchema,
    phone: riderPhoneSchema,
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    date_of_birth: riderDateOfBirthSchema,
    address: riderAddressSchema,
    license_number: riderLicenseNumberSchema,
    license_expiry: riderLicenseExpirySchema,
    sacco_id: hasSaccos ? z.string().min(1, 'Sacco is required') : z.string().optional(),
    stage_id: z.string().optional(),
    status: z.enum(['pending', 'approved']),
  });

export type RegistrationSupportFormValues = z.infer<ReturnType<typeof registrationSupportFormSchema>>;

// ——— Motorbike validation (dashboard/motorbikes add/edit) ———

const currentYear = new Date().getFullYear();

/** Registration number: required, trimmed/uppercase, 5–20 chars, letters, numbers, hyphens, slashes, spaces */
export const motorbikeRegistrationNumberSchema = z
  .string()
  .min(1, 'Registration number is required')
  .transform((s) => s.trim().toUpperCase())
  .pipe(
    z
      .string()
      .min(5, 'Must be at least 5 characters')
      .max(20, 'Must be at most 20 characters')
      .refine((val) => /^[A-Z0-9\-/ ]+$/.test(val), { message: 'Only letters, numbers, hyphens, slashes and spaces allowed' })
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
          .refine((val) => /^[a-zA-Z0-9 ]+$/.test(val), { message: 'Only letters, numbers, and spaces allowed' }),
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
          .refine((val) => /^[a-zA-Z0-9 ]+$/.test(val), { message: 'Only letters, numbers, and spaces allowed' }),
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
          .refine((val) => /^[a-zA-Z ]+$/.test(val), { message: 'Letters and spaces only' }),
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
          .refine((val) => /^[a-zA-Z0-9]+$/.test(val), { message: 'Alphanumeric only' }),
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
          .refine((val) => /^[a-zA-Z0-9]+$/.test(val), { message: 'Alphanumeric only' }),
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

/** Sacco profile form (sacco/settings). Same field rules as sacco form; no status. */
export const saccoProfileFormSchema = z.object({
  name: riderNameSchema,
  registration_number: saccoRegistrationNumberSchema,
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_phone: saccoContactPhoneSchema,
  address: riderAddressSchema,
});

export type SaccoProfileFormValues = z.infer<typeof saccoProfileFormSchema>;

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

/** Stage capacity: when provided, must be at least 1 member (import for UI min/max). */
export const STAGE_CAPACITY_MIN = 1;
export const STAGE_CAPACITY_MAX = 99;

/** Stage name: letters, numbers, spaces, hyphen; 2–80 chars */
export const stageNameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(80, 'Name must not exceed 80 characters')
  .refine((val) => /^[a-zA-Z0-9\s\-]+$/.test(val), { message: 'Stage name must contain only letters (alphabet), numbers, spaces, and hyphen (-)' });

/** Optional capacity: when provided, integer STAGE_CAPACITY_MIN–STAGE_CAPACITY_MAX (at least 1 member). */
export const stageCapacitySchema = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(
    (val) => {
      if (!val || val.trim() === '') return true;
      const n = parseInt(val.trim(), 10);
      return !isNaN(n) && n >= STAGE_CAPACITY_MIN && n <= STAGE_CAPACITY_MAX;
    },
    { message: `Capacity must be at least ${STAGE_CAPACITY_MIN} and at most ${STAGE_CAPACITY_MAX}` }
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

// ——— Discipline incident validation (sacco/discipline) ———

/** Title for discipline/incident: required, 1–200 chars. */
export const disciplineIncidentTitleSchema = z
  .string()
  .min(1, 'Title is required')
  .max(100, 'Title must not exceed 100 characters');

/** Description for discipline/incident: required, max TEXTAREA limit. */
export const disciplineIncidentDescriptionSchema = z
  .string()
  .min(1, 'Description is required')
  .max(TEXTAREA_MAX_CHARS, `Please write less than ${TEXTAREA_MAX_CHARS} characters.`);

/** Optional long text (e.g. action taken): when provided, max TEXTAREA limit. */
export const disciplineIncidentNotesSchema = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(
    (val) => !val || val.length <= TEXTAREA_MAX_CHARS,
    { message: `Please write less than ${TEXTAREA_MAX_CHARS} characters.` }
  );

export const disciplineIncidentSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

/** Warning form (sacco discipline: Issue Warning). */
export const disciplineWarningFormSchema = z.object({
  member_id: z.string().min(1, 'Please select a member'),
  title: disciplineIncidentTitleSchema,
  description: disciplineIncidentDescriptionSchema,
  severity: disciplineIncidentSeveritySchema,
});

export type DisciplineWarningFormValues = z.infer<typeof disciplineWarningFormSchema>;

/** Disciplinary action form (sacco discipline: Record Disciplinary). */
export const disciplineDisciplinaryFormSchema = z.object({
  member_id: z.string().min(1, 'Please select a member'),
  title: disciplineIncidentTitleSchema,
  description: disciplineIncidentDescriptionSchema,
  action_taken: disciplineIncidentNotesSchema,
  severity: disciplineIncidentSeveritySchema,
});

export type DisciplineDisciplinaryFormValues = z.infer<typeof disciplineDisciplinaryFormSchema>;

/** Incident report form (sacco discipline: Submit Incident). */
export const disciplineIncidentFormSchema = z.object({
  member_id: z.string().min(1, 'Please select a member'),
  title: disciplineIncidentTitleSchema,
  description: disciplineIncidentDescriptionSchema,
  severity: disciplineIncidentSeveritySchema,
  submit_to_county: z.boolean(),
});

export type DisciplineIncidentFormValues = z.infer<typeof disciplineIncidentFormSchema>;

// ——— Sacco communication (sacco/communication) ———

/** Subject for sent message: required, 1–200 chars. */
export const communicationMessageSubjectSchema = z
  .string()
  .min(1, 'Subject is required')
  .max(100, 'Subject must not exceed 100 characters');

/** Message body: required, max TEXTAREA limit. */
export const communicationMessageBodySchema = z
  .string()
  .min(1, 'Message is required')
  .max(TEXTAREA_MAX_CHARS, `Please write less than ${TEXTAREA_MAX_CHARS} characters.`);

/** Send message form (sacco communication). Stage required when recipient_type is 'stage'. */
export const saccoSendMessageFormSchema = z
  .object({
    recipient_type: z.enum(['all', 'stage', 'non-compliant']),
    stage_id: z.string().optional(),
    subject: communicationMessageSubjectSchema,
    body: communicationMessageBodySchema,
  })
  .superRefine((data, ctx) => {
    if (data.recipient_type === 'stage' && (!data.stage_id || data.stage_id.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['stage_id'],
        message: 'Please select a stage',
      });
    }
  });

export type SaccoSendMessageFormValues = z.infer<typeof saccoSendMessageFormSchema>;

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

// ——— Verification search (dashboard/verification) ———

/** Search form for verification page: by name (letters/spaces, min 2) or by plate (alphanumeric, hyphen, slash; 5–20 chars). */
export const verificationSearchFormSchema = z
  .object({
    search_type: z.enum(['name', 'plate']),
    search_query: z.string(),
  })
  .superRefine((data, ctx) => {
    const s = (data.search_query ?? '').trim();
    if (s === '') return;
    if (data.search_type === 'name') {
      if (s.length < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['search_query'], message: 'Name must be at least 2 characters' });
        return;
      }
      if (!/^[a-zA-Z\s]+$/.test(s)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['search_query'], message: 'Name must contain only letters (alphabet) and spaces' });
        return;
      }
      return;
    }
    if (s.length < 5 || s.length > 20) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['search_query'], message: 'Plate must be 5–20 characters' });
      return;
    }
    if (!/^[A-Za-z0-9\-/]+$/.test(s)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['search_query'], message: 'Plate: only letters, numbers, hyphen, or slash' });
    }
  });

export type VerificationSearchFormValues = z.infer<typeof verificationSearchFormSchema>;

// ——— Reports date range (dashboard/reports) ———

const REPORTS_DATE_MIN = new Date(2020, 0, 1); // 1 Jan 2020

function parseDateOnly(val: string): Date | null {
  const s = (val ?? '').trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Start/end date for reports: min 1/1/2020, max today; start must be <= end. */
export const reportsDateRangeFormSchema = z
  .object({
    start_date: z
      .string()
      .min(1, 'Start date is required')
      .refine(
        (val) => {
          const d = parseDateOnly(val);
          if (!d) return false;
          d.setHours(0, 0, 0, 0);
          const min = new Date(REPORTS_DATE_MIN);
          min.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return d.getTime() >= min.getTime() && d.getTime() <= today.getTime();
        },
        { message: 'Start date must be between 1/1/2020 and today' }
      ),
    end_date: z
      .string()
      .min(1, 'End date is required')
      .refine(
        (val) => {
          const d = parseDateOnly(val);
          if (!d) return false;
          d.setHours(0, 0, 0, 0);
          const min = new Date(REPORTS_DATE_MIN);
          min.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return d.getTime() >= min.getTime() && d.getTime() <= today.getTime();
        },
        { message: 'End date must be between 1/1/2020 and today' }
      ),
  })
  .refine((data) => {
    const start = parseDateOnly(data.start_date);
    const end = parseDateOnly(data.end_date);
    if (!start || !end) return true;
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return start.getTime() <= end.getTime();
  }, { message: 'Start date cannot be after end date', path: ['start_date'] });

export type ReportsDateRangeFormValues = z.infer<typeof reportsDateRangeFormSchema>;

// ——— Sacco audit logs filter (sacco/audit-logs) ———

/** Optional date string: when provided, must be valid date between 1/1/2020 and today. */
const auditLogDateSchema = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(
    (val) => {
      const s = (val ?? '').trim();
      if (!s) return true;
      const d = parseDateOnly(s);
      if (!d) return false;
      d.setHours(0, 0, 0, 0);
      const min = new Date(REPORTS_DATE_MIN);
      min.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return d.getTime() >= min.getTime() && d.getTime() <= today.getTime();
    },
    { message: 'Date must be between 1/1/2020 and today' }
  );

/** Sacco audit logs filter form. All fields optional; action type max 80 chars; when both dates set, start must be <= end. */
export const saccoAuditLogsFilterFormSchema = z
  .object({
    actionType: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((val) => !val || val.trim().length <= 80, { message: 'Action type must not exceed 80 characters' }),
    entityType: z.string().optional().or(z.literal('')),
    startDate: auditLogDateSchema,
    endDate: auditLogDateSchema,
  })
  .refine(
    (data) => {
      const startStr = (data.startDate ?? '').trim();
      const endStr = (data.endDate ?? '').trim();
      if (!startStr || !endStr) return true;
      const start = parseDateOnly(startStr);
      const end = parseDateOnly(endStr);
      if (!start || !end) return true;
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return start.getTime() <= end.getTime();
    },
    { message: 'Start date cannot be after end date', path: ['startDate'] }
  );

export type SaccoAuditLogsFilterFormValues = z.infer<typeof saccoAuditLogsFilterFormSchema>;

// ——— County user management (dashboard/users) ———

/** Create county user form: name, email, optional phone, password, at least one role. */
export const countyUserCreateFormSchema = z.object({
  full_name: riderNameSchema,
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  phone: saccoContactPhoneSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
  roles: z.array(z.string()).min(1, 'Assign at least one role'),
});

export type CountyUserCreateFormValues = z.infer<typeof countyUserCreateFormSchema>;

/** Edit county user form: name and optional phone. */
export const countyUserEditFormSchema = z.object({
  full_name: riderNameSchema,
  phone: saccoContactPhoneSchema,
});

export type CountyUserEditFormValues = z.infer<typeof countyUserEditFormSchema>;

/** Manage roles form: array of role strings (can be empty to remove all). */
export const countyUserRolesFormSchema = z.object({
  roles: z.array(z.string()),
});

export type CountyUserRolesFormValues = z.infer<typeof countyUserRolesFormSchema>;

/** Reset password form: new password min 6 chars, must match confirm. */
export const countyUserResetPasswordFormSchema = z
  .object({
    new_password: z.string().min(6, 'Password must be at least 6 characters'),
    confirm_password: z.string().min(1, 'Please confirm password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export type CountyUserResetPasswordFormValues = z.infer<typeof countyUserResetPasswordFormSchema>;

// ——— County settings (dashboard/settings) ———

const SETTINGS_DESCRIPTION_MAX_CHARS = 1000;

/** Permit frequency & grace period form (Permit Settings card). */
export const settingsPermitFormSchema = z.object({
  defaultFrequency: z.enum(['weekly', 'monthly', 'annual']),
  gracePeriodDays: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : typeof v === 'string' ? parseInt(v, 10) : v))
    .pipe(z.number().int().min(0, 'Grace period must be 0 or more').optional()),
});

export type SettingsPermitFormValues = z.infer<typeof settingsPermitFormSchema>;

/** Permit type add/edit dialog (name, description, amount, duration_days). */
export const settingsPermitTypeFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120, 'Name must not exceed 120 characters'),
  description: z
    .string()
    .optional()
    .refine((v) => !v || v.length <= SETTINGS_DESCRIPTION_MAX_CHARS, {
      message: `Maximum ${SETTINGS_DESCRIPTION_MAX_CHARS} characters allowed.`,
    }),
  amount: z
    .union([z.string(), z.number()])
    .refine((v) => v !== '', 'Amount is required')
    .transform((v) => (typeof v === 'string' ? parseFloat(v) : v))
    .pipe(z.number().min(0, 'Amount must be 0 or more')),
  duration_days: z
    .union([z.string(), z.number()])
    .refine((v) => v !== '', 'Duration (days) is required')
    .transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v))
    .pipe(z.number().int().min(1, 'Duration must be at least 1 day')),
});

export type SettingsPermitTypeFormValues = z.infer<typeof settingsPermitTypeFormSchema>;

/** Penalty type add/edit dialog. */
export const settingsPenaltyTypeFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120, 'Name must not exceed 120 characters'),
  description: z
    .string()
    .optional()
    .refine((v) => !v || v.length <= SETTINGS_DESCRIPTION_MAX_CHARS, {
      message: `Maximum ${SETTINGS_DESCRIPTION_MAX_CHARS} characters allowed.`,
    }),
  amount: z
    .union([z.string(), z.number()])
    .refine((v) => v !== '', 'Amount is required')
    .transform((v) => (typeof v === 'string' ? parseFloat(v) : v))
    .pipe(z.number().min(0, 'Amount must be 0 or more')),
});

export type SettingsPenaltyTypeFormValues = z.infer<typeof settingsPenaltyTypeFormSchema>;

/** Escalation rule add/edit dialog. */
export const settingsEscalationFormSchema = z.object({
  offenseCount: z
    .union([z.string(), z.number()])
    .refine((v) => v !== '', 'Offense count is required')
    .transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v))
    .pipe(z.number().int().min(2, 'Offense count must be at least 2')),
  multiplier: z
    .union([z.string(), z.number()])
    .refine((v) => v !== '', 'Multiplier is required')
    .transform((v) => (typeof v === 'string' ? parseFloat(v) : v))
    .pipe(z.number().min(1, 'Multiplier must be at least 1')),
  description: z
    .string()
    .optional()
    .refine((v) => !v || v.length <= SETTINGS_DESCRIPTION_MAX_CHARS, {
      message: `Maximum ${SETTINGS_DESCRIPTION_MAX_CHARS} characters allowed.`,
    }),
});

export type SettingsEscalationFormValues = z.infer<typeof settingsEscalationFormSchema>;

/** Revenue share rule add/edit dialog. Conditional: percentage 0–100 when percentage; fixedAmount >= 0 when fixed_per_rider. */
export const settingsRevenueShareFormSchema = z
  .object({
    saccoId: z.string(),
    shareType: z.enum(['none', 'percentage', 'fixed_per_rider']),
    percentage: z.string().optional(),
    fixedAmount: z.string().optional(),
    period: z.enum(['weekly', 'monthly', 'annual']).optional(),
    activePermitsOnly: z.boolean(),
    complianceThreshold: z.string().optional(),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.shareType === 'none') return;
    if (!data.saccoId || data.saccoId.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['saccoId'], message: 'Please select a Sacco' });
      return;
    }
    if (data.shareType === 'percentage') {
      const p = data.percentage?.trim();
      if (!p) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['percentage'], message: 'Please enter percentage amount' });
        return;
      }
      const n = parseFloat(p);
      if (isNaN(n) || n < 0 || n > 100) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['percentage'], message: 'Percentage must be between 0 and 100' });
      }
      return;
    }
    if (data.shareType === 'fixed_per_rider') {
      const a = data.fixedAmount?.trim();
      if (!a) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixedAmount'], message: 'Please enter fixed amount per rider' });
        return;
      }
      const n = parseFloat(a);
      if (isNaN(n) || n < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixedAmount'], message: 'Amount must be 0 or more' });
      }
      return;
    }
    if (data.complianceThreshold && data.complianceThreshold.trim() !== '') {
      const n = parseFloat(data.complianceThreshold.trim());
      if (isNaN(n) || n < 0 || n > 100) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['complianceThreshold'], message: 'Compliance threshold must be between 0 and 100' });
      }
    }
  });

export type SettingsRevenueShareFormValues = z.infer<typeof settingsRevenueShareFormSchema>;
