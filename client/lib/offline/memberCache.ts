import { STORES, idbGet, idbPut, idbGetAll, idbClearStore, safeIdb } from "./idb";
import type { OfflineMemberProfile } from "./types";

// ---------------------------------------------------------------------------
// Member profile (Informations personnelles + adhésion)
// ---------------------------------------------------------------------------
// Single cached record per member, covering both personal info AND
// membership status (payment_completed / documents_completed live
// directly on this same record -- see types.ts). No separate
// membership cache: there is no separate membership table in the real
// schema, so a second cache would just risk drifting out of sync with
// this one.

export async function cacheMemberProfile(memberId: string, data: OfflineMemberProfile): Promise<void> {
  const envelope = { member_id: memberId, data, cached_at: new Date().toISOString() };
  await safeIdb(() => idbPut(STORES.memberProfile, envelope), undefined);
}

export async function getCachedMemberProfile(
  memberId: string,
): Promise<{ data: OfflineMemberProfile; cachedAt: string } | null> {
  const record = await safeIdb(
    () => idbGet<{ member_id: string; data: OfflineMemberProfile; cached_at: string }>(STORES.memberProfile, memberId),
    undefined,
  );
  if (!record) return null;
  return { data: record.data, cachedAt: record.cached_at };
}

// ---------------------------------------------------------------------------
// Housekeeping
// ---------------------------------------------------------------------------

/** Clears personal data caches on logout. The sync queue and QR records are
 * intentionally preserved (see AuthContext.logout) so nothing pending gets lost. */
export async function clearAllOfflineCaches(): Promise<void> {
  await safeIdb(() => idbClearStore(STORES.memberProfile), undefined);
}
