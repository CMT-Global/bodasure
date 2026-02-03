# Security & Audit Requirements

## Audit logging

Every action is logged with:

- **User** – `user_id` (who performed the action)
- **Role** – `actor_role` (role at time of action, set by DB trigger from `user_roles`)
- **County** – `county_id` (scope of the action)
- **Timestamp** – `created_at`

The `audit_logs` table stores these fields. `actor_role` is set automatically on INSERT via trigger from `user_roles`. All mutations that write to `audit_logs` should include `county_id`, `user_id`, and the rest; role is filled server-side.

## County User Access & Roles (RBAC – Mandatory)

- **Roles:** County Super Admin, Finance Officer, Enforcement Officer, Registration Agent, County Analyst (read-only).
- **Server-side enforcement:** RLS enforces role-based access on every table. Helpers: `user_can_view_county_data()`, `user_can_manage_riders()`, `user_can_manage_penalties()`, `user_can_manage_payments()`, `user_can_manage_permits()`. Each role only sees permitted actions (e.g. Analyst = SELECT only; Enforcement = penalties; Registration = riders/owners/motorbikes/permits).
- **No cross-county access:** `get_user_county_id(auth.uid())` returns the user’s single county (from profile or county roles). All county-scoped policies require `county_id = get_user_county_id(auth.uid())`. Under no circumstance can a county user access another county’s data.
- **UI role checks:** Frontend `hasRole()`, `ProtectedRoute`, and role-based nav/buttons are for UX only; access is granted only by RLS.

## Permission checks (server-side only)

- **Enforcement:** All permission checks are enforced **server-side** via Supabase Row Level Security (RLS). RLS policies use `is_county_admin()`, `is_platform_admin()`, `is_user_active()`, and role-specific helpers (see County RBAC above) so that only allowed roles and active users can read/write data.
- **UI role checks:** Frontend use of `hasRole()`, `ProtectedRoute`, and role-based UI (buttons, nav) are **for UX only** (hiding options the user is not allowed to use). They do **not** grant access. Access is granted only by RLS.

## Immediate access revocation on suspension

- **RLS:** Suspended users (`profiles.is_active = false`) are blocked by RLS on all tables except reading their own profile and own roles, so the app can load and then sign them out.
- **Auth:** When the app loads profile and `is_active === false`, it immediately signs the user out and redirects to `/login?suspended=1`.

## Secure login & session handling

- **Auth:** Supabase Auth (email/password); JWT in localStorage with `persistSession: true`, `autoRefreshToken: true`.
- **Session timeout:** 8-hour inactivity timeout in `useAuth`; on expiry user is signed out and redirected to `/login?session=expired`.
- **Suspended users:** On load, if `profile.is_active === false`, user is signed out and redirected to `/login?suspended=1` (immediate access revocation).
- **Roles loaded before access:** `ProtectedRoute` waits for `rolesLoaded` so routes and UI see correct permissions; RLS still enforces server-side.

## Summary

| Requirement                         | Implementation                                                                 |
|------------------------------------|---------------------------------------------------------------------------------|
| Every action: User, Role, County, Ts| `audit_logs` + `actor_role` column + trigger; INSERT policy for audit_logs     |
| Permission checks server-side      | RLS on all tables; role-specific helpers; no UI-only permission checks         |
| County RBAC, no cross-county       | `get_user_county_id()`; all county policies use `county_id = get_user_county_id(auth.uid())` |
| Secure login & session             | Supabase Auth; 8h timeout; suspend = immediate sign-out and redirect            |
| Immediate revocation on suspension | RLS `is_user_active()`; useAuth sign-out and redirect when `!profile.is_active` |
