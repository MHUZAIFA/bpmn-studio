'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Role } from '@/types';

const ROLE_CONFIG: Record<string, { label: string; color: string; description: string; icon: string }> = {
  OWNER: {
    label: 'Owner',
    color: '#8b5cf6',
    description: 'Full access, manage team & billing',
    icon: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
  },
  ADMIN: {
    label: 'Admin',
    color: '#3b82f6',
    description: 'Manage processes, deploy & invite',
    icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
  },
  EDITOR: {
    label: 'Editor',
    color: '#10b981',
    description: 'Edit processes & create branches',
    icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
  },
  VIEWER: {
    label: 'Viewer',
    color: '#6b7280',
    description: 'View processes & versions only',
    icon: 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  },
};

interface UserManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserManagementPanel({ isOpen, onClose }: UserManagementPanelProps) {
  const api = useApi();
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<string>(Role.VIEWER);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleEditId, setRoleEditId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const data = await api.users.list();
      setUsers(data.users);
    } catch {
      // silent
    } finally {
      setUsersLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setShowInvite(false);
      setError('');
      setSearch('');
    }
  }, [isOpen, loadUsers]);

  const handleInvite = async () => {
    if (!inviteUsername.trim() || !invitePassword) return;
    setLoading(true);
    setError('');
    try {
      await api.users.invite(inviteUsername.trim(), invitePassword, inviteRole);
      setInviteUsername('');
      setInvitePassword('');
      setInviteRole(Role.VIEWER);
      setShowInvite(false);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    setRoleEditId(null);
    try {
      await api.users.changeRole(userId, newRole);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change role');
    }
  };

  const filtered = search.trim()
    ? users.filter((u) => (u.username as string).toLowerCase().includes(search.trim().toLowerCase()))
    : users;

  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    const r = u.role as string;
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});



  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-2xl">
      <div className="-mt-2">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-light)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Team</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {users.length} member{users.length !== 1 ? 's' : ''} in your workspace
            </p>
          </div>
          <button
            onClick={() => { setShowInvite(!showInvite); setError(''); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all shadow-sm hover:shadow-md hover:brightness-110"
            style={{ background: showInvite ? 'var(--text-muted)' : 'var(--accent)' }}
          >
            {showInvite ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
                Invite
              </>
            )}
          </button>
        </div>

        {/* Role stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {Object.entries(ROLE_CONFIG).map(([role, config]) => (
            <div
              key={role}
              className="rounded-xl border px-3 py-2.5 text-center transition-colors"
              style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
            >
              <p className="text-lg font-bold tabular-nums" style={{ color: config.color }}>{roleCounts[role] || 0}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{config.label}s</p>
            </div>
          ))}
        </div>

        {/* Invite form */}
        <AnimatePresence>
          {showInvite && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border p-4 mb-4 space-y-3" style={{ borderColor: 'var(--accent)', background: 'var(--accent-light)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                  </svg>
                  <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>Invite a new team member</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Username"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    placeholder="e.g. johndoe"
                    autoFocus
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    placeholder="Initial password"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[Role.VIEWER, Role.EDITOR, Role.ADMIN].map((role) => {
                      const config = ROLE_CONFIG[role];
                      const isActive = inviteRole === role;
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setInviteRole(role)}
                          className="relative flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-center transition-all"
                          style={{
                            background: isActive ? `${config.color}08` : 'var(--card-bg)',
                            borderColor: isActive ? config.color : 'var(--border)',
                          }}
                        >
                          {isActive && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: config.color }}>
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            </div>
                          )}
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${config.color}15` }}>
                            <svg className="w-3.5 h-3.5" style={{ color: config.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
                            </svg>
                          </div>
                          <span className="text-xs font-semibold" style={{ color: isActive ? config.color : 'var(--text-primary)' }}>{config.label}</span>
                          <span className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>{config.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Button onClick={handleInvite} loading={loading} disabled={!inviteUsername.trim() || !invitePassword} className="w-full">
                  Send Invite
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2.5 rounded-xl border px-4 py-3 mb-4"
              style={{ borderColor: '#fca5a5', background: '#fef2f2' }}
            >
              <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-600 flex-1">{error}</p>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        {users.length > 3 && (
          <div className="relative mb-4">
            <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search members..."
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
        )}

        {/* Members list */}
        <div className="max-h-[380px] overflow-y-auto pr-1 -mr-1 scrollbar-hidden">
          {usersLoading && users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <svg className="animate-spin h-6 w-6 mb-3" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading team members...</p>
            </div>
          ) : filtered.length === 0 && search.trim() ? (
            <div className="text-center py-12 rounded-xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No members found</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>No one matches &ldquo;{search}&rdquo;</p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              {filtered.map((user, i) => {
                const role = user.role as string;
                const config = ROLE_CONFIG[role] || ROLE_CONFIG.VIEWER;
                const isCurrentUser = currentUser?.id === (user._id as string);
                const isOwner = role === Role.OWNER;
                const username = user.username as string;
                const initials = username.slice(0, 2).toUpperCase();

                const isEditing = roleEditId === (user._id as string);
                return (
                  <div key={user._id as string} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                    <div
                      className="flex items-center gap-3 px-4 py-3.5 transition-colors"
                      style={{ background: 'var(--card-bg)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-light)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card-bg)'; }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ background: `${config.color}15`, color: config.color }}
                      >
                        {initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {username}
                          </p>
                          {isCurrentUser && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'var(--accent)', color: '#fff' }}>
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          Joined {new Date(user.createdAt as string).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>

                      {isOwner ? (
                        <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-lg" style={{ background: `${config.color}12` }}>
                          <svg className="w-3.5 h-3.5" style={{ color: config.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
                          </svg>
                          <span className="text-xs font-semibold" style={{ color: config.color }}>Owner</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRoleEditId(isEditing ? null : (user._id as string))}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all shrink-0"
                          style={{
                            background: isEditing ? `${config.color}08` : 'var(--card-bg)',
                            borderColor: isEditing ? config.color : 'var(--border)',
                            color: config.color,
                          }}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
                          </svg>
                          {config.label}
                          <svg className="w-3 h-3" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {isEditing && !isOwner && (
                      <div className="px-4 pb-3 pt-0">
                        <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                          {[Role.VIEWER, Role.EDITOR, Role.ADMIN].map((r) => {
                            const rc = ROLE_CONFIG[r];
                            const isActive = role === r;
                            return (
                              <button
                                key={r}
                                onClick={() => { handleChangeRole(user._id as string, r); setRoleEditId(null); }}
                                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all justify-center"
                                style={{
                                  background: isActive ? `${rc.color}15` : 'transparent',
                                  color: isActive ? rc.color : 'var(--text-secondary)',
                                  boxShadow: isActive ? `0 0 0 1.5px ${rc.color}40` : 'none',
                                }}
                              >
                                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d={rc.icon} />
                                </svg>
                                {rc.label}
                                {isActive && (
                                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
