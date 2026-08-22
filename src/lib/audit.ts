import { createClient } from '../utils/supabase/server';

export interface AuditLogEntry {
  action: string;
  table_name: string;
  record_id?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
}

export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    await supabase.from('admin_audit_log').insert({
      user_id: user.id,
      user_email: user.email || 'unknown',
      action: entry.action,
      table_name: entry.table_name,
      record_id: entry.record_id || null,
      old_data: entry.old_data || null,
      new_data: entry.new_data || null,
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}