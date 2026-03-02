'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: string; verb: string }> = {
  LOGIN: {
    label: 'Login',
    color: '#3b82f6',
    icon: 'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9',
    verb: 'signed in',
  },
  REGISTER: {
    label: 'Register',
    color: '#10b981',
    icon: 'M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z',
    verb: 'created an account',
  },
  AI_GENERATE: {
    label: 'AI Generate',
    color: '#8b5cf6',
    icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z',
    verb: 'generated a BPMN diagram',
  },
  BRANCH_CREATE: {
    label: 'Branch Create',
    color: '#10b981',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    verb: 'created a branch',
  },
  BRANCH_MERGE: {
    label: 'Branch Merge',
    color: '#f59e0b',
    icon: 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4',
    verb: 'merged a branch',
  },
  DEPLOY: {
    label: 'Deploy',
    color: '#ef4444',
    icon: 'M5 3l14 9-14 9V3z',
    verb: 'deployed a process',
  },
  ROLE_CHANGE: {
    label: 'Role Change',
    color: '#f59e0b',
    icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
    verb: 'changed a user role',
  },
  USER_INVITE: {
    label: 'User Invite',
    color: '#10b981',
    icon: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
    verb: 'invited a user',
  },
  VERSION_SAVE: {
    label: 'Version Save',
    color: '#3b82f6',
    icon: 'M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z',
    verb: 'saved a version',
  },
};

const ALL_ACTIONS = Object.keys(ACTION_CONFIG);

interface AuditLogPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function getDateGroup(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const logDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = today.getTime() - logDay.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'This Week';
  if (days < 30) return 'This Month';
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function AuditLogPanel({ isOpen, onClose }: AuditLogPanelProps) {
  const api = useApi();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.audit.list({
        page,
        limit: 25,
        action: actionFilter || undefined,
      });
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) loadLogs();
  }, [isOpen, loadLogs]);

  const relativeTime = (date: string | Date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const activeConfig = actionFilter ? ACTION_CONFIG[actionFilter] : null;

  const filtered = search.trim()
    ? logs.filter((log) => {
        const q = search.trim().toLowerCase();
        const config = ACTION_CONFIG[log.action];
        return (
          (log.userId?.username || '').toLowerCase().includes(q) ||
          (log.action || '').toLowerCase().includes(q) ||
          (config?.label || '').toLowerCase().includes(q) ||
          (log.entityType || '').toLowerCase().includes(q)
        );
      })
    : logs;

  const grouped: { label: string; logs: any[] }[] = [];
  let currentGroup = '';
  for (const log of filtered) {
    const group = getDateGroup(log.timestamp);
    if (group !== currentGroup) {
      currentGroup = group;
      grouped.push({ label: group, logs: [] });
    }
    grouped[grouped.length - 1].logs.push(log);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-2xl">
      <div className="-mt-2">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-light)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Audit Log</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {pagination ? `${pagination.total} total entries` : 'Track all activity in your workspace'}
            </p>
          </div>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="p-2 rounded-xl border transition-all hover:shadow-sm"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            title="Refresh"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>
        </div>

        {/* Toolbar: search + filter */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search by user, action, entity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all"
              style={{
                background: 'var(--input-bg)',
                borderColor: search ? 'var(--accent)' : 'var(--input-border)',
                color: 'var(--text-primary)',
                boxShadow: search ? '0 0 0 1px var(--accent)' : 'none',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded" style={{ color: 'var(--text-muted)' }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all cursor-pointer whitespace-nowrap"
              style={{
                background: 'var(--card-bg)',
                borderColor: filterOpen || actionFilter ? 'var(--accent)' : 'var(--border)',
                color: actionFilter ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {activeConfig ? (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: activeConfig.color }} />
              ) : (
                <svg className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
              )}
              {activeConfig ? activeConfig.label : 'Filter'}
              <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {filterOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-56 rounded-xl border shadow-lg z-20 py-1.5 overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
                  <button
                    onClick={() => { setActionFilter(''); setFilterOpen(false); setPage(1); }}
                    className="w-full text-left px-3.5 py-2 text-sm transition-colors flex items-center gap-2.5"
                    style={{ color: !actionFilter ? 'var(--accent)' : 'var(--text-secondary)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-light)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
                      <svg className="w-3 h-3" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                      </svg>
                    </span>
                    <span className="flex-1">All Actions</span>
                    {!actionFilter && (
                      <svg className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                  <div className="h-px my-1" style={{ background: 'var(--border)' }} />
                  {ALL_ACTIONS.map((action) => {
                    const config = ACTION_CONFIG[action];
                    const isActive = actionFilter === action;
                    return (
                      <button
                        key={action}
                        onClick={() => { setActionFilter(action); setFilterOpen(false); setPage(1); }}
                        className="w-full text-left px-3.5 py-2 text-sm transition-colors flex items-center gap-2.5"
                        style={{ color: isActive ? config.color : 'var(--text-secondary)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-light)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: `${config.color}15` }}>
                          <svg className="w-3 h-3" style={{ color: config.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
                          </svg>
                        </span>
                        <span className="flex-1">{config.label}</span>
                        {isActive && (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {actionFilter && (
            <button
              onClick={() => { setActionFilter(''); setPage(1); }}
              className="p-2 rounded-xl transition-colors shrink-0"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              title="Clear filter"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Timeline log entries */}
        <div className="max-h-[460px] overflow-y-auto pr-1 -mr-1 scrollbar-hidden">
          {loading && logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <svg className="animate-spin h-6 w-6 mb-3" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading audit logs...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
                <svg className="w-6 h-6" style={{ color: 'var(--text-muted)', opacity: 0.4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No audit logs found</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {search ? 'Try a different search term' : actionFilter ? 'Try a different filter' : 'Activity will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {grouped.map((group) => (
                <div key={group.label}>
                  {/* Date group header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {group.label}
                    </span>
                    <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
                    <span className="text-[10px] tabular-nums shrink-0" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                      {group.logs.length}
                    </span>
                  </div>

                  {/* Timeline entries */}
                  <div className="relative ml-4">
                    {/* Timeline line */}
                    <div className="absolute left-[15px] top-0 bottom-0 w-px" style={{ background: 'var(--border)' }} />

                    <div className="space-y-0.5">
                      {group.logs.map((log: any) => {
                        const config = ACTION_CONFIG[log.action] || { label: log.action, color: '#6b7280', icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z', verb: 'performed an action' };
                        const isExpanded = expandedId === log._id;
                        const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;

                        return (
                          <div key={log._id} className="relative flex gap-3">
                            {/* Timeline dot */}
                            <div className="relative z-10 w-[31px] flex justify-center pt-3 shrink-0">
                              <div
                                className="w-[9px] h-[9px] rounded-full ring-2"
                                style={{ background: config.color, ringColor: 'var(--bg-primary)' }}
                              />
                            </div>

                            {/* Content card */}
                            <button
                              onClick={() => hasMeta ? setExpandedId(isExpanded ? null : log._id) : undefined}
                              className={`flex-1 text-left rounded-xl px-3.5 py-2.5 transition-all min-w-0 ${hasMeta ? 'cursor-pointer' : 'cursor-default'}`}
                              style={{ background: isExpanded ? 'var(--accent-light)' : 'transparent' }}
                              onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                              onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${config.color}12` }}>
                                  <svg className="w-3.5 h-3.5" style={{ color: config.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
                                  </svg>
                                </div>
                                <span className="text-sm min-w-0" style={{ color: 'var(--text-primary)' }}>
                                  <span className="font-semibold">{log.userId?.username || 'Unknown'}</span>
                                  <span style={{ color: 'var(--text-muted)' }}> {config.verb}</span>
                                </span>
                                <span className="text-[10px] tabular-nums shrink-0 ml-auto" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                                  {relativeTime(log.timestamp)}
                                </span>
                              </div>

                              {/* Entity info */}
                              <div className="ml-8 mt-1 flex items-center gap-2">
                                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                  {log.entityType}
                                  {log.entityId && <span style={{ opacity: 0.5 }}> #{log.entityId.slice(-6)}</span>}
                                </span>
                                {hasMeta && (
                                  <svg className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)', opacity: 0.4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                  </svg>
                                )}
                              </div>

                              {/* Expandable metadata */}
                              {isExpanded && hasMeta && (
                                <div className="ml-8 mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                    {Object.entries(log.metadata).map(([k, v]) => (
                                      <div key={k} className="min-w-0">
                                        <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                                          {k}
                                        </span>
                                        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                                          {String(v)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer: pagination + info */}
        {pagination && (
          <div className="flex items-center justify-between pt-3 mt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            {pagination.pages > 1 ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  Prev
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className="w-7 h-7 rounded-lg text-xs font-medium transition-colors"
                        style={{
                          background: page === pageNum ? 'var(--accent)' : 'transparent',
                          color: page === pageNum ? '#fff' : 'var(--text-muted)',
                        }}
                        onMouseEnter={(e) => { if (page !== pageNum) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                        onMouseLeave={(e) => { if (page !== pageNum) e.currentTarget.style.background = 'transparent'; }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                >
                  Next
                  <svg className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Button>
              </>
            ) : (
              <p className="text-[11px] w-full text-center" style={{ color: 'var(--text-muted)' }}>
                Showing {filtered.length} of {pagination.total} entries
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
