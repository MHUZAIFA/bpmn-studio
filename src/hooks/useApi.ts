'use client';

import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  if (res.status === 401) {
    useAuthStore.getState().logout();
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function useApi() {
  const workspace = useWorkspaceStore();

  return {
    auth: {
      login: (body: { username: string; password: string }) =>
        apiFetch<{ user: any }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      register: (body: { username: string; password: string; organizationName?: string }) =>
        apiFetch<{ user: any }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      logout: () => apiFetch('/api/auth/logout', { method: 'POST' }),
      me: () => apiFetch<{ user: any }>('/api/auth/me'),
    },

    chats: {
      list: () => apiFetch<{ chats: any[] }>('/api/chats'),
      create: (name: string) =>
        apiFetch<{ chat: any }>('/api/chats', {
          method: 'POST',
          body: JSON.stringify({ name }),
        }),
      rename: (chatId: string, name: string) =>
        apiFetch<{ chat: any }>('/api/chats', {
          method: 'PATCH',
          body: JSON.stringify({ chatId, name }),
        }),
      delete: (chatId: string) =>
        apiFetch<{ success: boolean }>(`/api/chats?chatId=${chatId}`, {
          method: 'DELETE',
        }),
    },

    branches: {
      list: (chatId: string) =>
        apiFetch<{ branches: any[] }>(`/api/branches?chatId=${chatId}`),
      create: (chatId: string, name: string, baseVersionId?: string) =>
        apiFetch<{ branch: any }>('/api/branches', {
          method: 'POST',
          body: JSON.stringify({ chatId, name, baseVersionId }),
        }),
      merge: (branchId: string, targetBranchId: string) =>
        apiFetch<any>('/api/branches', {
          method: 'PUT',
          body: JSON.stringify({ branchId, targetBranchId }),
        }),
      rename: (branchId: string, name: string) =>
        apiFetch<any>('/api/branches', {
          method: 'PATCH',
          body: JSON.stringify({ branchId, name }),
        }),
      delete: (branchId: string) =>
        apiFetch<any>(`/api/branches?branchId=${branchId}`, {
          method: 'DELETE',
        }),
    },

    versions: {
      list: (branchId: string) =>
        apiFetch<{ versions: any[] }>(`/api/versions?branchId=${branchId}`),
      get: (versionId: string) =>
        apiFetch<{ version: any & { xml: string } }>(`/api/versions?versionId=${versionId}`),
      save: (xml: string, prompt?: string) =>
        apiFetch<{ version: any }>('/api/versions', {
          method: 'POST',
          body: JSON.stringify({
            chatId: workspace.currentChatId,
            branchId: workspace.currentBranchId,
            xml,
            prompt,
          }),
        }),
      saveToProcess: (chatId: string, branchId: string, xml: string, prompt?: string) =>
        apiFetch<{ version: any }>('/api/versions', {
          method: 'POST',
          body: JSON.stringify({ chatId, branchId, xml, prompt }),
        }),
    },

    ai: {
      generate: (prompt: string) =>
        apiFetch<{ version: any; xml: string }>('/api/ai', {
          method: 'POST',
          body: JSON.stringify({
            chatId: workspace.currentChatId,
            branchId: workspace.currentBranchId,
            prompt,
          }),
        }),
      generateCustom: (chatId: string, branchId: string, prompt: string) =>
        apiFetch<{ version: any; xml: string }>('/api/ai', {
          method: 'POST',
          body: JSON.stringify({ chatId, branchId, prompt }),
        }),
    },

    deploy: {
      create: (versionId: string) =>
        apiFetch<{ deployed: any; deploymentId: string }>('/api/deploy', {
          method: 'POST',
          body: JSON.stringify({ versionId }),
        }),
      list: (chatId?: string) =>
        apiFetch<{ deployments: any[] }>(
          `/api/deploy${chatId ? `?chatId=${chatId}` : ''}`
        ),
    },

    diff: {
      compare: (sourceVersionId: string, targetVersionId: string) =>
        apiFetch<{
          diff: { added: any[]; removed: any[]; modified: any[] };
          sourceXml: string;
          targetXml: string;
        }>('/api/diff', {
          method: 'POST',
          body: JSON.stringify({ sourceVersionId, targetVersionId }),
        }),
    },

    users: {
      list: () => apiFetch<{ users: any[] }>('/api/users'),
      invite: (username: string, password: string, role: string) =>
        apiFetch<any>('/api/users', {
          method: 'POST',
          body: JSON.stringify({ username, password, role }),
        }),
      changeRole: (userId: string, role: string) =>
        apiFetch<any>('/api/users', {
          method: 'PATCH',
          body: JSON.stringify({ userId, role }),
        }),
    },

    audit: {
      list: (params?: { page?: number; limit?: number; action?: string; entityType?: string }) => {
        const query = new URLSearchParams();
        if (params?.page) query.set('page', String(params.page));
        if (params?.limit) query.set('limit', String(params.limit));
        if (params?.action) query.set('action', params.action);
        if (params?.entityType) query.set('entityType', params.entityType);
        return apiFetch<{ logs: any[]; pagination: any }>(
          `/api/audit?${query.toString()}`
        );
      },
    },
  };
}
