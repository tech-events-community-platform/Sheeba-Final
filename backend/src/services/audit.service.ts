import { query } from '../config/db';

export interface LogActionParams {
  action: string;
  category: 
    | 'USER_MANAGEMENT'
    | 'EVENTS'
    | 'REGISTRATIONS'
    | 'BADGES'
    | 'ORGANIZER_SPONSOR'
    | 'MODERATION'
    | 'RECYCLE_BIN'
    | 'PAYMENTS'
    | 'AUTH_SECURITY';
  entityType: string;
  entityId: string;
  entityTitle?: string;
  performedBy?: string | null;
  performedByName?: string;
  performedByEmail?: string;
  performedByRole?: string;
  details?: string;
  metadata?: Record<string, any>;
}

export class AuditService {
  /**
   * Sanitizes metadata to strictly prevent sensitive credentials, passwords, or tokens from being saved.
   */
  private static sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> {
    if (!metadata || typeof metadata !== 'object') return {};

    const sensitiveKeys = [
      'password',
      'password_hash',
      'currentpassword',
      'newpassword',
      'confirmpassword',
      'token',
      'refreshtoken',
      'accesstoken',
      'secret',
      'authorization',
      'cookie',
      'credit_card',
      'card_number',
      'cvv',
      'pin',
      'chapakey',
      'apikey',
      'api_key',
      'private_key',
    ];

    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(metadata)) {
      const lower = key.toLowerCase();
      if (sensitiveKeys.some((s) => lower.includes(s))) {
        clean[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        clean[key] = this.sanitizeMetadata(value);
      } else {
        clean[key] = value;
      }
    }
    return clean;
  }

  /**
   * Append-only system audit log entry.
   * Catches errors internally to prevent audit log failures from aborting business operations.
   */
  static async logAction(params: LogActionParams): Promise<void> {
    try {
      let performedByName = params.performedByName || null;
      let performedByEmail = params.performedByEmail || null;
      let performedByRole = params.performedByRole || null;

      // If actor ID is present but name/email missing, look up from users table
      if (params.performedBy && (!performedByName || !performedByEmail)) {
        try {
          const userRes = await query(
            'SELECT full_name, email, role FROM users WHERE id = $1 LIMIT 1',
            [params.performedBy]
          );
          if (userRes.rows.length > 0) {
            performedByName = performedByName || userRes.rows[0].full_name;
            performedByEmail = performedByEmail || userRes.rows[0].email;
            performedByRole = performedByRole || userRes.rows[0].role;
          }
        } catch {
          // Non-blocking fallback
        }
      }

      const cleanMeta = this.sanitizeMetadata(params.metadata);

      await query(
        `INSERT INTO system_audit_logs (
          action, category, entity_type, entity_id, entity_title,
          performed_by, performed_by_name, performed_by_email, performed_by_role,
          details, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [
          params.action,
          params.category,
          params.entityType,
          String(params.entityId),
          params.entityTitle || null,
          params.performedBy || null,
          performedByName,
          performedByEmail,
          performedByRole,
          params.details || null,
          JSON.stringify(cleanMeta),
        ]
      );
    } catch (err: any) {
      console.warn('[AuditService] Failed to record audit log:', err?.message || err);
    }
  }

  /**
   * Ensures the system_audit_logs table exists and backfills historical content_moderation_logs
   * and recycle_bin_audit_logs without creating duplicates.
   */
  static async initAuditTable(): Promise<void> {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS system_audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            action VARCHAR(100) NOT NULL,
            category VARCHAR(50) NOT NULL,
            entity_type VARCHAR(50) NOT NULL,
            entity_id VARCHAR(255) NOT NULL,
            entity_title VARCHAR(255),
            performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
            performed_by_name VARCHAR(255),
            performed_by_email VARCHAR(255),
            performed_by_role VARCHAR(50),
            details TEXT,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_system_audit_logs_created_at ON system_audit_logs(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_system_audit_logs_category ON system_audit_logs(category);
        CREATE INDEX IF NOT EXISTS idx_system_audit_logs_action ON system_audit_logs(action);
        CREATE INDEX IF NOT EXISTS idx_system_audit_logs_entity ON system_audit_logs(entity_type, entity_id);
      `);

      // Backfill existing content_moderation_logs without duplicates (matching by id)
      await query(`
        INSERT INTO system_audit_logs (
            id, action, category, entity_type, entity_id, entity_title, performed_by, performed_by_name, performed_by_email, performed_by_role, details, metadata, created_at
        )
        SELECT 
            cml.id,
            CASE WHEN cml.action = 'takedown' THEN 'MODERATION_TAKEDOWN' ELSE 'MODERATION_RESTORE' END,
            'MODERATION',
            cml.content_type,
            cml.content_id::text,
            cml.content_title,
            cml.performed_by,
            u.full_name,
            u.email,
            u.role,
            cml.reason,
            cml.metadata,
            cml.created_at
        FROM content_moderation_logs cml
        LEFT JOIN users u ON cml.performed_by = u.id
        ON CONFLICT (id) DO NOTHING;
      `);

      // Backfill existing recycle_bin_audit_logs without duplicates
      await query(`
        INSERT INTO system_audit_logs (
            id, action, category, entity_type, entity_id, entity_title, performed_by, performed_by_name, performed_by_email, performed_by_role, details, metadata, created_at
        )
        SELECT 
            rbal.id,
            UPPER(rbal.action),
            'RECYCLE_BIN',
            rbal.entity_type,
            rbal.entity_id::text,
            rbal.entity_title,
            rbal.performed_by,
            u.full_name,
            u.email,
            u.role,
            COALESCE(rbal.metadata->>'reason', 'Recycle bin lifecycle operation'),
            rbal.metadata,
            rbal.created_at
        FROM recycle_bin_audit_logs rbal
        LEFT JOIN users u ON rbal.performed_by = u.id
        ON CONFLICT (id) DO NOTHING;
      `);
    } catch (err: any) {
      console.warn('[AuditService] initAuditTable warning:', err?.message || err);
    }
  }

  /**
   * Retrieves paginated system audit logs with search and category filtering.
   * Parameterized SQL queries strictly prevent SQL injection.
   */
  static async getAuditLogs(params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    action?: string;
  }): Promise<{
    logs: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    categoryCounts: Record<string, number>;
  }> {
    await this.initAuditTable();

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 15));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    let pIdx = 1;

    if (params.category && params.category !== 'ALL' && params.category.trim()) {
      conditions.push(`category = $${pIdx}`);
      values.push(params.category.trim().toUpperCase());
      pIdx++;
    }

    if (params.action && params.action !== 'ALL' && params.action.trim()) {
      conditions.push(`action = $${pIdx}`);
      values.push(params.action.trim());
      pIdx++;
    }

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim().toLowerCase()}%`;
      conditions.push(
        `(LOWER(action) LIKE $${pIdx} OR LOWER(COALESCE(entity_title, '')) LIKE $${pIdx} OR LOWER(COALESCE(performed_by_name, '')) LIKE $${pIdx} OR LOWER(COALESCE(performed_by_email, '')) LIKE $${pIdx} OR LOWER(COALESCE(details, '')) LIKE $${pIdx} OR LOWER(entity_id) LIKE $${pIdx})`
      );
      values.push(term);
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total Count
    const countSql = `SELECT COUNT(*)::INTEGER AS total FROM system_audit_logs ${whereClause}`;
    const countRes = await query(countSql, values);
    const total = countRes.rows[0]?.total || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // Paginated Data
    const dataValues = [...values, limit, offset];
    const dataSql = `
      SELECT 
        id, action, category, entity_type, entity_id, entity_title,
        performed_by, performed_by_name, performed_by_email, performed_by_role,
        details, metadata, created_at
      FROM system_audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `;
    const dataRes = await query(dataSql, dataValues);

    // Summary counts per category
    const catRes = await query(`
      SELECT category, COUNT(*)::INTEGER AS count
      FROM system_audit_logs
      GROUP BY category
    `);
    const categoryCounts: Record<string, number> = { ALL: total };
    for (const r of catRes.rows) {
      categoryCounts[r.category] = r.count;
    }

    return {
      logs: dataRes.rows.map((row: any) => ({
        id: row.id,
        action: row.action,
        category: row.category,
        entityType: row.entity_type,
        entityId: row.entity_id,
        entityTitle: row.entity_title,
        performedBy: row.performed_by,
        performedByName: row.performed_by_name || (row.performed_by ? 'System User' : 'System Routine'),
        performedByEmail: row.performed_by_email || '',
        performedByRole: row.performed_by_role || '',
        details: row.details,
        metadata: row.metadata || {},
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      categoryCounts,
    };
  }
}

