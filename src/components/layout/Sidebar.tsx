'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Role, ROLE_HIERARCHY } from '@/types';

export function Sidebar({ position = 'left' }: { position?: 'left' | 'right' }) {
  const { user } = useAuthStore();
  const api = useApi();
  const workspace = useWorkspaceStore();

  const versionsEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [showMerge, setShowMerge] = useState(false);
  const [mergeTarget, setMergeTarget] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [diffSource, setDiffSource] = useState('');
  const [diffTarget, setDiffTarget] = useState('');
  const [showRename, setShowRename] = useState(false);
  const [renameBranchId, setRenameBranchId] = useState('');
  const [renameName, setRenameName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const [deleteBranchConfirm, setDeleteBranchConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deletingBranch, setDeletingBranch] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadBranches = useCallback(async (chatId: string) => {
    try {
      const data = await api.branches.list(chatId);
      workspace.setBranches(data.branches as never[]);
    } catch {
      // silent
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadVersions = useCallback(async (branchId: string) => {
    try {
      const data = await api.versions.list(branchId);
      workspace.setVersions(data.versions as never[]);
    } catch {
      // silent
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (workspace.currentChatId) loadBranches(workspace.currentChatId);
  }, [workspace.currentChatId, loadBranches]);

  useEffect(() => {
    if (workspace.currentBranchId) loadVersions(workspace.currentBranchId);
  }, [workspace.currentBranchId, loadVersions]);

  // Auto-scroll to bottom when versions change
  useEffect(() => {
    if (versionsEndRef.current) {
      versionsEndRef.current.scrollTop = versionsEndRef.current.scrollHeight;
    }
  }, [workspace.versions]);

  const handleSelectBranch = async (branchId: string) => {
    workspace.setCurrentBranch(branchId);
    try {
      const data = await api.versions.list(branchId);
      workspace.setVersions(data.versions as never[]);
      const versions = data.versions as any[];
      if (versions.length > 0) {
        const lastVersion = versions[versions.length - 1];
        const vData = await api.versions.get(lastVersion._id);
        workspace.setCurrentVersion(lastVersion._id);
        workspace.setCurrentXml(vData.version.xml);
      } else {
        workspace.setCurrentXml(null);
      }
    } catch {
      // silent
    }
  };

  const handleSelectVersion = async (versionId: string) => {
    try {
      const data = await api.versions.get(versionId);
      workspace.setCurrentVersion(versionId);
      workspace.setCurrentXml(data.version.xml);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version');
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim() || !workspace.currentChatId) return;
    try {
      const headVersionId = workspace.branches.find(
        (b) => b._id === workspace.currentBranchId
      )?.headVersionId;
      const currentXml = workspace.currentXml;
      const data = await api.branches.create(
        workspace.currentChatId,
        newBranchName.trim(),
        headVersionId || undefined
      );
      setNewBranchName('');
      setShowNewBranch(false);
      await loadBranches(workspace.currentChatId);
      if (data.branch?._id) {
        workspace.setCurrentBranch(data.branch._id);
        workspace.setCurrentXml(currentXml);
        workspace.setVersions([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create branch');
    }
  };

  const handleRenameBranch = async () => {
    if (!renameBranchId || !renameName.trim()) return;
    try {
      await api.branches.rename(renameBranchId, renameName.trim());
      setShowRename(false);
      setRenameBranchId('');
      setRenameName('');
      if (workspace.currentChatId) await loadBranches(workspace.currentChatId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rename failed');
    }
  };

  const handleDeleteBranch = (branchId: string) => {
    const branch = workspace.branches.find((b) => b._id === branchId);
    if (!branch) return;
    if (branch.name === 'main') {
      setError('Cannot delete the main branch');
      return;
    }
    setDeleteBranchConfirm({ id: branchId, name: branch.name });
  };

  const confirmDeleteBranch = async () => {
    if (!deleteBranchConfirm) return;
    setDeletingBranch(true);
    try {
      await api.branches.delete(deleteBranchConfirm.id);
      if (workspace.currentBranchId === deleteBranchConfirm.id) {
        workspace.setCurrentBranch(null);
      }
      if (workspace.currentChatId) await loadBranches(workspace.currentChatId);
      setDeleteBranchConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setDeleteBranchConfirm(null);
    } finally {
      setDeletingBranch(false);
    }
  };

  const openRenameModal = (branchId: string, currentName: string) => {
    setRenameBranchId(branchId);
    setRenameName(currentName);
    setShowRename(true);
  };

  const handleMerge = async () => {
    if (!workspace.currentBranchId || !mergeTarget) return;
    try {
      await api.branches.merge(workspace.currentBranchId, mergeTarget);
      setShowMerge(false);
      setMergeTarget('');
      if (workspace.currentChatId) await loadBranches(workspace.currentChatId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Merge failed');
    }
  };

  const handleDiff = async () => {
    if (!diffSource || !diffTarget) return;
    try {
      const data = await api.diff.compare(diffSource, diffTarget);
      workspace.setDiffMode(true);
      workspace.setDiffResult(data.diff as never, data.sourceXml, data.targetXml);
      setShowDiff(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Diff failed');
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !workspace.currentChatId || !workspace.currentBranchId) return;
    workspace.setGenerating(true);
    setError('');
    try {
      const data = await api.ai.generate(prompt.trim());
      workspace.setCurrentXml(data.xml);
      setPrompt('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      if (workspace.currentBranchId) await loadVersions(workspace.currentBranchId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      workspace.setGenerating(false);
    }
  };

  const handleDeploy = async () => {
    if (!workspace.currentVersionId) return;
    workspace.setDeploying(true);
    setError('');
    try {
      await api.deploy.create(workspace.currentVersionId);
      setError('');
      setSuccessMessage('Deployed successfully to Flowable!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deployment failed');
    } finally {
      workspace.setDeploying(false);
    }
  };

  const canEdit = user && ROLE_HIERARCHY[user.role as Role] >= ROLE_HIERARCHY[Role.EDITOR];
  const canDeploy = user && ROLE_HIERARCHY[user.role as Role] >= ROLE_HIERARCHY[Role.ADMIN];

  return (
    <aside
      className={`flex flex-col h-full overflow-hidden ${position === 'right' ? 'border-l' : 'border-r'}`}
      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', width: '100%' }}
    >
      {/* Branches dropdown + Deploy */}
      {workspace.currentChatId && (
        <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 relative">
              <select
                value={workspace.currentBranchId || ''}
                onChange={(e) => handleSelectBranch(e.target.value)}
                className="w-full appearance-none pl-7 pr-8 py-1.5 rounded-lg border text-sm font-medium focus:outline-none focus:ring-1 truncate cursor-pointer"
                style={{
                  background: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              >
                {workspace.branches.map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name}{branch.isMerged ? ' (merged)' : ''}
                  </option>
                ))}
              </select>
              {/* Branch icon */}
              <svg className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {/* Chevron */}
              <svg className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {canEdit && (
              <div className="flex items-center shrink-0 gap-0.5">
                <button
                  onClick={() => setShowNewBranch(true)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-black/5"
                  style={{ color: 'var(--accent)' }}
                  title="New Branch"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                {workspace.currentBranchId && (
                  <>
                    <button
                      onClick={() => {
                        const b = workspace.branches.find((b) => b._id === workspace.currentBranchId);
                        if (b) openRenameModal(b._id, b.name);
                      }}
                      className="p-1.5 rounded-lg transition-colors hover:bg-black/5"
                      style={{ color: 'var(--text-muted)' }}
                      title="Rename Branch"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {workspace.branches.find((b) => b._id === workspace.currentBranchId)?.name !== 'main' && (
                      <button
                        onClick={() => workspace.currentBranchId && handleDeleteBranch(workspace.currentBranchId)}
                        className="p-1.5 rounded-lg transition-colors text-red-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete Branch"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          {workspace.currentBranchId && (
            <div className="flex gap-1.5 mt-2.5">
              {canEdit && (
                <>
                  <button
                    onClick={() => setShowMerge(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border hover:shadow-sm"
                    style={{
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#8b5cf6';
                      e.currentTarget.style.color = '#8b5cf6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                    Merge
                  </button>
                  <button
                    onClick={() => setShowDiff(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border hover:shadow-sm"
                    style={{
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.color = '#3b82f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H4a1 1 0 00-1 1v12a1 1 0 001 1h5M15 5h5a1 1 0 011 1v12a1 1 0 01-1 1h-5M12 3v18" />
                    </svg>
                    Diff
                  </button>
                </>
              )}
              {canDeploy && workspace.currentVersionId && (
                <button
                  onClick={handleDeploy}
                  disabled={workspace.isDeploying}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'var(--bg-secondary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    if (!workspace.isDeploying) {
                      e.currentTarget.style.borderColor = '#10b981';
                      e.currentTarget.style.color = '#10b981';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  {workspace.isDeploying ? (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                    </svg>
                  )}
                  Deploy
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Versions — chat-style thread */}
      {workspace.currentBranchId && (
        <div className="flex-1 flex flex-col min-h-0 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="px-3 pt-3 pb-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>History</h3>
          </div>
          <div ref={versionsEndRef} className="flex-1 overflow-y-auto px-3 pb-3">
            <div className="space-y-2">
              {workspace.versions.map((version) => {
                const isActive = workspace.currentVersionId === version._id;
                return (
                  <motion.button
                    key={version._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => handleSelectVersion(version._id)}
                    className="w-full text-left rounded-xl p-3 text-sm transition-all border"
                    style={{
                      background: isActive ? 'var(--card-active-bg)' : 'var(--card-bg)',
                      borderColor: isActive ? 'var(--card-active-border)' : 'var(--card-border)',
                    }}
                  >
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: isActive ? 'var(--accent-text)' : 'var(--text-primary)' }}
                    >
                      {version.prompt}
                    </p>
                    <div
                      className="flex items-center justify-between mt-2 pt-1.5 border-t"
                      style={{ borderColor: 'var(--card-border)' }}
                    >
                      <span
                        className="text-xs font-medium"
                        style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
                      >
                        v{version.versionNumber}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(version.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
            {workspace.versions.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <svg className="w-10 h-10 mb-2" style={{ color: 'var(--text-muted)', opacity: 0.4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Start a conversation.</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Use the prompt below to generate BPMN.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Prompt + Deploy */}
      {workspace.currentBranchId && (
        <div className="p-3 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          {canEdit && (
            <div className="mb-2">
              <div
                className="relative rounded-xl border transition-all"
                style={{
                  background: 'var(--input-bg)',
                  borderColor: prompt.trim() ? 'var(--accent)' : 'var(--input-border)',
                  boxShadow: prompt.trim() ? '0 0 0 1px var(--accent)' : 'none',
                }}
              >
                <textarea
                  ref={textareaRef}
                  placeholder={workspace.versions.length === 0
                    ? 'Describe your BPMN process to get started...'
                    : 'Describe changes to your process...'}
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    const ta = e.target;
                    ta.style.height = 'auto';
                    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  disabled={workspace.isGenerating}
                  rows={1}
                  className="w-full resize-none bg-transparent px-3 pt-3 pb-8 text-sm leading-relaxed focus:outline-none"
                  style={{
                    color: 'var(--text-primary)',
                    minHeight: '44px',
                    maxHeight: '160px',
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-1.5">
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {workspace.isGenerating ? '' : (
                      <span className="flex items-center gap-1.5">
                        <kbd className="px-1 py-0.5 rounded text-[9px] border" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>Enter</kbd>
                        send
                        <span style={{ color: 'var(--border)' }}>·</span>
                        <kbd className="px-1 py-0.5 rounded text-[9px] border" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>Shift+Enter</kbd>
                        new line
                      </span>
                    )}
                  </span>
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || workspace.isGenerating}
                    className="rounded-lg p-1.5 transition-all"
                    style={{
                      background: prompt.trim() && !workspace.isGenerating ? 'var(--accent)' : 'var(--border)',
                      color: prompt.trim() && !workspace.isGenerating ? '#ffffff' : 'var(--text-muted)',
                      cursor: prompt.trim() && !workspace.isGenerating ? 'pointer' : 'default',
                      opacity: workspace.isGenerating ? 0.6 : 1,
                    }}
                    title="Generate BPMN"
                  >
                    {workspace.isGenerating ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {workspace.isGenerating && (
                <div className="flex items-center gap-2 mt-2 px-1">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[11px] font-medium" style={{ color: 'var(--accent-text)' }}>
                    Generating BPMN...
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 border-t border-red-200">
          <p className="text-xs text-red-600">{error}</p>
          <button onClick={() => setError('')} className="text-xs text-red-400 hover:text-red-600 mt-1">
            Dismiss
          </button>
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={showNewBranch} onClose={() => setShowNewBranch(false)} title="New Branch">
        <Input
          label="Branch Name"
          value={newBranchName}
          onChange={(e) => setNewBranchName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
          placeholder="e.g. feature/add-approval"
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setShowNewBranch(false)}>Cancel</Button>
          <Button onClick={handleCreateBranch}>Create</Button>
        </div>
      </Modal>

      <Modal isOpen={showRename} onClose={() => setShowRename(false)} title="Rename Branch">
        <Input
          label="New Name"
          value={renameName}
          onChange={(e) => setRenameName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRenameBranch()}
          placeholder="e.g. feature/new-name"
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setShowRename(false)}>Cancel</Button>
          <Button onClick={handleRenameBranch} disabled={!renameName.trim()}>Rename</Button>
        </div>
      </Modal>

      <Modal isOpen={showMerge} onClose={() => setShowMerge(false)} title="Merge Branch">
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          Merge current branch into:
        </p>
        <select
          value={mergeTarget}
          onChange={(e) => setMergeTarget(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
          style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}
        >
          <option value="">Select target branch</option>
          {workspace.branches
            .filter((b) => b._id !== workspace.currentBranchId)
            .map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
        </select>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setShowMerge(false)}>Cancel</Button>
          <Button onClick={handleMerge} disabled={!mergeTarget}>Merge</Button>
        </div>
      </Modal>

      <Modal isOpen={showDiff} onClose={() => setShowDiff(false)} title="Compare Versions">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Source Version</label>
            <select
              value={diffSource}
              onChange={(e) => setDiffSource(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
              style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}
            >
              <option value="">Select version</option>
              {workspace.versions.map((v) => (
                <option key={v._id} value={v._id}>v{v.versionNumber} — {v.prompt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Target Version</label>
            <select
              value={diffTarget}
              onChange={(e) => setDiffTarget(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
              style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}
            >
              <option value="">Select version</option>
              {workspace.versions.map((v) => (
                <option key={v._id} value={v._id}>v{v.versionNumber} — {v.prompt}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setShowDiff(false)}>Cancel</Button>
          <Button onClick={handleDiff} disabled={!diffSource || !diffTarget}>Compare</Button>
        </div>
      </Modal>

      {/* Delete branch confirmation */}
      <Modal isOpen={!!deleteBranchConfirm} onClose={() => setDeleteBranchConfirm(null)} title="Delete Branch">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Are you sure you want to delete branch <strong style={{ color: 'var(--text-primary)' }}>&quot;{deleteBranchConfirm?.name}&quot;</strong>?
          All its versions will be permanently removed.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setDeleteBranchConfirm(null)} disabled={deletingBranch}>Cancel</Button>
          <Button variant="danger" onClick={confirmDeleteBranch} loading={deletingBranch}>Delete</Button>
        </div>
      </Modal>

      {/* Success message */}
      <Modal isOpen={!!successMessage} onClose={() => setSuccessMessage('')} title="Success">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: '#10b98120' }}>
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{successMessage}</p>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={() => setSuccessMessage('')}>OK</Button>
        </div>
      </Modal>
    </aside>
  );
}
