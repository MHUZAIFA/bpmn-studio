'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';

function buildPath(state: {
  currentChatId: string | null;
  currentBranchId: string | null;
  currentVersionId: string | null;
  onboardingMode: 'prompt' | 'canvas' | null;
}): string {
  if (state.onboardingMode === 'prompt') return '/new';
  if (state.onboardingMode === 'canvas') return '/new/canvas';
  if (state.currentChatId && state.currentBranchId && state.currentVersionId) {
    return `/processes/${state.currentChatId}/branches/${state.currentBranchId}/chats/${state.currentVersionId}`;
  }
  if (state.currentChatId && state.currentBranchId) {
    return `/processes/${state.currentChatId}/branches/${state.currentBranchId}`;
  }
  if (state.currentChatId) {
    return `/processes/${state.currentChatId}`;
  }
  return '/';
}

export interface ParsedRoute {
  type: 'home' | 'onboarding-prompt' | 'onboarding-canvas' | 'process';
  chatId?: string;
  branchId?: string;
  versionId?: string;
}

export function parseRoute(pathname: string): ParsedRoute {
  const segments = pathname.split('/').filter(Boolean);

  if (segments[0] === 'new') {
    if (segments[1] === 'canvas') return { type: 'onboarding-canvas' };
    return { type: 'onboarding-prompt' };
  }

  // /processes/<processId>/branches/<branchId>/chats/<versionId>
  if (segments[0] === 'processes' && segments[1]) {
    const result: ParsedRoute = { type: 'process', chatId: segments[1] };
    if (segments[2] === 'branches' && segments[3]) {
      result.branchId = segments[3];
    }
    if (segments[4] === 'chats' && segments[5]) {
      result.versionId = segments[5];
    }
    return result;
  }

  // Legacy support: /process/<chatId>/<branchId>
  if (segments[0] === 'process' && segments[1]) {
    return {
      type: 'process',
      chatId: segments[1],
      branchId: segments[2] || undefined,
    };
  }

  return { type: 'home' };
}

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error('API error');
  return res.json();
}

async function loadChatData(chatId: string, branchId?: string, versionId?: string): Promise<boolean> {
  const workspace = useWorkspaceStore.getState();

  workspace.setCurrentChat(chatId);

  const data = await apiFetch<{ branches: any[] }>(`/api/branches?chatId=${chatId}`);
  if (!data.branches || data.branches.length === 0) return false;

  workspace.setBranches(data.branches);

  let targetBranch = branchId
    ? data.branches.find((b: any) => b._id === branchId)
    : null;

  if (!targetBranch) {
    targetBranch = data.branches.find((b: any) => b.name === 'main') || data.branches[0];
  }

  if (targetBranch) {
    workspace.setCurrentBranch(targetBranch._id);
    const vData = await apiFetch<{ versions: any[] }>(`/api/versions?branchId=${targetBranch._id}`);
    workspace.setVersions(vData.versions);

    // If a specific version was requested and exists, load it; otherwise load the latest
    let targetVersion = versionId
      ? vData.versions.find((v: any) => v._id === versionId)
      : null;

    if (!targetVersion && vData.versions.length > 0) {
      targetVersion = vData.versions[vData.versions.length - 1];
    }

    if (targetVersion) {
      const versionDetail = await apiFetch<{ version: any & { xml: string } }>(`/api/versions?versionId=${targetVersion._id}`);
      workspace.setCurrentVersion(targetVersion._id);
      workspace.setCurrentXml(versionDetail.version.xml);
    }
  }

  return true;
}

export async function loadProcessFromUrl(chatId: string, branchId?: string, versionId?: string) {
  const workspace = useWorkspaceStore.getState();

  try {
    const success = await loadChatData(chatId, branchId, versionId);
    if (!success) throw new Error('No branches');
  } catch {
    try {
      const chatsData = await apiFetch<{ chats: any[] }>('/api/chats');
      if (chatsData.chats && chatsData.chats.length > 0) {
        const latest = chatsData.chats[0];
        await loadChatData(latest._id);
      } else {
        workspace.setCurrentChat(null);
      }
    } catch {
      workspace.setCurrentChat(null);
    }
  }

  const ws = useWorkspaceStore.getState();
  const path = buildPath({
    currentChatId: ws.currentChatId,
    currentBranchId: ws.currentBranchId,
    currentVersionId: ws.currentVersionId,
    onboardingMode: ws.onboardingMode,
  });
  window.history.replaceState(null, '', path);
}

export function useUrlSync() {
  const workspace = useWorkspaceStore();
  const isNavigatingRef = useRef(false);
  const lastPathRef = useRef<string>(typeof window !== 'undefined' ? window.location.pathname : '/');

  const pushUrl = useCallback((path: string) => {
    if (path === lastPathRef.current) return;
    lastPathRef.current = path;
    window.history.pushState(null, '', path);
  }, []);

  const replaceUrl = useCallback((path: string) => {
    if (path === lastPathRef.current) return;
    lastPathRef.current = path;
    window.history.replaceState(null, '', path);
  }, []);

  // Sync workspace state → URL
  useEffect(() => {
    if (!workspace.urlRestored || isNavigatingRef.current) return;
    const path = buildPath({
      currentChatId: workspace.currentChatId,
      currentBranchId: workspace.currentBranchId,
      currentVersionId: workspace.currentVersionId,
      onboardingMode: workspace.onboardingMode,
    });
    pushUrl(path);
  }, [workspace.currentChatId, workspace.currentBranchId, workspace.currentVersionId, workspace.onboardingMode, workspace.urlRestored, pushUrl]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = async () => {
      const route = parseRoute(window.location.pathname);
      const ws = useWorkspaceStore.getState();
      isNavigatingRef.current = true;
      lastPathRef.current = window.location.pathname;

      try {
        switch (route.type) {
          case 'home':
            ws.setCurrentChat(null);
            ws.setOnboardingMode(null);
            break;
          case 'onboarding-prompt':
            ws.setCurrentChat(null);
            ws.setOnboardingMode('prompt');
            break;
          case 'onboarding-canvas':
            ws.setCurrentChat(null);
            ws.setOnboardingMode('canvas');
            break;
          case 'process':
            if (route.chatId) {
              await loadProcessFromUrl(route.chatId, route.branchId, route.versionId);
            }
            break;
        }
      } finally {
        isNavigatingRef.current = false;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { pushUrl, replaceUrl, parseRoute: () => parseRoute(window.location.pathname) };
}
