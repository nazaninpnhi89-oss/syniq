import "server-only";

/**
 * Classroom-demo escape hatch: when ADMIN_DEMO_MODE=true, the admin panel
 * skips the login requirement entirely and acts as the account identified
 * by ADMIN_DEMO_USER_ID (falling back to the actual role stored on that
 * profile — it does not grant extra privileges beyond what that account
 * already has). Unset ADMIN_DEMO_MODE to restore normal login.
 */
export const DEMO_MODE = process.env.ADMIN_DEMO_MODE === "true";

export function demoUserId(): string | null {
  return process.env.ADMIN_DEMO_USER_ID ?? null;
}
