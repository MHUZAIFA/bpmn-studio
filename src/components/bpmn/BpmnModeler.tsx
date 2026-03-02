'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Role, ROLE_HIERARCHY } from '@/types';
import { sanitizeBpmnNamespaces } from '@/lib/bpmn/sanitize';

const EMPTY_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="Process_1" isExecutable="true">
    <startEvent id="StartEvent_1" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_1" bpmnElement="StartEvent_1">
        <dc:Bounds x="180" y="160" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

/* eslint-disable @typescript-eslint/no-explicit-any */
export function BpmnModelerComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const diffContainerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<any>(null);
  const diffViewerRef = useRef<any>(null);
  const workspace = useWorkspaceStore();
  const { user } = useAuthStore();
  const api = useApi();
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { showFlowLabels, setShowFlowLabels, palettePosition } = usePreferencesStore();

  const [onboardingPrompt, setOnboardingPrompt] = useState('');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveProcessName, setSaveProcessName] = useState('');
  const [savingNewProcess, setSavingNewProcess] = useState(false);
  const [processList, setProcessList] = useState<Record<string, any>[]>([]);
  const [processSearch, setProcessSearch] = useState('');
  const [processesLoaded, setProcessesLoaded] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameId, setRenameId] = useState('');
  const [renameName, setRenameName] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateView, setTemplateView] = useState<'grid' | 'list'>('grid');
  const [templateCategory, setTemplateCategory] = useState('All');
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);
  const [processViewMode, setProcessViewMode] = useState<'list' | 'grid'>('list');
  const [processSortBy, setProcessSortBy] = useState<'updated' | 'name' | 'created'>('updated');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const canEdit = user && ROLE_HIERARCHY[user.role as Role] >= ROLE_HIERARCHY[Role.EDITOR];
  const canAdmin = user && ROLE_HIERARCHY[user.role as Role] >= ROLE_HIERARCHY[Role.ADMIN];
  const isReadOnly = workspace.isDiffMode || !canEdit;
  const hasProcess = !!workspace.currentChatId;
  const isOnboarding = workspace.onboardingMode !== null;

  const loadProcesses = useCallback(async () => {
    try {
      const data = await api.chats.list();
      setProcessList(data.chats);
      setProcessesLoaded(true);
      workspace.setHasProcesses(data.chats.length > 0);
    } catch { /* silent */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hasProcess && !isOnboarding) loadProcesses();
  }, [hasProcess, isOnboarding]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectProcess = async (chatId: string) => {
    workspace.setCurrentChat(chatId);
    try {
      const data = await api.branches.list(chatId);
      workspace.setBranches(data.branches as never[]);
      const mainBranch = data.branches.find((b: Record<string, any>) => b.name === 'main') || data.branches[0];
      if (mainBranch) {
        workspace.setCurrentBranch(mainBranch._id);
        const vData = await api.versions.list(mainBranch._id);
        workspace.setVersions(vData.versions as never[]);
        if (vData.versions.length > 0) {
          const lastVersion = vData.versions[vData.versions.length - 1];
          const versionDetail = await api.versions.get(lastVersion._id);
          workspace.setCurrentVersion(lastVersion._id);
          workspace.setCurrentXml(versionDetail.version.xml);
        }
      }
    } catch { /* silent */ }
  };

  const handleRenameProcess = async () => {
    if (!renameId || !renameName.trim()) return;
    try {
      await api.chats.rename(renameId, renameName.trim());
      setRenameModalOpen(false);
      setRenameId('');
      setRenameName('');
      await loadProcesses();
    } catch { /* silent */ }
  };

  const handleDeleteProcess = (chatId: string) => {
    setDeleteTargetId(chatId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteProcess = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await api.chats.delete(deleteTargetId);
      if (workspace.currentChatId === deleteTargetId) workspace.setCurrentChat(null);
      await loadProcesses();
    } catch { /* silent */ }
    setDeleting(false);
    setDeleteConfirmOpen(false);
    setDeleteTargetId('');
  };

  const centerDiagram = useCallback((viewer: any) => {
    try {
      const canvas = viewer.get('canvas');
      canvas.zoom('fit-viewport', 'auto');

      const pos = usePreferencesStore.getState().palettePosition;
      const paletteOffset = 80;
      const padding = 10;
      const vb = canvas.viewbox();
      const adjusted = { ...vb };

      const hPad = padding / vb.scale;
      const vPad = padding / vb.scale;
      const palPad = paletteOffset / vb.scale;

      adjusted.x -= (pos === 'left' ? palPad : hPad);
      adjusted.width += (pos === 'left' ? palPad : hPad) + (pos === 'right' ? palPad : hPad);
      adjusted.y -= (pos === 'top' ? palPad : vPad);
      adjusted.height += (pos === 'top' ? palPad : vPad) + (pos === 'bottom' ? palPad : vPad);

      canvas.viewbox(adjusted);
      setZoom(canvas.zoom());
    } catch {
      // ignore if canvas not ready
    }
  }, []);

  // Track whether the modeler is ready
  const modelerReadyRef = useRef(false);

  // Main modeler init
  useEffect(() => {
    if ((!hasProcess && workspace.onboardingMode !== 'canvas') || !containerRef.current || workspace.isDiffMode) return;

    let modeler: any;
    let cancelled = false;

    async function initModeler() {
      if (isReadOnly) {
        const NavigatedViewer = (await import('bpmn-js/lib/NavigatedViewer')).default;
        modeler = new NavigatedViewer({
          container: containerRef.current!,
        });
      } else {
        const Modeler = (await import('bpmn-js/lib/Modeler')).default;
        modeler = new Modeler({
          container: containerRef.current!,
        });
      }

      if (cancelled) { modeler.destroy(); return; }

      modelerRef.current = modeler;
      modelerReadyRef.current = true;

      const rawXml = useWorkspaceStore.getState().currentXml || EMPTY_BPMN;
      const xml = sanitizeBpmnNamespaces(rawXml);
      try {
        await modeler.importXML(xml);
        centerDiagram(modeler);
        requestAnimationFrame(() => {
          const labels = usePreferencesStore.getState().showFlowLabels;
          if (!labels) applyFlowLabelVisibility(false);
        });
      } catch (err) {
        console.error('Failed to import initial BPMN XML:', err);
      }

      modeler.on('canvas.viewbox.changed', () => {
        try {
          setZoom(modeler.get('canvas').zoom());
        } catch { /* ignore */ }
      });

      if (!isReadOnly) {
        modeler.on('commandStack.changed', () => {
          setHasChanges(true);
        });
      }
    }

    initModeler();

    return () => {
      cancelled = true;
      modelerReadyRef.current = false;
      if (modeler) modeler.destroy();
      modelerRef.current = null;
    };
  }, [hasProcess, isReadOnly, workspace.isDiffMode, workspace.onboardingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Import new XML when it changes
  useEffect(() => {
    if (!workspace.currentXml || workspace.isDiffMode) return;

    async function doImport() {
      // Wait for modeler to be ready (handles race with async init)
      let attempts = 0;
      while (!modelerReadyRef.current && attempts < 20) {
        await new Promise((r) => setTimeout(r, 100));
        attempts++;
      }
      if (!modelerRef.current) return;

      try {
        const safeXml = sanitizeBpmnNamespaces(workspace.currentXml!);
        await modelerRef.current.importXML(safeXml);
        centerDiagram(modelerRef.current);
        setHasChanges(false);
        requestAnimationFrame(() => {
          const labels = usePreferencesStore.getState().showFlowLabels;
          if (!labels) applyFlowLabelVisibility(false);
        });
      } catch (err) {
        console.error('Failed to render BPMN XML:', err);
        try { await modelerRef.current?.importXML(EMPTY_BPMN); } catch { /* ignore */ }
      }
    }

    doImport();
  }, [workspace.currentXml, workspace.isDiffMode]);

  // Diff mode — render two side-by-side viewers
  useEffect(() => {
    if (!workspace.isDiffMode || !workspace.diffSourceXml || !workspace.diffTargetXml) return;
    if (!containerRef.current || !diffContainerRef.current) return;

    let sourceViewer: any;
    let targetViewer: any;

    async function initDiff() {
      const NavigatedViewer = (await import('bpmn-js/lib/NavigatedViewer')).default;

      sourceViewer = new NavigatedViewer({ container: containerRef.current! });
      targetViewer = new NavigatedViewer({ container: diffContainerRef.current! });

      diffViewerRef.current = { source: sourceViewer, target: targetViewer };

      await sourceViewer.importXML(workspace.diffSourceXml!);
      centerDiagram(sourceViewer);

      await targetViewer.importXML(workspace.diffTargetXml!);
      centerDiagram(targetViewer);

      // Highlight diff elements
      if (workspace.diffResult) {
        const targetCanvas = targetViewer.get('canvas');
        const sourceCanvas = sourceViewer.get('canvas');

        workspace.diffResult.added.forEach((el) => {
          try { targetCanvas.addMarker(el.id, 'diff-added'); } catch { /* element not in diagram */ }
        });
        workspace.diffResult.removed.forEach((el) => {
          try { sourceCanvas.addMarker(el.id, 'diff-removed'); } catch { /* element not in diagram */ }
        });
        workspace.diffResult.modified.forEach((el) => {
          try { targetCanvas.addMarker(el.id, 'diff-modified'); } catch { /* element not in diagram */ }
          try { sourceCanvas.addMarker(el.id, 'diff-modified'); } catch { /* element not in diagram */ }
        });
      }
    }

    initDiff().catch(console.error);

    return () => {
      if (sourceViewer) sourceViewer.destroy();
      if (targetViewer) targetViewer.destroy();
      diffViewerRef.current = null;
    };
  }, [workspace.isDiffMode, workspace.diffSourceXml, workspace.diffTargetXml, workspace.diffResult]);

  useEffect(() => {
    if (!modelerRef.current) return;
    const timer = setTimeout(() => {
      if (modelerRef.current) {
        modelerRef.current.get('canvas').resized();
        centerDiagram(modelerRef.current);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [workspace.sidebarVisible]);

  const readCanvasZoom = () => {
    if (!modelerRef.current) return 1;
    try {
      return modelerRef.current.get('canvas').zoom();
    } catch { return 1; }
  };

  const handleZoomIn = () => {
    if (!modelerRef.current) return;
    const current = readCanvasZoom();
    const next = Math.min(current * 1.2, 5);
    modelerRef.current.get('canvas').zoom(next, { x: containerRef.current!.clientWidth / 2, y: containerRef.current!.clientHeight / 2 });
    setZoom(next);
  };

  const handleZoomOut = () => {
    if (!modelerRef.current) return;
    const current = readCanvasZoom();
    const next = Math.max(current / 1.2, 0.1);
    modelerRef.current.get('canvas').zoom(next, { x: containerRef.current!.clientWidth / 2, y: containerRef.current!.clientHeight / 2 });
    setZoom(next);
  };

  const handleFitView = () => {
    if (!modelerRef.current) return;
    centerDiagram(modelerRef.current);
    setZoom(readCanvasZoom());
  };

  const handleSave = useCallback(async () => {
    if (!modelerRef.current) return;
    if (isOnboarding) {
      setSaveModalOpen(true);
      return;
    }
    if (!workspace.currentChatId || !workspace.currentBranchId) return;
    setSaving(true);
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      await api.versions.save(xml, 'Manual edit');
      workspace.setCurrentXml(xml);
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  }, [workspace.currentChatId, workspace.currentBranchId, isOnboarding]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveNewProcess = async () => {
    if (!modelerRef.current || !saveProcessName.trim()) return;
    setSavingNewProcess(true);
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      const chatData = await api.chats.create(saveProcessName.trim());
      const chatId = chatData.chat._id;
      const branchData = await api.branches.list(chatId);
      const mainBranch = branchData.branches.find((b: Record<string, unknown>) => b.name === 'main') || branchData.branches[0];
      const branchId = mainBranch._id;

      await api.versions.saveToProcess(chatId, branchId, xml, 'Initial process');

      workspace.setOnboardingMode(null);
      workspace.setHasProcesses(true);
      workspace.setCurrentChat(chatId);
      workspace.setCurrentBranch(branchId);
      workspace.setCurrentXml(xml);

      const vData = await api.versions.list(branchId);
      workspace.setVersions(vData.versions as never[]);
      if (vData.versions.length > 0) {
        workspace.setCurrentVersion(vData.versions[vData.versions.length - 1]._id);
      }
      workspace.setBranches(branchData.branches as never[]);

      setSaveModalOpen(false);
      setSaveProcessName('');
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to save new process:', err);
    } finally {
      setSavingNewProcess(false);
    }
  };

  const handleOnboardingGenerate = async () => {
    if (!onboardingPrompt.trim() || !saveProcessName.trim()) return;
    setSavingNewProcess(true);
    try {
      const chatData = await api.chats.create(saveProcessName.trim());
      const chatId = chatData.chat._id;
      const branchData = await api.branches.list(chatId);
      const mainBranch = branchData.branches.find((b: Record<string, unknown>) => b.name === 'main') || branchData.branches[0];
      const branchId = mainBranch._id;

      const aiData = await api.ai.generateCustom(chatId, branchId, onboardingPrompt.trim());

      workspace.setOnboardingMode(null);
      workspace.setHasProcesses(true);
      workspace.setCurrentChat(chatId);
      workspace.setCurrentBranch(branchId);
      workspace.setCurrentXml(aiData.xml);

      const vData = await api.versions.list(branchId);
      workspace.setVersions(vData.versions as never[]);
      if (vData.versions.length > 0) {
        workspace.setCurrentVersion(vData.versions[vData.versions.length - 1]._id);
      }
      workspace.setBranches(branchData.branches as never[]);

      setSaveModalOpen(false);
      setSaveProcessName('');
      setOnboardingPrompt('');
    } catch (err) {
      console.error('Failed to generate new process:', err);
    } finally {
      setSavingNewProcess(false);
    }
  };

  const handleDownload = async () => {
    if (!modelerRef.current) return;
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'process.bpmn';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export BPMN:', err);
    }
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bpmn,.xml';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      workspace.setCurrentXml(text);
    };
    input.click();
  };

  const exitDiffMode = () => {
    workspace.setDiffMode(false);
    workspace.setDiffResult(null);
  };

  const applyFlowLabelVisibility = useCallback((visible: boolean) => {
    if (!modelerRef.current) return;
    try {
      const elementRegistry = modelerRef.current.get('elementRegistry');
      const canvas = modelerRef.current.get('canvas');
      elementRegistry.forEach((element: any) => {
        if (element.type === 'bpmn:SequenceFlow' && element.label) {
          const gfx = canvas.getGraphics(element.label);
          if (gfx) gfx.style.display = visible ? '' : 'none';
        }
        if (element.type === 'label' && element.labelTarget?.type === 'bpmn:SequenceFlow') {
          const gfx = canvas.getGraphics(element);
          if (gfx) gfx.style.display = visible ? '' : 'none';
        }
      });
    } catch {
      if (containerRef.current) {
        const svg = containerRef.current.querySelector('svg');
        if (svg) {
          svg.querySelectorAll('.djs-group').forEach((group) => {
            const el = group.closest('[data-element-id]') as HTMLElement | null;
            if (!el) return;
            const id = el.getAttribute('data-element-id') || '';
            if (id.endsWith('_label')) {
              (el as HTMLElement).style.display = visible ? '' : 'none';
            }
          });
        }
      }
    }
  }, []);

  const toggleSequenceFlowLabels = () => {
    const next = !showFlowLabels;
    setShowFlowLabels(next);
    applyFlowLabelVisibility(next);
  };

  if (!hasProcess && !isOnboarding) {
    const quickTemplates = [
      { label: 'Employee Onboarding', category: 'HR', icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z', prompt: 'Create an employee onboarding process with HR review, document collection, IT setup, manager assignment, training, and first-day orientation', color: '#6366f1' },
      { label: 'Approval Workflow', category: 'Operations', icon: 'M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z', prompt: 'Create a multi-level approval workflow with submission, manager review, director approval, and notification steps with rejection loops', color: '#10b981' },
      { label: 'Invoice Processing', category: 'Finance', icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z', prompt: 'Create an invoice processing workflow with invoice receipt, data extraction, validation, approval routing, payment scheduling, and reconciliation', color: '#f59e0b' },
      { label: 'Customer Support', category: 'Operations', icon: 'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155', prompt: 'Create a customer support ticket workflow with ticket creation, priority classification, agent assignment, investigation, customer update, resolution, and satisfaction survey', color: '#3b82f6' },
      { label: 'Leave Request', category: 'HR', icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5', prompt: 'Create a leave request process with employee submission, manager approval, HR validation, calendar update, and notification to team members with rejection and revision loops', color: '#8b5cf6' },
      { label: 'Procurement', category: 'Finance', icon: 'M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z', prompt: 'Create a procurement workflow with purchase request, budget check, vendor selection, quotation comparison, purchase order approval, goods receipt, and invoice matching', color: '#ec4899' },
      { label: 'HR Data Migration', category: 'IT', icon: 'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5', prompt: 'Create an HR system data migration workflow with source system connection, employee data extraction, data validation and cleansing, field mapping and transformation, conflict detection, target system loading, reconciliation report generation, and rollback on failure with error notification', color: '#14b8a6' },
      { label: 'HR Sync Integration', category: 'IT', icon: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182', prompt: 'Create a recurring HR data synchronization process between two HR systems with scheduled trigger, delta change detection from source system, data normalization, duplicate check, field-level merge rules with exclusive gateway for conflict resolution (auto-merge vs manual review), batch upsert to target system, sync status logging, and completion notification with error retry loop', color: '#0ea5e9' },
    ];

    const hasExistingProcesses = processesLoaded && processList.length > 0;

    if (!hasExistingProcesses) {
      return (
        <div className="flex-1 flex flex-col" style={{ background: 'var(--bg-canvas)' }}>
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-3xl">
              {/* Hero */}
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style={{ background: 'var(--accent)' }}>
                  <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="8" y="14" width="7" height="7" rx="1" />
                    <path d="M6.5 10v1.5a1 1 0 001 1H10m7.5-2.5v1.5a1 1 0 01-1 1H14m-2.5 2.5V12" />
                  </svg>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Create your first process
                </h1>
                <p className="text-base sm:text-lg max-w-lg mx-auto" style={{ color: 'var(--text-muted)' }}>
                  Describe a workflow in plain English and let AI generate a BPMN diagram, pick a template, or start from scratch.
                </p>
              </div>

              {/* Create options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => workspace.setOnboardingMode('prompt')}
                  className="group relative flex flex-col items-center text-center rounded-2xl border-2 p-6 sm:p-8 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                  style={{ background: 'var(--card-bg)', borderColor: 'var(--accent)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-light)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card-bg)'; }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110"
                    style={{ background: 'var(--accent)' }}
                  >
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM19.5 8.25l.313 1.097a2.25 2.25 0 001.59 1.59L22.5 11.25l-1.097.313a2.25 2.25 0 00-1.59 1.59L19.5 14.25l-.313-1.097a2.25 2.25 0 00-1.59-1.59L16.5 11.25l1.097-.313a2.25 2.25 0 001.59-1.59L19.5 8.25z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Generate with AI</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Describe your workflow in plain English
                  </p>
                  <div className="mt-3 px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>
                    Recommended
                  </div>
                </button>

                <button
                  onClick={() => { setTemplateModalOpen(true); setTemplateSearch(''); }}
                  className="group flex flex-col items-center text-center rounded-2xl border p-6 sm:p-8 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                  style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-light)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card-bg)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110"
                    style={{ background: 'var(--accent-light)' }}
                  >
                    <svg className="w-7 h-7" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Templates</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Start from pre-built process templates
                  </p>
                  <div className="mt-3 px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    {quickTemplates.length} templates
                  </div>
                </button>

                <button
                  onClick={() => workspace.setOnboardingMode('canvas')}
                  className="group flex flex-col items-center text-center rounded-2xl border p-6 sm:p-8 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                  style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-light)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card-bg)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110"
                    style={{ background: 'var(--accent-light)' }}
                  >
                    <svg className="w-7 h-7" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Blank Canvas</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Design your process from scratch
                  </p>
                  <div className="mt-3 px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    Drag & drop
                  </div>
                </button>
              </div>

              {/* Feature badges */}
              <div className="flex items-center justify-center gap-6 sm:gap-8 mt-10 flex-wrap">
                {[
                  { icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z', label: 'Encrypted storage' },
                  { icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'Git-like branching' },
                  { icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z', label: 'AI-powered' },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                    </svg>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Templates Modal */}
          <Modal
            isOpen={templateModalOpen}
            onClose={() => { setTemplateModalOpen(false); setTemplateSearch(''); setTemplateCategory('All'); setHoveredTemplate(null); }}
            title=""
            maxWidth="max-w-4xl"
          >
            {(() => {
              const categories = ['All', ...Array.from(new Set(quickTemplates.map((t) => t.category)))];
              const filtered = quickTemplates
              .filter((t) => templateCategory === 'All' || t.category === templateCategory)
              .filter((t) => {
                if (!templateSearch.trim()) return true;
                const q = templateSearch.trim().toLowerCase();
                return t.label.toLowerCase().includes(q) || t.prompt.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
              });
            const previewTemplate = hoveredTemplate ? quickTemplates.find((t) => t.label === hoveredTemplate) : null;

            return (
              <div className="-mt-2">
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-light)' }}>
                    <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Template Gallery</h2>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Choose a template to get started quickly</p>
                  </div>
                </div>

                {/* Search + Category tabs + View toggle */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search by name, description, or category..."
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2.5 rounded-xl border text-sm focus:outline-none transition-all"
                        style={{
                          background: 'var(--input-bg)',
                          borderColor: templateSearch ? 'var(--accent)' : 'var(--input-border)',
                          color: 'var(--text-primary)',
                          boxShadow: templateSearch ? '0 0 0 1px var(--accent)' : 'none',
                        }}
                        autoFocus
                      />
                      {templateSearch && (
                        <button
                          onClick={() => setTemplateSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="flex rounded-xl border overflow-hidden shrink-0" style={{ borderColor: 'var(--border)' }}>
                      <button
                        onClick={() => setTemplateView('grid')}
                        className="p-2.5 transition-colors"
                        style={{
                          background: templateView === 'grid' ? 'var(--accent)' : 'var(--bg-secondary)',
                          color: templateView === 'grid' ? '#fff' : 'var(--text-muted)',
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setTemplateView('list')}
                        className="p-2.5 transition-colors"
                        style={{
                          background: templateView === 'list' ? 'var(--accent)' : 'var(--bg-secondary)',
                          color: templateView === 'list' ? '#fff' : 'var(--text-muted)',
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Category pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {categories.map((cat) => {
                      const isActive = templateCategory === cat;
                      const count = cat === 'All' ? quickTemplates.length : quickTemplates.filter((t) => t.category === cat).length;
                      return (
                        <button
                          key={cat}
                          onClick={() => setTemplateCategory(cat)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border"
                          style={{
                            background: isActive ? 'var(--accent)' : 'var(--bg-secondary)',
                            color: isActive ? '#fff' : 'var(--text-secondary)',
                            borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                          }}
                        >
                          {cat} <span className="opacity-60 ml-0.5">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Template content */}
                {filtered.length === 0 ? (
                  <div className="text-center py-16 rounded-xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
                    <svg className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No templates found</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Try adjusting your search or category filter</p>
                  </div>
                ) : templateView === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-hidden">
                    {filtered.map((t) => (
                      <button
                        key={t.label}
                        onClick={() => {
                          setOnboardingPrompt(t.prompt);
                          setSaveProcessName(t.label);
                          setTemplateModalOpen(false);
                          workspace.setOnboardingMode('prompt');
                        }}
                        onMouseEnter={() => setHoveredTemplate(t.label)}
                        onMouseLeave={() => setHoveredTemplate(null)}
                        className="group relative flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all duration-200 hover:shadow-md"
                        style={{
                          background: hoveredTemplate === t.label ? 'var(--accent-light)' : 'var(--card-bg)',
                          borderColor: hoveredTemplate === t.label ? t.color : 'var(--border)',
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                          style={{ background: `${t.color}18` }}
                        >
                          <svg className="w-5 h-5" style={{ color: t.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.label}</h4>
                          </div>
                          <span
                            className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mb-1.5"
                            style={{ background: `${t.color}18`, color: t.color }}
                          >
                            {t.category}
                          </span>
                          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>{t.prompt}</p>
                        </div>
                        <div className="absolute top-3 right-3 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ background: t.color, color: '#fff' }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto pr-1 scrollbar-hidden">
                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                      {filtered.map((t, i) => (
                        <button
                          key={t.label}
                          onClick={() => {
                            setOnboardingPrompt(t.prompt);
                            setSaveProcessName(t.label);
                            setTemplateModalOpen(false);
                            workspace.setOnboardingMode('prompt');
                          }}
                          onMouseEnter={() => setHoveredTemplate(t.label)}
                          onMouseLeave={() => setHoveredTemplate(null)}
                          className="group w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150"
                          style={{
                            background: hoveredTemplate === t.label ? 'var(--accent-light)' : 'transparent',
                            borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                          }}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `${t.color}18` }}
                          >
                            <svg className="w-4 h-4" style={{ color: t.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.label}</h4>
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0"
                                style={{ background: `${t.color}18`, color: t.color }}
                              >
                                {t.category}
                              </span>
                            </div>
                            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.prompt}</p>
                          </div>
                          <svg className="w-4 h-4 shrink-0 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-70 group-hover:translate-x-0" style={{ color: t.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Showing {filtered.length} of {quickTemplates.length} templates
                  </p>
                  {/* Preview tooltip */}
                  {previewTemplate && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: previewTemplate.color }} />
                      <p className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Click to use &ldquo;{previewTemplate.label}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          </Modal>
        </div>
      );
    }

    // Has existing processes — dashboard layout
    const sorted = [...processList].sort((a, b) => {
      if (processSortBy === 'name') return (a.name as string).localeCompare(b.name as string);
      if (processSortBy === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
    const filtered = processSearch.trim()
      ? sorted.filter((p) => (p.name as string).toLowerCase().includes(processSearch.trim().toLowerCase()))
      : sorted;

    const greeting = (() => {
      const h = new Date().getHours();
      if (h < 12) return 'Good morning';
      if (h < 18) return 'Good afternoon';
      return 'Good evening';
    })();

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
      if (days < 30) return `${Math.floor(days / 7)}w ago`;
      return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const recentCount = processList.filter(p => Date.now() - new Date(p.updatedAt || p.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000).length;

    const processIcon = 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z';

    return (
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-canvas)' }}>
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2.5" style={{ color: 'var(--text-primary)' }}>
                  {greeting}, {user?.username}
                </h1>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    {processList.length} process{processList.length !== 1 ? 'es' : ''}
                  </span>
                  {recentCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {recentCount} active this week
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => workspace.setOnboardingMode('canvas')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 hover:shadow-sm"
                  style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Blank
                </button>
                <button
                  onClick={() => { setTemplateModalOpen(true); setTemplateSearch(''); }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 hover:shadow-sm"
                  style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  Templates
                </button>
                <button
                  onClick={() => workspace.setOnboardingMode('prompt')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 shadow-sm hover:shadow-md hover:brightness-110"
                  style={{ background: 'var(--accent)' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  New with AI
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px mb-6" style={{ background: 'var(--border)' }} />

            {/* Toolbar: search + sort + view toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
              <div className="relative flex-1 sm:max-w-sm">
                <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search processes..."
                  value={processSearch}
                  onChange={(e) => setProcessSearch(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ background: 'var(--input-bg)', borderColor: processSearch ? 'var(--accent)' : 'var(--input-border)', color: 'var(--text-primary)', boxShadow: processSearch ? '0 0 0 1px var(--accent)' : 'none' }}
                />
                {processSearch && (
                  <button onClick={() => setProcessSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded" style={{ color: 'var(--text-muted)' }}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 sm:ml-auto">
                {/* Sort dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all cursor-pointer"
                    style={{ background: 'var(--card-bg)', borderColor: sortDropdownOpen ? 'var(--accent)' : 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    <svg className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                    </svg>
                    {{ updated: 'Last updated', name: 'Name', created: 'Date created' }[processSortBy]}
                    <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${sortDropdownOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {sortDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setSortDropdownOpen(false)} />
                      <div className="absolute right-0 mt-1.5 w-44 rounded-xl border shadow-lg z-20 py-1 overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
                        {([['updated', 'Last updated'], ['name', 'Name'], ['created', 'Date created']] as const).map(([value, label]) => (
                          <button
                            key={value}
                            onClick={() => { setProcessSortBy(value); setSortDropdownOpen(false); }}
                            className="w-full text-left px-3.5 py-2 text-sm transition-colors flex items-center justify-between"
                            style={{ color: processSortBy === value ? 'var(--accent)' : 'var(--text-secondary)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-light)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            {label}
                            {processSortBy === value && (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* View toggle */}
                <div className="flex rounded-xl border overflow-hidden shrink-0" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={() => setProcessViewMode('list')}
                    className="p-2 transition-colors"
                    title="List view"
                    style={{
                      background: processViewMode === 'list' ? 'var(--accent)' : 'var(--card-bg)',
                      color: processViewMode === 'list' ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setProcessViewMode('grid')}
                    className="p-2 transition-colors"
                    title="Grid view"
                    style={{
                      background: processViewMode === 'grid' ? 'var(--accent)' : 'var(--card-bg)',
                      color: processViewMode === 'grid' ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Section header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {processSearch.trim() ? 'Results' : 'All Processes'}
                </h2>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md tabular-nums" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  {filtered.length}
                </span>
                {processSearch.trim() && filtered.length > 0 && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    for &ldquo;{processSearch}&rdquo;
                  </span>
                )}
              </div>
            </div>

            {/* List view */}
            {processViewMode === 'list' ? (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                {/* Column headers */}
                <div className="flex items-center px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider select-none" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                  <div className="flex-1 min-w-0 pl-12">Name</div>
                  <div className="w-32 text-right hidden sm:block">Modified</div>
                  <div className="w-24 text-center shrink-0">Actions</div>
                </div>
                {filtered.map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center transition-colors duration-150"
                    style={{ background: 'var(--card-bg)', borderTop: '1px solid var(--border)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-light)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card-bg)'; }}
                  >
                    <button onClick={() => handleSelectProcess(p._id)} className="flex-1 flex items-center gap-3 px-4 py-3.5 text-left min-w-0">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-light)' }}>
                        <svg className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={processIcon} />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.name as string}</p>
                        <p className="text-[11px] mt-0.5 sm:hidden" style={{ color: 'var(--text-muted)' }}>
                          {relativeTime(p.updatedAt || p.createdAt)}
                        </p>
                      </div>
                      <span className="text-xs shrink-0 hidden sm:block w-32 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {relativeTime(p.updatedAt || p.createdAt)}
                      </span>
                    </button>
                    <div className="flex items-center gap-1 w-24 justify-center shrink-0">
                      {canEdit && (
                        <button onClick={() => { setRenameId(p._id); setRenameName(p.name); setRenameModalOpen(true); }} className="p-1.5 rounded-lg transition-colors hover:bg-black/5" style={{ color: 'var(--text-muted)' }} title="Rename">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                      )}
                      {canAdmin && (
                        <button onClick={() => handleDeleteProcess(p._id)} className="p-1.5 rounded-lg transition-colors text-red-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Grid view */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((p) => {
                  const isRecent = Date.now() - new Date(p.updatedAt || p.createdAt).getTime() < 24 * 60 * 60 * 1000;
                  return (
                    <div
                      key={p._id}
                      className="relative rounded-xl border overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                      style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                    >
                      {/* Accent top strip */}
                      <div className="h-1" style={{ background: 'var(--accent)', opacity: 0.6 }} />
                      <button onClick={() => handleSelectProcess(p._id)} className="w-full text-left p-4 pb-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-light)' }}>
                            <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d={processIcon} />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.name as string}</p>
                              {isRecent && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'var(--accent)', color: '#fff' }}>New</span>
                              )}
                            </div>
                            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                              Modified {relativeTime(p.updatedAt || p.createdAt)}
                            </p>
                          </div>
                        </div>
                      </button>
                      {/* Card footer with actions */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                        <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                          Created {new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <button onClick={() => { setRenameId(p._id); setRenameName(p.name); setRenameModalOpen(true); }} className="p-1 rounded-md transition-colors hover:bg-black/5" style={{ color: 'var(--text-muted)' }} title="Rename">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                            </button>
                          )}
                          {canAdmin && (
                            <button onClick={() => handleDeleteProcess(p._id)} className="p-1 rounded-md transition-colors text-red-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {filtered.length === 0 && processSearch.trim() && (
              <div className="text-center py-20 rounded-xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
                  <svg className="w-7 h-7" style={{ color: 'var(--text-muted)', opacity: 0.5 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No results found</p>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  No processes matching &ldquo;{processSearch}&rdquo;
                </p>
                <button
                  onClick={() => setProcessSearch('')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-light)'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear search
                </button>
              </div>
            )}
          </div>
        </div>

        <Modal isOpen={renameModalOpen} onClose={() => setRenameModalOpen(false)} title="Rename Process">
          <Input label="Process Name" value={renameName} onChange={(e) => setRenameName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && renameName.trim() && handleRenameProcess()} placeholder="e.g. Order Fulfillment" autoFocus />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setRenameModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRenameProcess} disabled={!renameName.trim()}>Rename</Button>
          </div>
        </Modal>

        <Modal isOpen={deleteConfirmOpen} onClose={() => { if (!deleting) { setDeleteConfirmOpen(false); setDeleteTargetId(''); } }} title="Delete Process">
          <div className="flex flex-col gap-2 py-2">
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Are you sure you want to delete <strong>{processList.find((p) => p._id === deleteTargetId)?.name}</strong>?</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>All branches, versions, and deployments will be permanently removed. This action cannot be undone.</p>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => { setDeleteConfirmOpen(false); setDeleteTargetId(''); }} disabled={deleting}>Cancel</Button>
            <button onClick={confirmDeleteProcess} disabled={deleting} className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors" style={{ background: deleting ? '#f87171' : '#ef4444' }}>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>

        {/* Templates Modal */}
        <Modal
          isOpen={templateModalOpen}
          onClose={() => { setTemplateModalOpen(false); setTemplateSearch(''); setTemplateCategory('All'); setHoveredTemplate(null); }}
          title=""
          maxWidth="max-w-4xl"
        >
          {(() => {
            const categories = ['All', ...Array.from(new Set(quickTemplates.map((t) => t.category)))];
            const tFiltered = quickTemplates
              .filter((t) => templateCategory === 'All' || t.category === templateCategory)
              .filter((t) => {
                if (!templateSearch.trim()) return true;
                const q = templateSearch.trim().toLowerCase();
                return t.label.toLowerCase().includes(q) || t.prompt.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
              });
            const previewTemplate = hoveredTemplate ? quickTemplates.find((t) => t.label === hoveredTemplate) : null;

            return (
              <div className="-mt-2">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-light)' }}>
                    <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Template Gallery</h2>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Choose a template to get started quickly</p>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                      <input type="text" placeholder="Search by name, description, or category..." value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2.5 rounded-xl border text-sm focus:outline-none transition-all"
                        style={{ background: 'var(--input-bg)', borderColor: templateSearch ? 'var(--accent)' : 'var(--input-border)', color: 'var(--text-primary)', boxShadow: templateSearch ? '0 0 0 1px var(--accent)' : 'none' }}
                        autoFocus
                      />
                      {templateSearch && (
                        <button onClick={() => setTemplateSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors" style={{ color: 'var(--text-muted)' }}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                    <div className="flex rounded-xl border overflow-hidden shrink-0" style={{ borderColor: 'var(--border)' }}>
                      <button onClick={() => setTemplateView('grid')} className="p-2.5 transition-colors" style={{ background: templateView === 'grid' ? 'var(--accent)' : 'var(--bg-secondary)', color: templateView === 'grid' ? '#fff' : 'var(--text-muted)' }}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
                      </button>
                      <button onClick={() => setTemplateView('list')} className="p-2.5 transition-colors" style={{ background: templateView === 'list' ? 'var(--accent)' : 'var(--bg-secondary)', color: templateView === 'list' ? '#fff' : 'var(--text-muted)' }}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {categories.map((cat) => {
                      const isActive = templateCategory === cat;
                      const count = cat === 'All' ? quickTemplates.length : quickTemplates.filter((t) => t.category === cat).length;
                      return (
                        <button key={cat} onClick={() => setTemplateCategory(cat)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border"
                          style={{ background: isActive ? 'var(--accent)' : 'var(--bg-secondary)', color: isActive ? '#fff' : 'var(--text-secondary)', borderColor: isActive ? 'var(--accent)' : 'var(--border)' }}>
                          {cat} <span className="opacity-60 ml-0.5">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {tFiltered.length === 0 ? (
                  <div className="text-center py-16 rounded-xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
                    <svg className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No templates found</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Try adjusting your search or category filter</p>
                  </div>
                ) : templateView === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-hidden">
                    {tFiltered.map((t) => (
                      <button key={t.label} onClick={() => { setOnboardingPrompt(t.prompt); setSaveProcessName(t.label); setTemplateModalOpen(false); workspace.setOnboardingMode('prompt'); }}
                        onMouseEnter={() => setHoveredTemplate(t.label)} onMouseLeave={() => setHoveredTemplate(null)}
                        className="group relative flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all duration-200 hover:shadow-md"
                        style={{ background: hoveredTemplate === t.label ? 'var(--accent-light)' : 'var(--card-bg)', borderColor: hoveredTemplate === t.label ? t.color : 'var(--border)' }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110" style={{ background: `${t.color}18` }}>
                          <svg className="w-5 h-5" style={{ color: t.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={t.icon} /></svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{t.label}</h4>
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mb-1.5" style={{ background: `${t.color}18`, color: t.color }}>{t.category}</span>
                          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>{t.prompt}</p>
                        </div>
                        <div className="absolute top-3 right-3 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: t.color, color: '#fff' }}>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto pr-1 scrollbar-hidden">
                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                      {tFiltered.map((t, i) => (
                        <button key={t.label} onClick={() => { setOnboardingPrompt(t.prompt); setSaveProcessName(t.label); setTemplateModalOpen(false); workspace.setOnboardingMode('prompt'); }}
                          onMouseEnter={() => setHoveredTemplate(t.label)} onMouseLeave={() => setHoveredTemplate(null)}
                          className="group w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150"
                          style={{ background: hoveredTemplate === t.label ? 'var(--accent-light)' : 'transparent', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${t.color}18` }}>
                            <svg className="w-4 h-4" style={{ color: t.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={t.icon} /></svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.label}</h4>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0" style={{ background: `${t.color}18`, color: t.color }}>{t.category}</span>
                            </div>
                            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.prompt}</p>
                          </div>
                          <svg className="w-4 h-4 shrink-0 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-70 group-hover:translate-x-0" style={{ color: t.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Showing {tFiltered.length} of {quickTemplates.length} templates</p>
                  {previewTemplate && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: previewTemplate.color }} />
                      <p className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>Click to use &ldquo;{previewTemplate.label}&rdquo;</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </Modal>
      </div>
    );
  }

  if (isOnboarding && workspace.onboardingMode === 'prompt') {
    const isFormReady = saveProcessName.trim() && onboardingPrompt.trim();
    return (
      <div className="flex-1 flex overflow-y-auto" style={{ background: 'var(--bg-canvas)' }}>
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-8 py-6 sm:py-12">
          {/* Back */}
          <button
            onClick={() => { workspace.setOnboardingMode(null); setOnboardingPrompt(''); setSaveProcessName(''); }}
            className="flex items-center gap-1.5 text-sm mb-8 transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to start
          </button>

          {/* Header */}
          <div className="flex items-start gap-4 mb-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-light)' }}
            >
              <svg className="w-6 h-6" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Generate with AI</h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Name your process and describe the workflow. AI will generate a complete BPMN diagram.
              </p>
            </div>
          </div>

          {/* Form */}
          <div
            className="rounded-2xl border p-6 space-y-5"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
          >
            {/* Step 1 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >1</span>
                <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Process Name</label>
              </div>
              <input
                placeholder="e.g. Order Fulfillment, Employee Onboarding"
                value={saveProcessName}
                onChange={(e) => setSaveProcessName(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors"
                style={{
                  background: 'var(--input-bg)',
                  borderColor: saveProcessName.trim() ? 'var(--accent)' : 'var(--input-border)',
                  color: 'var(--text-primary)',
                  boxShadow: saveProcessName.trim() ? '0 0 0 1px var(--accent)' : 'none',
                }}
                autoFocus
                disabled={savingNewProcess}
              />
            </div>

            {/* Step 2 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: saveProcessName.trim() ? 'var(--accent)' : 'var(--text-muted)', color: '#fff' }}
                >2</span>
                <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Describe Your Workflow</label>
              </div>
              <div
                className="rounded-xl border transition-all overflow-hidden"
                style={{
                  background: 'var(--input-bg)',
                  borderColor: onboardingPrompt.trim() ? 'var(--accent)' : 'var(--input-border)',
                  boxShadow: onboardingPrompt.trim() ? '0 0 0 1px var(--accent)' : 'none',
                }}
              >
                <textarea
                  placeholder="Describe the steps, roles, decisions, and flow of your business process..."
                  value={onboardingPrompt}
                  onChange={(e) => setOnboardingPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && isFormReady && !savingNewProcess) {
                      e.preventDefault();
                      handleOnboardingGenerate();
                    }
                  }}
                  rows={5}
                  className="w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed focus:outline-none"
                  style={{ color: 'var(--text-primary)' }}
                  disabled={savingNewProcess}
                />
                <div className="flex items-center justify-between px-4 py-2 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <kbd className="px-1 py-0.5 rounded text-[9px] border mr-1" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>Enter</kbd>
                    generate
                    <span className="mx-1">·</span>
                    <kbd className="px-1 py-0.5 rounded text-[9px] border mr-1" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>Shift+Enter</kbd>
                    new line
                  </span>
                  <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {onboardingPrompt.length} chars
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <Button
                variant="secondary"
                onClick={() => { workspace.setOnboardingMode(null); setOnboardingPrompt(''); setSaveProcessName(''); }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleOnboardingGenerate}
                loading={savingNewProcess}
                disabled={!isFormReady}
                className="flex-1"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Generate Process
              </Button>
            </div>
          </div>

          {/* Generating indicator */}
          {savingNewProcess && (
            <div
              className="mt-6 rounded-xl border p-4 flex items-center gap-4"
              style={{ background: 'var(--accent-light)', borderColor: 'var(--accent)' }}
            >
              <svg className="animate-spin h-5 w-5 shrink-0" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--accent-text)' }}>Generating your BPMN process...</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>This usually takes 5-15 seconds. AI is structuring tasks, gateways, and flows.</p>
              </div>
            </div>
          )}

          {/* Tips */}
          {!savingNewProcess && (
            <div className="mt-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Tips for better results</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { title: 'Be specific', desc: 'Mention roles, conditions, and parallel paths' },
                  { title: 'Name your steps', desc: 'Use clear task names like "Review Application"' },
                  { title: 'Include decisions', desc: 'Describe branching logic with if/else conditions' },
                ].map((tip) => (
                  <div
                    key={tip.title}
                    className="rounded-lg border p-3"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                  >
                    <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{tip.title}</p>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{tip.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative" style={{ background: 'var(--bg-canvas)' }}>
      {/* Toolbar */}
      <div
        className="h-10 flex items-center justify-between px-3 border-b"
        style={{ background: 'var(--header-bg)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isOnboarding) {
                workspace.setOnboardingMode(null);
              } else {
                workspace.setCurrentChat(null);
              }
            }}
            title={isOnboarding ? 'Back' : 'All Processes'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </Button>
          {hasProcess && !isOnboarding && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => workspace.toggleSidebar()}
              title={workspace.sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {workspace.sidebarVisible ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M3 4v16m0-16h6m12 0v16M9 4v16m-6 0h18M9 20h12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18v16H3V4zm6 0v16" />
                )}
              </svg>
            </Button>
          )}
          {workspace.isDiffMode && (
            <>
              <div className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />
              <div className="flex items-center gap-2">
                <Badge variant="blue">Diff</Badge>
                <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-muted)' }}>Source (left) vs Target (right)</span>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!workspace.isDiffMode && (
            <>
              <Button variant="ghost" size="sm" onClick={handleZoomIn} title="Zoom In">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleZoomOut} title="Zoom Out">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleFitView} title="Fit View">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </Button>
              <span className="text-xs ml-2 hidden sm:inline" style={{ color: 'var(--text-muted)' }}>{Math.round(zoom * 100)}%</span>
              <div className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSequenceFlowLabels}
                title={showFlowLabels ? 'Hide Flow Labels' : 'Show Flow Labels'}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {!showFlowLabels && (
                  <svg className="w-4 h-4 absolute" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-muted)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 20L20 4" />
                  </svg>
                )}
              </Button>
              <div className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />
              {canEdit && (
                <Button variant="ghost" size="sm" onClick={handleUpload} title="Upload BPMN">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleDownload} title="Download BPMN">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </Button>
              {canEdit && hasChanges && (workspace.currentBranchId || isOnboarding) && (
                <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
                  Save
                </Button>
              )}
            </>
          )}
          {workspace.isDiffMode && (
            <Button variant="secondary" size="sm" onClick={exitDiffMode}>
              Exit Diff
            </Button>
          )}
        </div>
      </div>

      {/* Main content area */}
      {workspace.isDiffMode ? (
        <div className="flex-1 flex">
          {/* Source (left) */}
          <div className="flex-1 relative border-r" style={{ borderColor: 'var(--border)' }}>
            <div className="absolute top-2 left-2 z-10">
              <Badge variant="gray">Source</Badge>
            </div>
            <div ref={containerRef} className="w-full h-full" />
          </div>
          {/* Target (right) */}
          <div className="flex-1 relative">
            <div className="absolute top-2 left-2 z-10">
              <Badge variant="blue">Target</Badge>
            </div>
            <div ref={diffContainerRef} className="w-full h-full" />
          </div>
        </div>
      ) : (
        <div ref={containerRef} className={`flex-1 palette-${palettePosition}`} />
      )}

      {/* Diff summary overlay */}
      {workspace.isDiffMode && workspace.diffResult && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-lg shadow-lg border p-3 flex items-center gap-4"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{workspace.diffResult.added.length} Added</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{workspace.diffResult.removed.length} Removed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{workspace.diffResult.modified.length} Modified</span>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {workspace.isGenerating && (
        <div className="absolute inset-0 flex items-center justify-center z-20" style={{ background: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)' }}>
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8" style={{ color: 'var(--accent)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Generating BPMN with AI...</p>
          </div>
        </div>
      )}

      {/* Read-only indicator */}
      {isReadOnly && !workspace.isDiffMode && workspace.currentXml && (
        <div className="absolute top-12 right-4 z-10">
          <Badge variant="gray">Read Only</Badge>
        </div>
      )}

      {/* Save new process modal (onboarding canvas mode) */}
      <Modal isOpen={saveModalOpen} onClose={() => setSaveModalOpen(false)} title="Save as New Process">
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Name your process. It will be saved to the main branch as the initial version.
        </p>
        <Input
          label="Process Name"
          placeholder="e.g. Order Fulfillment"
          value={saveProcessName}
          onChange={(e) => setSaveProcessName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && saveProcessName.trim() && handleSaveNewProcess()}
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setSaveModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveNewProcess} loading={savingNewProcess} disabled={!saveProcessName.trim()}>
            Create & Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}
