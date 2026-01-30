# Security & Audit Requirements

## Audit logging

Every action is logged with:

- **User** – `user_id` (who performed the action)
- **Role** – `actor_role` (role at time of action, set by DB trigger from `user_roles`)
- **County** – `county_id` (scope of the action)
- **Timestamp** – `created_at`

The `audit_logs` table stores these fields. `actor_role` is set automatically on INSERT via trigger from `user_roles`. All mutations that write to `audit_logs` should include `county_id`, `user_id`, and the rest; role is filled server-side.

## Permission checks (server-side only)

- **Enforcement:** All permission checks are enforced **server-side** via Supabase Row Level Security (RLS). RLS policies use `is_county_admin()`, `is_platform_admin()`, and `is_user_active()` so that only allowed roles and active users can read/write data.
- **UI role checks:** Frontend use of `hasRole()`, `ProtectedRoute`, and role-based UI (buttons, nav) are **for UX only** (hiding options the user is not allowed to use). They do **not** grant access. Access is granted only by RLS.

## Immediate access revocation on suspension

- **RLS:** Suspended users (`profiles.is_active = false`) are blocked by RLS on all tables except reading their own profile and own roles, so the app can load and then sign them out.
- **Auth:** When the app loads profile and `is_active === false`, it immediately signs the user out and redirects to `/login?suspended=1`.

## Summary

| Requirement                         | Implementation                                                                 |
|------------------------------------|---------------------------------------------------------------------------------|
| Every action: User, Role, County, Ts| `audit_logs` + `actor_role` column + trigger; INSERT policy for audit_logs     |
| Permission checks server-side      | RLS on all tables; no UI-only permission checks                                 |
| Immediate revocation on suspension | RLS `is_user_active()`; useAuth sign-out and redirect when `!profile.is_active` |
