'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

const actionColors: Record<string, 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray'> = {
  LOGIN: 'blue',
  REGISTER: 'green',
  AI_GENERATE: 'purple',
  BRANCH_CREATE: 'green',
  BRANCH_MERGE: 'yellow',
  DEPLOY: 'red',
  ROLE_CHANGE: 'yellow',
  USER_INVITE: 'green',
  VERSION_SAVE: 'blue',
};

interface AuditLogPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function AuditLogPanel({ isOpen, onClose }: AuditLogPanelProps) {
  const api = useApi();
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const loadLogs = useCallback(async () => {
    try {
      const data = await api.audit.list({
        page,
        limit: 20,
        action: actionFilter || undefined,
      });
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch {
      // silent
    }
  }, [page, actionFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) loadLogs();
  }, [isOpen, loadLogs]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Audit Log">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2"
            style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}
          >
            <option value="">All Actions</option>
            <option value="LOGIN">Login</option>
            <option value="REGISTER">Register</option>
            <option value="AI_GENERATE">AI Generate</option>
            <option value="BRANCH_CREATE">Branch Create</option>
            <option value="BRANCH_MERGE">Branch Merge</option>
            <option value="DEPLOY">Deploy</option>
            <option value="ROLE_CHANGE">Role Change</option>
            <option value="USER_INVITE">User Invite</option>
            <option value="VERSION_SAVE">Version Save</option>
          </select>
          {pagination && (
            <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
              {pagination.total} total entries
            </span>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto space-y-1.5">
          {logs.map((log: any) => (
            <div
              key={log._id}
              className="flex items-start gap-3 p-2.5 rounded-lg"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <Badge variant={actionColors[log.action] || 'gray'} className="mt-0.5 shrink-0">
                {log.action}
              </Badge>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {log.userId?.username || 'Unknown'}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(log.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {log.entityType} · {log.entityId?.slice(-8)}
                </p>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                    {Object.entries(log.metadata)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')}
                  </p>
                )}
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No audit logs found</p>
          )}
        </div>

        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Page {page} of {pagination.pages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
