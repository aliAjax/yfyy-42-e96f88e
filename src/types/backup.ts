import type { Complaint, TimeLimitRule, WorkTimeRule } from './complaint';
import type { ReplyTemplate } from './replyTemplate';
import type { OperationLog } from './operationLog';

export const BACKUP_VERSION = '1.3.0' as const;

export type BackupVersion = string;

export interface BackupMetadata {
  version: BackupVersion;
  createdAt: string;
  appName: string;
  dataSummary: BackupDataSummary;
}

export interface BackupDataSummary {
  complaintCount: number;
  templateCount: number;
  totalHandleRecords: number;
  totalEscalationRecords: number;
  timeLimitRuleCount: number;
  hasWorkTimeRule: boolean;
  operationLogCount: number;
}

export interface BackupDataV1 {
  complaints: Complaint[];
  replyTemplates: ReplyTemplate[];
  timeLimitRules?: TimeLimitRule[];
  workTimeRule?: WorkTimeRule;
  operationLogs?: OperationLog[];
}

export interface BackupFile {
  metadata: BackupMetadata;
  data: BackupDataV1;
}

export type ConflictResolution = 'overwrite' | 'keep_current' | 'merge';

export interface ConflictItem {
  id: string;
  type: 'complaint' | 'template';
  current: unknown;
  backup: unknown;
  resolution: ConflictResolution;
}

export interface DiffSummary {
  complaints: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
  templates: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  version: BackupVersion | null;
  errors: string[];
  warnings: string[];
}

export interface ImportPreviewResult {
  validation: ValidationResult;
  diff: DiffSummary;
  conflicts: ConflictItem[];
  backupData: BackupDataV1;
  currentData: {
    complaints: Complaint[];
    replyTemplates: ReplyTemplate[];
  };
}

export type ImportMode = 'overwrite_all' | 'merge_skip' | 'merge_overwrite';
