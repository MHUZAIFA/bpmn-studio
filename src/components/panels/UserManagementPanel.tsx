'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Role } from '@/types';

const roleBadge: Record<string, 'purple' | 'blue' | 'green' | 'gray'> = {
  OWNER: 'purple',
  ADMIN: 'blue',
  EDITOR: 'green',
  VIEWER: 'gray',
};

interface UserManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserManagementPanel({ isOpen, onClose }: UserManagementPanelProps) {
  const api = useApi();
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<string>(Role.VIEWER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      const data = await api.users.list();
      setUsers(data.users);
    } catch {
      // silent
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) loadUsers();
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
    try {
      await api.users.changeRole(userId, newRole);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change role');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Team Management">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {users.length} member{users.length !== 1 ? 's' : ''}
          </p>
          <Button size="sm" onClick={() => setShowInvite(!showInvite)}>
            {showInvite ? 'Cancel' : 'Invite User'}
          </Button>
        </div>

        <AnimatePresence>
          {showInvite && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-lg p-4 space-y-3"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <Input
                label="Username"
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                placeholder="new_user"
              />
              <Input
                label="Password"
                type="password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                placeholder="Initial password"
              />
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}
                >
                  <option value={Role.VIEWER}>Viewer</option>
                  <option value={Role.EDITOR}>Editor</option>
                  <option value={Role.ADMIN}>Admin</option>
                </select>
              </div>
              <Button size="sm" onClick={handleInvite} loading={loading} className="w-full">
                Send Invite
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {users.map((user) => (
            <div
              key={user._id as string}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--accent-light)' }}
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--accent-text)' }}>
                    {(user.username as string)?.[0]?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.username as string}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Joined {new Date(user.createdAt as string).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(user.role as string) === Role.OWNER ? (
                  <Badge variant="purple">Owner</Badge>
                ) : (
                  <select
                    value={user.role as string}
                    onChange={(e) => handleChangeRole(user._id as string, e.target.value)}
                    className="text-xs px-2 py-1 border rounded-md focus:outline-none focus:ring-1"
                    style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}
                  >
                    <option value={Role.VIEWER}>Viewer</option>
                    <option value={Role.EDITOR}>Editor</option>
                    <option value={Role.ADMIN}>Admin</option>
                  </select>
                )}
                <Badge variant={roleBadge[(user.role as string)] || 'gray'}>
                  {user.role as string}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
