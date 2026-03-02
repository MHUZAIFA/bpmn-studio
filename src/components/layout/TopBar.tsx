'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useApi } from '@/hooks/useApi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { UserManagementPanel } from '@/components/panels/UserManagementPanel';
import { AuditLogPanel } from '@/components/panels/AuditLogPanel';
import { DeploymentsPanel } from '@/components/panels/DeploymentsPanel';
import { SettingsDropdown } from '@/components/layout/SettingsDropdown';
import { Role, ROLE_HIERARCHY } from '@/types';

const roleBadgeVariant: Record<string, 'purple' | 'blue' | 'green' | 'gray'> = {
  [Role.OWNER]: 'purple',
  [Role.ADMIN]: 'blue',
  [Role.EDITOR]: 'green',
  [Role.VIEWER]: 'gray',
};

export function TopBar() {
  const { user } = useAuthStore();
  const workspace = useWorkspaceStore();
  const api = useApi();
  const { logout } = useAuthStore();

  const [showUsers, setShowUsers] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showDeploys, setShowDeploys] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } finally {
      logout();
    }
  };

  if (!user) return null;

  const isAdmin = ROLE_HIERARCHY[user.role as Role] >= ROLE_HIERARCHY[Role.ADMIN];
  const isOwner = user.role === Role.OWNER;

  return (
    <>
      <header
        className="h-12 sm:h-14 flex items-center justify-between px-3 sm:px-4 shadow-sm border-b"
        style={{ background: 'var(--header-bg)', borderColor: 'var(--header-border)' }}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            className="flex items-center gap-1.5 sm:gap-2 transition-opacity hover:opacity-80 shrink-0"
            onClick={() => {
              workspace.setOnboardingMode(null);
              workspace.setCurrentChat(null);
            }}
          >
            <svg className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: 'var(--accent)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="8" y="14" width="7" height="7" rx="1" />
              <path d="M6.5 10v1.5a1 1 0 001 1H10m7.5-2.5v1.5a1 1 0 01-1 1H14m-2.5 2.5V12" />
            </svg>
            <span className="text-base sm:text-lg font-bold hidden xs:inline" style={{ color: 'var(--text-primary)' }}>BPMN Studio</span>
          </button>
          <span className="hidden sm:inline" style={{ color: 'var(--border)' }}>|</span>
          <span className="text-xs sm:text-sm font-medium truncate hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>{user.organizationName}</span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2">
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => setShowDeploys(true)}>
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              Deploys
            </Button>
          )}
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => setShowUsers(true)}>
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Team
            </Button>
          )}
          {isOwner && (
            <Button variant="ghost" size="sm" onClick={() => setShowAudit(true)}>
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Audit
            </Button>
          )}
          <SettingsDropdown />
          <div className="w-px h-6 mx-1" style={{ background: 'var(--border)' }} />
          <Badge variant={roleBadgeVariant[user.role] || 'gray'}>{user.role}</Badge>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user.username}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-1">
          <SettingsDropdown />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden border-b px-3 py-2 flex flex-col gap-1"
          style={{ background: 'var(--header-bg)', borderColor: 'var(--header-border)' }}
        >
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Badge variant={roleBadgeVariant[user.role] || 'gray'}>{user.role}</Badge>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user.username}</span>
            <span className="text-xs truncate ml-auto" style={{ color: 'var(--text-muted)' }}>{user.organizationName}</span>
          </div>
          <div className="border-t my-0.5" style={{ borderColor: 'var(--border)' }} />
          {isAdmin && (
            <button onClick={() => { setShowDeploys(true); setMobileMenuOpen(false); }} className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
              Deploys
            </button>
          )}
          {isAdmin && (
            <button onClick={() => { setShowUsers(true); setMobileMenuOpen(false); }} className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              Team
            </button>
          )}
          {isOwner && (
            <button onClick={() => { setShowAudit(true); setMobileMenuOpen(false); }} className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              Audit
            </button>
          )}
          <div className="border-t my-0.5" style={{ borderColor: 'var(--border)' }} />
          <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors hover:opacity-80 text-red-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Logout
          </button>
        </div>
      )}

      <UserManagementPanel isOpen={showUsers} onClose={() => setShowUsers(false)} />
      <AuditLogPanel isOpen={showAudit} onClose={() => setShowAudit(false)} />
      <DeploymentsPanel isOpen={showDeploys} onClose={() => setShowDeploys(false)} />
    </>
  );
}
