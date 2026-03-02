export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.OWNER]: 4,
  [Role.ADMIN]: 3,
  [Role.EDITOR]: 2,
  [Role.VIEWER]: 1,
};

export interface JWTPayload {
  userId: string;
  organizationId: string;
  role: Role;
  username: string;
}

export interface AuthenticatedRequest {
  userId: string;
  organizationId: string;
  role: Role;
  username: string;
}

export interface AIProvider {
  generateBpmnXML(input: {
    currentXml?: string;
    prompt: string;
  }): Promise<string>;
}

export interface AuditAction {
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export interface BranchInfo {
  _id: string;
  name: string;
  chatId: string;
  organizationId: string;
  baseVersionId?: string;
  headVersionId?: string;
  isMerged: boolean;
  createdAt: string;
}

export interface VersionInfo {
  _id: string;
  organizationId: string;
  userId: string;
  chatId: string;
  branchId: string;
  parentVersionId?: string;
  versionNumber: number;
  prompt: string;
  encryptedXml: string;
  iv: string;
  createdAt: string;
}

export interface ChatInfo {
  _id: string;
  organizationId: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiffResult {
  added: DiffElement[];
  removed: DiffElement[];
  modified: DiffElement[];
}

export interface DiffElement {
  id: string;
  type: string;
  name?: string;
}
