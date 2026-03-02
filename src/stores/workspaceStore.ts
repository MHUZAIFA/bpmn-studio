import { create } from 'zustand';
import { BranchInfo, VersionInfo, DiffResult } from '@/types';

interface WorkspaceState {
  currentChatId: string | null;
  currentBranchId: string | null;
  currentVersionId: string | null;
  currentXml: string | null;
  branches: BranchInfo[];
  versions: VersionInfo[];
  isDiffMode: boolean;
  diffResult: DiffResult | null;
  diffSourceXml: string | null;
  diffTargetXml: string | null;
  isGenerating: boolean;
  isDeploying: boolean;
  hasProcesses: boolean | null;
  onboardingMode: 'prompt' | 'canvas' | null;
  urlRestored: boolean;
  sidebarVisible: boolean;

  setHasProcesses: (has: boolean) => void;
  setOnboardingMode: (mode: 'prompt' | 'canvas' | null) => void;
  setUrlRestored: (restored: boolean) => void;
  setSidebarVisible: (visible: boolean) => void;
  toggleSidebar: () => void;
  setCurrentChat: (chatId: string | null) => void;
  setCurrentBranch: (branchId: string | null) => void;
  setCurrentVersion: (versionId: string | null) => void;
  setCurrentXml: (xml: string | null) => void;
  setBranches: (branches: BranchInfo[]) => void;
  setVersions: (versions: VersionInfo[]) => void;
  setDiffMode: (isDiff: boolean) => void;
  setDiffResult: (result: DiffResult | null, sourceXml?: string, targetXml?: string) => void;
  setGenerating: (generating: boolean) => void;
  setDeploying: (deploying: boolean) => void;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentChatId: null,
  currentBranchId: null,
  currentVersionId: null,
  currentXml: null,
  branches: [],
  versions: [],
  isDiffMode: false,
  diffResult: null,
  diffSourceXml: null,
  diffTargetXml: null,
  isGenerating: false,
  isDeploying: false,
  hasProcesses: null,
  onboardingMode: null,
  urlRestored: false,
  sidebarVisible: true,

  setHasProcesses: (has) => set({ hasProcesses: has }),
  setOnboardingMode: (mode) => set({ onboardingMode: mode }),
  setUrlRestored: (restored) => set({ urlRestored: restored }),
  setSidebarVisible: (visible) => set({ sidebarVisible: visible }),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  setCurrentChat: (chatId) =>
    set({
      currentChatId: chatId,
      currentBranchId: null,
      currentVersionId: null,
      currentXml: null,
      branches: [],
      versions: [],
      isDiffMode: false,
      diffResult: null,
      sidebarVisible: true,
    }),
  setCurrentBranch: (branchId) =>
    set({ currentBranchId: branchId, currentVersionId: null, isDiffMode: false, diffResult: null }),
  setCurrentVersion: (versionId) => set({ currentVersionId: versionId }),
  setCurrentXml: (xml) => set({ currentXml: xml }),
  setBranches: (branches) => set({ branches }),
  setVersions: (versions) => set({ versions }),
  setDiffMode: (isDiff) => set({ isDiffMode: isDiff, diffResult: isDiff ? undefined : null }),
  setDiffResult: (result, sourceXml, targetXml) =>
    set({ diffResult: result, diffSourceXml: sourceXml ?? null, diffTargetXml: targetXml ?? null }),
  setGenerating: (generating) => set({ isGenerating: generating }),
  setDeploying: (deploying) => set({ isDeploying: deploying }),
  reset: () =>
    set({
      currentChatId: null,
      currentBranchId: null,
      currentVersionId: null,
      currentXml: null,
      branches: [],
      versions: [],
      isDiffMode: false,
      diffResult: null,
      isGenerating: false,
      isDeploying: false,
      hasProcesses: null,
      onboardingMode: null,
      urlRestored: false,
    }),
}));
