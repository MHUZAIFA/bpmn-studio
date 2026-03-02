'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useApi } from '@/hooks/useApi';
import { useUrlSync, parseRoute, loadProcessFromUrl } from '@/hooks/useUrlSync';
import { TopBar } from '@/components/layout/TopBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { BpmnModelerComponent } from '@/components/bpmn/BpmnModeler';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Role } from '@/types';

export function AppShell() {
  const { user, loading, setUser, setLoading } = useAuthStore();
  const { layout } = usePreferencesStore();
  const workspace = useWorkspaceStore();
  const api = useApi();
  const router = useRouter();
  const urlRestoredRef = useRef(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useUrlSync();

  useEffect(() => {
    async function checkAuth() {
      try {
        const data = await api.auth.me();
        setUser({
          id: data.user.id as string,
          username: data.user.username as string,
          role: data.user.role as Role,
          organizationId: data.user.organizationId as string,
          organizationName: data.user.organizationName as string,
        });
      } catch {
        setLoading(false);
      }
    }
    checkAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore state from URL after auth is resolved
  useEffect(() => {
    if (!user || urlRestoredRef.current) return;
    urlRestoredRef.current = true;

    const route = parseRoute(window.location.pathname);

    async function restoreFromUrl() {
      if (route.type === 'onboarding-prompt') {
        workspace.setOnboardingMode('prompt');
      } else if (route.type === 'onboarding-canvas') {
        workspace.setOnboardingMode('canvas');
      } else if (route.type === 'process' && route.chatId) {
        await loadProcessFromUrl(route.chatId, route.branchId, route.versionId);
      }

      workspace.setUrlRestored(true);
    }

    restoreFromUrl();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    async function checkProcesses() {
      try {
        const data = await api.chats.list();
        workspace.setHasProcesses(data.chats.length > 0);
      } catch { /* silent */ }
    }
    checkProcesses();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-canvas)' }}>
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8" style={{ color: 'var(--accent)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  const sidebarWidth = layout === 'compact' ? 'w-[260px]' : layout === 'wide-canvas' ? 'w-[220px]' : 'w-[30%]';
  const isHorizontal = layout === 'horizontal';
  const isSidebarRight = layout === 'sidebar-right';
  const showSidebar = !!workspace.currentChatId && !workspace.onboardingMode && workspace.sidebarVisible;

  return (
    <ThemeProvider>
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-canvas)' }}>
        <TopBar />
        <div className={`flex flex-1 overflow-hidden ${isHorizontal ? 'flex-col' : 'flex-row'}`}>
          {/* Desktop sidebar */}
          {showSidebar && !isSidebarRight && (
            <div className={`hidden md:block ${isHorizontal ? 'h-64 shrink-0' : sidebarWidth}`}>
              <Sidebar position="left" />
            </div>
          )}

          {/* Mobile sidebar toggle */}
          {showSidebar && (
            <button
              className="md:hidden fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
              style={{ background: 'var(--accent)', color: '#fff' }}
              onClick={() => setMobileSidebarOpen(true)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
          )}

          {/* Mobile sidebar overlay */}
          {showSidebar && mobileSidebarOpen && (
            <div className="md:hidden fixed inset-0 z-50 flex">
              <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
              <div className="relative w-full max-w-sm h-full ml-auto" style={{ background: 'var(--bg-primary)' }}>
                <button
                  className="absolute top-3 right-3 p-1.5 rounded-lg z-10"
                  style={{ color: 'var(--text-muted)' }}
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <Sidebar position="left" />
              </div>
            </div>
          )}

          <BpmnModelerComponent />

          {showSidebar && isSidebarRight && (
            <div className={`hidden md:block ${sidebarWidth}`}>
              <Sidebar position="right" />
            </div>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}
