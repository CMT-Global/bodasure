/**
 * Portal roles and access — single source of truth for BodaSure.
 * Use for route protection, UI visibility, and documentation.
 */

// ——— SUPER ADMIN PORTAL (BODASURE INTERNAL) ———

export const SUPER_ADMIN_PORTAL = {
  portalId: 'super_admin',
  name: 'Super Admin Portal',
  description: 'BodaSure internal platform governance',

  role: 'Platform Super Admin',
  /** Role identifiers used in auth (user_roles.role). */
  roleKeys: ['platform_super_admin', 'platform_admin'] as const,

  accessScope: {
    summary: 'Full access across all counties',
    governanceOnly: true,
    note: 'Governance only — not daily operations.',
  },

  permissions: [
    'Create, activate, suspend counties',
    'Configure county-specific rules: fees, penalties, revenue shares',
    'Manage platform-wide roles & permissions',
    'View all users across counties',
    'Suspend any user or organization',
    'View platform-wide dashboards',
    'Manage system settings & feature flags',
    'View all audit logs',
    'Override county decisions (where allowed)',
  ],

  restrictions: [
    'Cannot register riders directly',
    'Cannot operate as county enforcement',
  ],
} as const;

export type SuperAdminRoleKey = (typeof SUPER_ADMIN_PORTAL.roleKeys)[number];

/** Check if a role string is a Super Admin portal role. */
export function isSuperAdminRole(role: string): role is SuperAdminRoleKey {
  return SUPER_ADMIN_PORTAL.roleKeys.includes(role as SuperAdminRoleKey);
}

// ——— COUNTY PORTAL ———

/** All county portal role keys (auth: user_roles.role). */
export const COUNTY_PORTAL_ROLE_KEYS = [
  'county_super_admin',
  'county_finance_officer',
  'county_enforcement_officer',
  'county_registration_agent',
  'county_analyst',
] as const;

export type CountyPortalRoleKey = (typeof COUNTY_PORTAL_ROLE_KEYS)[number];

/** Check if a role string is a County Portal role. */
export function isCountyPortalRole(role: string): role is CountyPortalRoleKey {
  return COUNTY_PORTAL_ROLE_KEYS.includes(role as CountyPortalRoleKey);
}

/** County Portal role definitions: permissions and restrictions. */
export const COUNTY_PORTAL_ROLES = {
  county_super_admin: {
    name: 'County Super Admin',
    permissions: [
      'Full control within their county',
      'Create & manage county users',
      'Configure county settings: permit fees, penalties, revenue sharing with Saccos/Welfare',
      'Approve/suspend Saccos & welfare groups',
      'View all riders, payments, penalties',
      'Waive penalties',
      'View all reports & exports',
      'Access audit logs',
    ],
    restrictions: [] as string[],
  },
  county_finance_officer: {
    name: 'County Finance Officer',
    permissions: [
      'View all payments & revenue',
      'View revenue breakdowns',
      'Export financial reports',
      'View penalty collections',
      'View Sacco revenue shares (read-only)',
    ],
    restrictions: [
      'Cannot change system rules',
      'Cannot issue penalties',
      'Cannot register riders',
    ],
  },
  county_enforcement_officer: {
    name: 'County Enforcement Officer',
    permissions: [
      'Verify riders (QR / search)',
      'View full rider compliance',
      'Issue penalties',
      'Flag riders or stages',
      'View enforcement reports',
    ],
    restrictions: [
      'Cannot change fees',
      'Cannot manage users',
      'Cannot edit payments',
    ],
  },
  county_registration_agent: {
    name: 'County Registration Agent',
    permissions: [
      'Register riders, owners, bikes',
      'Assign Sacco / welfare / stage',
      'Upload registration details',
      'Generate QR IDs',
      'View assigned registrations',
    ],
    restrictions: [
      'Cannot view financial reports',
      'Cannot issue penalties',
      'Cannot change county settings',
    ],
  },
  county_analyst: {
    name: 'County Analyst (Read-Only)',
    permissions: [
      'View dashboards',
      'View reports',
      'Export data (if allowed)',
    ],
    restrictions: [
      'Cannot edit anything',
      'Cannot take enforcement actions',
    ],
  },
} as const satisfies Record<CountyPortalRoleKey, { name: string; permissions: string[]; restrictions: string[] }>;

/** Roles that can access the County Portal (any of these). */
export const COUNTY_PORTAL_ACCESS_ROLES: readonly string[] = [
  'platform_super_admin',
  ...COUNTY_PORTAL_ROLE_KEYS,
];

// ——— RIDER & OWNER PORTAL ———

/** All Rider & Owner portal role keys (auth: user_roles.role). */
export const RIDER_OWNER_PORTAL_ROLE_KEYS = ['rider', 'owner'] as const;

export type RiderOwnerPortalRoleKey = (typeof RIDER_OWNER_PORTAL_ROLE_KEYS)[number];

/** Check if a role string is a Rider or Owner Portal role. */
export function isRiderOwnerPortalRole(role: string): role is RiderOwnerPortalRoleKey {
  return RIDER_OWNER_PORTAL_ROLE_KEYS.includes(role as RiderOwnerPortalRoleKey);
}

/** Rider & Owner Portal role definitions: permissions and restrictions. */
export const RIDER_OWNER_PORTAL_ROLES = {
  rider: {
    name: 'Rider',
    permissions: [
      'View own profile',
      'View permit & compliance status',
      'Pay permits',
      'Pay penalties',
      'View QR ID',
      'Receive notifications',
      'Request updates or transfers',
      'Contact support',
    ],
    restrictions: [
      'Cannot view other riders',
      'Cannot view revenue data',
      'Cannot change official records directly',
    ],
  },
  owner: {
    name: 'Owner',
    permissions: [
      'View owned bikes',
      'View assigned riders',
      'Pay permits & penalties for owned bikes',
      'Receive compliance alerts',
    ],
    restrictions: [] as string[],
  },
} as const satisfies Record<
  RiderOwnerPortalRoleKey,
  { name: string; permissions: string[]; restrictions: string[] }
>;

/** Roles that can access the Rider & Owner Portal (any of these). */
export const RIDER_OWNER_PORTAL_ACCESS_ROLES: readonly string[] = [
  ...RIDER_OWNER_PORTAL_ROLE_KEYS,
];

// ——— SACCO & WELFARE PORTAL ———
// Saccos and Welfare Groups are treated as equal first-class entities.
// Official roles: Chairman, Vice Chairman, Secretary, Vice Secretary, Treasurer, Vice Treasurer, General Official.
// Legacy: sacco_admin / welfare_admin (full access); sacco_officer / welfare_officer.

/** All Sacco/Welfare org-level role keys (auth: user_roles.role). Includes official + legacy. */
export const SACCO_PORTAL_ROLE_KEYS = [
  'sacco_admin',
  'sacco_officer',
  'chairman',
  'vice_chairman',
  'secretary',
  'vice_secretary',
  'treasurer',
  'vice_treasurer',
  'general_official',
] as const;

export type SaccoPortalRoleKey = (typeof SACCO_PORTAL_ROLE_KEYS)[number];

/** Check if a role string is a Sacco/Welfare Portal role (org-level only). */
export function isSaccoPortalRole(role: string): role is SaccoPortalRoleKey {
  return SACCO_PORTAL_ROLE_KEYS.includes(role as SaccoPortalRoleKey);
}

/** Sacco/Welfare Portal role definitions: permissions and restrictions. Each role has distinct permissions enforced server-side. */
export const SACCO_PORTAL_ROLES = {
  sacco_admin: {
    name: 'Sacco / Welfare Admin',
    permissions: [
      'Full access: manage profile, officials, members, finances',
      'Add/remove officials',
      'Approve/reject members',
      'View revenue share (if enabled)',
      'Generate reports',
      'Submit incident reports to county',
    ],
    restrictions: [] as string[],
  },
  sacco_officer: {
    name: 'Sacco / Welfare Officer',
    permissions: [
      'View members',
      'View compliance & penalties',
      'Assist with registration',
      'Issue internal warnings',
      'Submit incident reports',
    ],
    restrictions: [
      'Cannot approve/remove members',
      'Cannot change revenue settings',
      'Cannot edit Sacco profile',
    ],
  },
  chairman: {
    name: 'Chairman',
    permissions: [
      'Manage Sacco/Welfare profile',
      'Add/remove officials',
      'Manage members (approve, suspend)',
      'View and manage finances',
      'Generate reports',
      'Submit incident reports to county',
    ],
    restrictions: [] as string[],
  },
  vice_chairman: {
    name: 'Vice Chairman',
    permissions: [
      'Manage Sacco/Welfare profile',
      'Add/remove officials',
      'Manage members (approve, suspend)',
      'View and manage finances',
      'Generate reports',
      'Submit incident reports to county',
    ],
    restrictions: [] as string[],
  },
  secretary: {
    name: 'Secretary',
    permissions: [
      'Manage Sacco/Welfare profile (contact, records)',
      'Manage members (approve, suspend)',
      'View finances (read-only)',
      'Generate reports',
      'Submit incident reports',
    ],
    restrictions: [
      'Cannot add/remove officials',
      'Cannot manage financial records',
    ],
  },
  vice_secretary: {
    name: 'Vice Secretary',
    permissions: [
      'Manage Sacco/Welfare profile (contact, records)',
      'Manage members (approve, suspend)',
      'View finances (read-only)',
      'Generate reports',
      'Submit incident reports',
    ],
    restrictions: [
      'Cannot add/remove officials',
      'Cannot manage financial records',
    ],
  },
  treasurer: {
    name: 'Treasurer',
    permissions: [
      'View and manage finances',
      'View members (read-only)',
      'View compliance & revenue share',
      'Generate financial reports',
    ],
    restrictions: [
      'Cannot edit Sacco/Welfare profile',
      'Cannot add/remove officials',
      'Cannot approve/suspend members',
    ],
  },
  vice_treasurer: {
    name: 'Vice Treasurer',
    permissions: [
      'View finances (read-only)',
      'View members (read-only)',
      'View compliance & revenue share',
      'Generate financial reports',
    ],
    restrictions: [
      'Cannot edit financial records',
      'Cannot edit Sacco/Welfare profile',
      'Cannot add/remove officials',
      'Cannot approve/suspend members',
    ],
  },
  general_official: {
    name: 'General Official',
    permissions: [
      'View members',
      'View compliance & penalties',
      'Assist with registration',
      'Submit incident reports',
    ],
    restrictions: [
      'Cannot edit profile',
      'Cannot add/remove officials',
      'Cannot manage members',
      'Cannot view/manage finances',
    ],
  },
} as const satisfies Record<
  SaccoPortalRoleKey,
  { name: string; permissions: string[]; restrictions: string[] }
>;

// ——— STAGE-LEVEL ROLES ———
// Stages exist under Saccos/Welfare Groups.

/** All stage-level role keys (auth: user_roles.role). */
export const STAGE_ROLE_KEYS = [
  'stage_chairman',
  'stage_secretary',
  'stage_treasurer',
  'stage_assistant',
] as const;

export type StageRoleKey = (typeof STAGE_ROLE_KEYS)[number];

/** Check if a role string is a Stage-level role. */
export function isStageRole(role: string): role is StageRoleKey {
  return STAGE_ROLE_KEYS.includes(role as StageRoleKey);
}

/** Stage-level role definitions: permissions and restrictions. */
export const STAGE_ROLES = {
  stage_chairman: {
    name: 'Stage Chairman',
    permissions: [
      'View all stage members',
      'Monitor compliance',
      'Assist enforcement',
      'Recommend disciplinary action',
      'Communicate with members',
      'Assist registration',
    ],
    restrictions: [] as string[],
  },
  stage_secretary: {
    name: 'Stage Secretary',
    permissions: [
      'Manage stage member lists',
      'Assist registration',
      'Submit reports',
      'Update stage records',
    ],
    restrictions: [] as string[],
  },
  stage_treasurer: {
    name: 'Stage Treasurer',
    permissions: [
      'View (read-only) compliance summaries',
      'View welfare contribution summaries (if enabled)',
    ],
    restrictions: [
      'Cannot enforce penalties',
      'Cannot edit member status',
    ],
  },
  stage_assistant: {
    name: 'Stage Assistant',
    permissions: [
      'Assist registration',
      'View stage member list (read-only)',
      'Submit reports',
    ],
    restrictions: [
      'Cannot edit stage records',
      'Cannot enforce or recommend discipline',
    ],
  },
} as const satisfies Record<
  StageRoleKey,
  { name: string; permissions: string[]; restrictions: string[] }
>;

/** Roles that can access the Sacco & Welfare Portal (org + stage roles). Welfare uses same official role keys with welfare_group_id. */
export const SACCO_PORTAL_ACCESS_ROLES: readonly string[] = [
  ...SACCO_PORTAL_ROLE_KEYS,
  'welfare_admin',
  'welfare_officer',
  ...STAGE_ROLE_KEYS,
];

// ——— PUBLIC / GUEST ACCESS (NO LOGIN) ———
// Public users do not have a role in the database; they access unauthenticated routes only.

export const PUBLIC_USER = {
  name: 'Public User',
  description: 'Unauthenticated guest — verify riders only',

  permissions: [
    'Verify rider via QR code',
    'Verify rider via plate number',
    'View rider name',
    'View rider photo',
    'View permit status',
  ],

  restrictions: [
    'Cannot view personal data (e.g. ID number, phone, address)',
    'Cannot view penalties',
    'Cannot take any action (pay, edit, report, etc.)',
  ],
} as const;
