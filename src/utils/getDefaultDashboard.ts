import {
  SUPER_ADMIN_PORTAL,
  COUNTY_PORTAL_ACCESS_ROLES,
  SACCO_PORTAL_ACCESS_ROLES,
  RIDER_OWNER_PORTAL_ACCESS_ROLES,
} from "@/config/portalRoles";

/** Role entry from auth (user_roles). */
export interface UserRoleEntry {
  role: string;
}

/**
 * Returns the default dashboard path for the user based on their roles.
 * Priority: Super Admin → County → Sacco → Rider/Owner → /dashboard fallback.
 */
export function getDefaultDashboardForRoles(roles: UserRoleEntry[]): string {
  const roleSet = new Set(roles.map((r) => r.role));

  if (SUPER_ADMIN_PORTAL.roleKeys.some((key) => roleSet.has(key))) {
    return "/super-admin";
  }
  if (COUNTY_PORTAL_ACCESS_ROLES.some((role) => roleSet.has(role))) {
    return "/dashboard";
  }
  if (SACCO_PORTAL_ACCESS_ROLES.some((role) => roleSet.has(role))) {
    return "/sacco";
  }
  if (RIDER_OWNER_PORTAL_ACCESS_ROLES.some((role) => roleSet.has(role))) {
    return "/rider-owner";
  }

  return "/dashboard";
}
