'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useApi } from '@/hooks/useApi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface DeploymentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function DeploymentsPanel({ isOpen, onClose }: DeploymentsPanelProps) {
  const api = useApi();
  const workspace = useWorkspaceStore();
  const [deployments, setDeployments] = useState<any[]>([]);

  const loadDeployments = useCallback(async () => {
    try {
      const data = await api.deploy.list(workspace.currentChatId || undefined);
      setDeployments(data.deployments);
    } catch {
      // silent
    }
  }, [workspace.currentChatId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) loadDeployments();
  }, [isOpen, loadDeployments]);

  const handleReopen = async (versionId: string) => {
    try {
      const data = await api.versions.get(versionId);
      workspace.setCurrentVersion(versionId);
      workspace.setCurrentXml(data.version.xml);
      onClose();
    } catch (err) {
      console.error('Failed to reopen version:', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Deployments">
      <div className="space-y-3">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {deployments.length} deployment{deployments.length !== 1 ? 's' : ''}
        </p>

        <div className="max-h-80 overflow-y-auto space-y-2">
          {deployments.map((dep: any) => (
            <div
              key={dep._id}
              className="p-3 rounded-lg border"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--card-border)' }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="green">Deployed</Badge>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    {dep.deploymentId}
                  </span>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(dep.deployedAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {dep.versionId && (
                <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Version {dep.versionId.versionNumber} — {dep.versionId.prompt}
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReopen(typeof dep.versionId === 'object' ? dep.versionId._id : dep.versionId)}
                className="text-xs"
              >
                Reopen &amp; Continue Editing
              </Button>
            </div>
          ))}
          {deployments.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No deployments yet</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
