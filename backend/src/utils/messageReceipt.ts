import type { MessageStatusType } from '@prisma/client';

/** Aggregate recipients' rows into one status for the sender's checkmarks. */
export function aggregateRecipientReceipt(
  statuses: { userId: string; status: MessageStatusType }[],
  senderId: string
): MessageStatusType {
  const rows = statuses.filter((s) => s.userId !== senderId);
  if (rows.length === 0) return 'SENT';

  const allRead = rows.every((r) => r.status === 'READ');
  if (allRead) return 'READ';

  const allDeliveredOrRead = rows.every(
    (r) => r.status === 'DELIVERED' || r.status === 'READ'
  );
  if (allDeliveredOrRead) return 'DELIVERED';

  return 'SENT';
}
