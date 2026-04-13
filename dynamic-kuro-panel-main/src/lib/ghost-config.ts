// Ghost System Configuration
// All ghost owner identity checks are now SERVER-SIDE via is_ghost_owner() RPC
// No emails are exposed in client-side code

// These functions are DEPRECATED - use AuthContext.isGhostOwner instead
// Kept as stubs for backward compatibility during migration

/** @deprecated Use AuthContext.isGhostOwner instead */
export const isGhostOwnerEmail = (_email: string | undefined | null): boolean => {
  console.warn("[SECURITY] isGhostOwnerEmail is deprecated. Use AuthContext.isGhostOwner instead.");
  return false; // Always false client-side - server checks this now
};

/** @deprecated Use server-side is_ghost_user() RPC instead */
export const isGhostEmail = (_email: string | undefined | null): boolean => {
  return false;
};

/** @deprecated No longer available client-side */
export const getGhostOwnerEmail = (): string => {
  return "***hidden***";
};

/** @deprecated Use server-side is_ghost_user() RPC instead */
export const shouldHideUser = async (
  _supabase: any,
  _userId: string,
  _userEmail?: string | null
): Promise<boolean> => {
  return false;
};

// Ghost emails list removed - no longer exposed client-side
export const GHOST_EMAILS: string[] = [];
export const GHOST_OWNER_EMAIL = "***hidden***";
