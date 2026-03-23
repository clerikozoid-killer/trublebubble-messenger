import type { Message, MessageStatus } from '../types';

export type ReceiptState = 'SENT' | 'DELIVERED' | 'READ';

export function aggregateRecipientReceipt(
  statuses: Pick<MessageStatus, 'userId' | 'status'>[] | undefined,
  senderId: string
): ReceiptState {
  const rows = (statuses ?? []).filter((s) => s.userId !== senderId);
  if (rows.length === 0) return 'SENT';

  if (rows.every((r) => r.status === 'READ')) return 'READ';
  if (rows.every((r) => r.status === 'DELIVERED' || r.status === 'READ')) return 'DELIVERED';
  return 'SENT';
}

/** Effective receipt for outgoing bubbles (API may send receiptStatus, or we compute from statuses). */
export function getOutgoingReceipt(message: Message, currentUserId: string): ReceiptState {
  if (message.senderId !== currentUserId) return 'SENT';
  if (message.receiptStatus) return message.receiptStatus as ReceiptState;
  return aggregateRecipientReceipt(message.statuses, message.senderId);
}
