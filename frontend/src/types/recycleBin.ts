export type RecycleBinEntityType =
  | 'event'
  | 'registration'
  | 'sponsorship_application'
  | 'sponsorship_deal'
  | 'event_vendor'
  | 'user'
  | 'review';

export interface RecycleBinItem {
  id: string;
  entityType: RecycleBinEntityType;
  title: string;
  subtitle?: string;
  description?: string;
  ownerId?: string;
  ownerName?: string;
  deletedAt: string;
  deletedBy?: string;
  deletedByName?: string;
  expiresAt: string;
  daysRemaining: number;
  metadata?: Record<string, any>;
  canRestore: boolean;
  canPermanentDelete: boolean;
  permanentDeleteBlockReason?: string;
}

export interface RecycleBinStats {
  totalItems: number;
  expiringSoonCount: number;
  byType: Record<string, number>;
}

export interface RecycleBinAuditLog {
  id: string;
  entityType: RecycleBinEntityType;
  entityId: string;
  action: 'soft_delete' | 'restore' | 'permanent_delete' | 'purge_expired';
  performedBy?: string;
  performedByName?: string;
  performedByEmail?: string;
  entityTitle?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}
