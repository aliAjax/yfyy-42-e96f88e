import type { Complaint } from '@/types/complaint';
import type { ReplyTemplate } from '@/types/replyTemplate';
import type { TimeLimitRule } from '@/types/complaint';
import {
  BACKUP_VERSION,
  type BackupFile,
  type BackupDataV1,
  type BackupVersion,
  type ValidationResult,
  type DiffSummary,
  type ConflictItem,
  type ImportMode,
  type ImportPreviewResult,
} from '@/types/backup';
import { migrateComplaintData } from './helpers';
import { getTimeLimitRules, saveTimeLimitRules } from './overdue';

const COMPLAINT_STORAGE_KEY = 'complaint_records';
const TEMPLATE_STORAGE_KEY = 'reply_templates';
const APP_NAME = '投诉建议登记系统';

function getCurrentComplaints(): Complaint[] {
  try {
    const stored = localStorage.getItem(COMPLAINT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return migrateComplaintData(parsed);
    }
  } catch (e) {
    console.error('Failed to load complaints from localStorage:', e);
  }
  return [];
}

function getCurrentTemplates(): ReplyTemplate[] {
  try {
    const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load templates from localStorage:', e);
  }
  return [];
}

function getCurrentTimeLimitRules(): TimeLimitRule[] {
  return getTimeLimitRules();
}

function getDataSummary(data: BackupDataV1) {
  const totalHandleRecords = data.complaints.reduce(
    (sum, c) => sum + (c.handleRecords?.length || 0),
    0
  );
  const totalEscalationRecords = data.complaints.reduce(
    (sum, c) => sum + (c.escalationRecords?.length || 0),
    0
  );

  return {
    complaintCount: data.complaints.length,
    templateCount: data.replyTemplates.length,
    totalHandleRecords,
    totalEscalationRecords,
    timeLimitRuleCount: data.timeLimitRules?.length || 0,
  };
}

export function createBackup(): BackupFile {
  const complaints = getCurrentComplaints();
  const replyTemplates = getCurrentTemplates();
  const timeLimitRules = getCurrentTimeLimitRules();

  const data: BackupDataV1 = {
    complaints,
    replyTemplates,
    timeLimitRules,
  };

  return {
    metadata: {
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      appName: APP_NAME,
      dataSummary: getDataSummary(data),
    },
    data,
  };
}

export function exportBackupToFile(): void {
  const backup = createBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  const dateStr = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .substring(0, 19);
  a.href = url;
  a.download = `backup-${dateStr}.json`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function validateComplaint(c: unknown): string[] {
  const errors: string[] = [];
  if (!c || typeof c !== 'object') {
    return ['诉求数据格式不正确'];
  }

  const complaint = c as Record<string, unknown>;

  if (!complaint.id || typeof complaint.id !== 'string') {
    errors.push('缺少 id 字段');
  }
  if (!complaint.name || typeof complaint.name !== 'string') {
    errors.push(`ID ${complaint.id || '未知'}: 缺少姓名字段`);
  }
  if (!complaint.phone || typeof complaint.phone !== 'string') {
    errors.push(`ID ${complaint.id || '未知'}: 缺少电话字段`);
  }
  if (!complaint.type || typeof complaint.type !== 'string') {
    errors.push(`ID ${complaint.id || '未知'}: 缺少诉求类型字段`);
  }
  if (!complaint.source || typeof complaint.source !== 'string') {
    errors.push(`ID ${complaint.id || '未知'}: 缺少来源渠道字段`);
  }
  if (!complaint.status || typeof complaint.status !== 'string') {
    errors.push(`ID ${complaint.id || '未知'}: 缺少状态字段`);
  }

  if (complaint.handleRecords && !Array.isArray(complaint.handleRecords)) {
    errors.push(`ID ${complaint.id || '未知'}: handleRecords 格式不正确`);
  }
  if (complaint.escalationRecords && !Array.isArray(complaint.escalationRecords)) {
    errors.push(`ID ${complaint.id || '未知'}: escalationRecords 格式不正确`);
  }

  return errors;
}

function validateTemplate(t: unknown): string[] {
  const errors: string[] = [];
  if (!t || typeof t !== 'object') {
    return ['模板数据格式不正确'];
  }

  const template = t as Record<string, unknown>;

  if (!template.id || typeof template.id !== 'string') {
    errors.push('缺少 id 字段');
  }
  if (!template.title || typeof template.title !== 'string') {
    errors.push(`ID ${template.id || '未知'}: 缺少标题字段`);
  }
  if (!template.type || typeof template.type !== 'string') {
    errors.push(`ID ${template.id || '未知'}: 缺少类型字段`);
  }
  if (!template.content || typeof template.content !== 'string') {
    errors.push(`ID ${template.id || '未知'}: 缺少内容字段`);
  }

  if (template.createdAt && typeof template.createdAt !== 'string') {
    errors.push(`ID ${template.id || '未知'}: createdAt 格式不正确`);
  }
  if (template.updatedAt && typeof template.updatedAt !== 'string') {
    errors.push(`ID ${template.id || '未知'}: updatedAt 格式不正确`);
  }

  return errors;
}

function validateTimeLimitRule(r: unknown): string[] {
  const errors: string[] = [];
  if (!r || typeof r !== 'object') {
    return ['时限规则数据格式不正确'];
  }

  const rule = r as Record<string, unknown>;

  if (!rule.id || typeof rule.id !== 'string') {
    errors.push('缺少 id 字段');
  }
  if (!rule.type || typeof rule.type !== 'string') {
    errors.push(`ID ${rule.id || '未知'}: 缺少诉求类型字段`);
  }
  if (!rule.source || typeof rule.source !== 'string') {
    errors.push(`ID ${rule.id || '未知'}: 缺少来源渠道字段`);
  }
  if (typeof rule.timeLimitHours !== 'number' || rule.timeLimitHours < 0) {
    errors.push(`ID ${rule.id || '未知'}: 处理时限格式不正确`);
  }
  if (typeof rule.warningHours !== 'number' || rule.warningHours < 0) {
    errors.push(`ID ${rule.id || '未知'}: 预警时长格式不正确`);
  }

  return errors;
}

function detectVersion(data: unknown): BackupVersion | null {
  if (!data || typeof data !== 'object') return null;

  const obj = data as Record<string, unknown>;

  if (obj.metadata && typeof obj.metadata === 'object') {
    const meta = obj.metadata as Record<string, unknown>;
    if (meta.version && typeof meta.version === 'string') {
      return meta.version;
    }
  }

  if (Array.isArray(obj)) {
    if (obj.length > 0 && typeof obj[0] === 'object') {
      const first = obj[0] as Record<string, unknown>;
      if ('name' in first && 'phone' in first && 'type' in first) {
        return '0.1.0';
      }
    }
  }

  if (obj.complaints || obj.replyTemplates) {
    return '0.2.0';
  }

  return null;
}

function migrateFromV010(rawData: unknown): BackupDataV1 {
  const complaints = Array.isArray(rawData) ? migrateComplaintData(rawData) : [];
  return {
    complaints,
    replyTemplates: [],
  };
}

function migrateFromV020(rawData: unknown): BackupDataV1 {
  const obj = rawData as Record<string, unknown>;

  const complaintsRaw = Array.isArray(obj.complaints) ? obj.complaints : [];
  const complaints = migrateComplaintData(complaintsRaw);

  const replyTemplates = Array.isArray(obj.replyTemplates)
    ? (obj.replyTemplates as ReplyTemplate[])
    : [];

  return {
    complaints,
    replyTemplates,
  };
}

function migrateBackupData(
  rawData: unknown,
  version: BackupVersion
): { data: BackupDataV1; warnings: string[] } {
  const warnings: string[] = [];

  if (version === BACKUP_VERSION) {
    const obj = rawData as Record<string, unknown>;
    const data = obj.data as BackupDataV1;
    return { data, warnings };
  }

  if (version === '0.1.0') {
    warnings.push('检测到旧版本备份 (v0.1.0)，正在迁移到最新版本');
    const data = migrateFromV010(rawData);
    return { data, warnings };
  }

  if (version === '0.2.0') {
    warnings.push('检测到旧版本备份 (v0.2.0)，正在迁移到最新版本');
    const data = migrateFromV020(rawData);
    return { data, warnings };
  }

  warnings.push(`未知版本 ${version}，尝试以最新格式解析`);
  try {
    const obj = rawData as Record<string, unknown>;
    const data = obj.data as BackupDataV1;
    if (data && data.complaints) {
      return { data, warnings };
    }
  } catch {
    // fall through
  }

  return {
    data: { complaints: [], replyTemplates: [] },
    warnings: [...warnings, '无法解析备份数据'],
  };
}

export function validateBackup(fileContent: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let version: BackupVersion | null = null;
  let parsed: unknown;

  try {
    parsed = JSON.parse(fileContent);
  } catch {
    return {
      valid: false,
      version: null,
      errors: ['JSON 解析失败，文件格式不正确'],
      warnings: [],
    };
  }

  version = detectVersion(parsed);

  if (!version) {
    return {
      valid: false,
      version: null,
      errors: ['无法识别的备份文件格式'],
      warnings: [],
    };
  }

  const { data, warnings: migrateWarnings } = migrateBackupData(parsed, version);
  warnings.push(...migrateWarnings);

  if (!data.complaints || !Array.isArray(data.complaints)) {
    errors.push('备份数据中缺少诉求列表');
  } else {
    data.complaints.forEach((c, index) => {
      const errs = validateComplaint(c);
      if (errs.length > 0) {
        errors.push(`诉求 #${index + 1}: ${errs.join('；')}`);
      }
    });
  }

  if (!data.replyTemplates || !Array.isArray(data.replyTemplates)) {
    errors.push('备份数据中缺少回复模板列表');
  } else {
    data.replyTemplates.forEach((t, index) => {
      const errs = validateTemplate(t);
      if (errs.length > 0) {
        errors.push(`模板 #${index + 1}: ${errs.join('；')}`);
      }
    });
  }

  if (data.timeLimitRules) {
    if (!Array.isArray(data.timeLimitRules)) {
      errors.push('备份数据中时限规则格式不正确');
    } else {
      data.timeLimitRules.forEach((r, index) => {
        const errs = validateTimeLimitRule(r);
        if (errs.length > 0) {
          errors.push(`时限规则 #${index + 1}: ${errs.join('；')}`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    version,
    errors,
    warnings,
  };
}

function isSameObject(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

function computeArrayDiff<T extends { id: string }>(
  current: T[],
  backup: T[]
): { added: number; removed: number; modified: number; unchanged: number; conflicts: Map<string, { current: T; backup: T }> } {
  const currentMap = new Map(current.map((item) => [item.id, item]));
  const backupMap = new Map(backup.map((item) => [item.id, item]));

  let added = 0;
  let removed = 0;
  let modified = 0;
  let unchanged = 0;
  const conflicts = new Map<string, { current: T; backup: T }>();

  for (const [id, backupItem] of backupMap) {
    if (!currentMap.has(id)) {
      added++;
    } else {
      const currentItem = currentMap.get(id)!;
      if (isSameObject(currentItem, backupItem)) {
        unchanged++;
      } else {
        modified++;
        conflicts.set(id, { current: currentItem, backup: backupItem });
      }
    }
  }

  for (const id of currentMap.keys()) {
    if (!backupMap.has(id)) {
      removed++;
    }
  }

  return { added, removed, modified, unchanged, conflicts };
}

function filterValidTemplates(templates: unknown[]): ReplyTemplate[] {
  return templates.filter((t): t is ReplyTemplate => {
    return validateTemplate(t).length === 0;
  });
}

export function generateImportPreview(fileContent: string): ImportPreviewResult {
  const validation = validateBackup(fileContent);
  const version = validation.version || '0.0.0';

  let backupData: BackupDataV1 = { complaints: [], replyTemplates: [] };

  if (validation.valid || validation.warnings.length > 0) {
    try {
      const parsed = JSON.parse(fileContent);
      const { data } = migrateBackupData(parsed, version);
      const validTemplates = filterValidTemplates(data.replyTemplates);
      backupData = {
        ...data,
        replyTemplates: validTemplates,
      };
    } catch {
      // 如果解析失败，保持空数据
    }
  }

  const currentComplaints = getCurrentComplaints();
  const currentTemplates = getCurrentTemplates();

  const complaintDiff = computeArrayDiff(currentComplaints, backupData.complaints);
  const templateDiff = computeArrayDiff(currentTemplates, backupData.replyTemplates);

  const conflicts: ConflictItem[] = [];

  for (const [id, { current, backup }] of complaintDiff.conflicts) {
    conflicts.push({
      id,
      type: 'complaint',
      current,
      backup,
      resolution: 'keep_current',
    });
  }

  for (const [id, { current, backup }] of templateDiff.conflicts) {
    conflicts.push({
      id,
      type: 'template',
      current,
      backup,
      resolution: 'keep_current',
    });
  }

  const diff: DiffSummary = {
    complaints: {
      added: complaintDiff.added,
      removed: complaintDiff.removed,
      modified: complaintDiff.modified,
      unchanged: complaintDiff.unchanged,
    },
    templates: {
      added: templateDiff.added,
      removed: templateDiff.removed,
      modified: templateDiff.modified,
      unchanged: templateDiff.unchanged,
    },
  };

  return {
    validation,
    diff,
    conflicts,
    backupData,
    currentData: {
      complaints: currentComplaints,
      replyTemplates: currentTemplates,
    },
  };
}

export function applyImport(
  backupData: BackupDataV1,
  mode: ImportMode,
  conflicts: ConflictItem[]
): { success: boolean; message: string } {
  try {
    const currentComplaints = getCurrentComplaints();
    const currentTemplates = getCurrentTemplates();
    const currentTimeLimitRules = getCurrentTimeLimitRules();

    const validTemplates = filterValidTemplates(backupData.replyTemplates);
    const hasInvalidTemplates = validTemplates.length !== backupData.replyTemplates.length;

    if (hasInvalidTemplates) {
      return {
        success: false,
        message: `检测到 ${backupData.replyTemplates.length - validTemplates.length} 个无效模板，恢复已终止`,
      };
    }

    const conflictMap = new Map(conflicts.map((c) => [`${c.type}:${c.id}`, c.resolution]));

    let finalComplaints: Complaint[];
    let finalTemplates: ReplyTemplate[];
    let finalTimeLimitRules: TimeLimitRule[];

    if (mode === 'overwrite_all') {
      finalComplaints = backupData.complaints;
      finalTemplates = backupData.replyTemplates;
      finalTimeLimitRules = backupData.timeLimitRules || currentTimeLimitRules;
    } else {
      const currentComplaintMap = new Map(currentComplaints.map((c) => [c.id, c]));
      const currentTemplateMap = new Map(currentTemplates.map((t) => [t.id, t]));

      const backupComplaintMap = new Map(backupData.complaints.map((c) => [c.id, c]));
      const backupTemplateMap = new Map(backupData.replyTemplates.map((t) => [t.id, t]));

      const mergedComplaintMap = new Map(currentComplaintMap);
      for (const [id, backupItem] of backupComplaintMap) {
        if (!mergedComplaintMap.has(id)) {
          mergedComplaintMap.set(id, backupItem);
        } else {
          const resolution = conflictMap.get(`complaint:${id}`);
          if (mode === 'merge_overwrite' || resolution === 'overwrite') {
            mergedComplaintMap.set(id, backupItem);
          }
        }
      }
      finalComplaints = Array.from(mergedComplaintMap.values());

      const mergedTemplateMap = new Map(currentTemplateMap);
      for (const [id, backupItem] of backupTemplateMap) {
        if (!mergedTemplateMap.has(id)) {
          mergedTemplateMap.set(id, backupItem);
        } else {
          const resolution = conflictMap.get(`template:${id}`);
          if (mode === 'merge_overwrite' || resolution === 'overwrite') {
            mergedTemplateMap.set(id, backupItem);
          }
        }
      }
      finalTemplates = Array.from(mergedTemplateMap.values());

      if (backupData.timeLimitRules && backupData.timeLimitRules.length > 0) {
        if (mode === 'merge_overwrite') {
          finalTimeLimitRules = backupData.timeLimitRules;
        } else {
          finalTimeLimitRules = currentTimeLimitRules;
        }
      } else {
        finalTimeLimitRules = currentTimeLimitRules;
      }
    }

    localStorage.setItem(COMPLAINT_STORAGE_KEY, JSON.stringify(finalComplaints));
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(finalTemplates));
    saveTimeLimitRules(finalTimeLimitRules);

    const ruleMsg = backupData.timeLimitRules
      ? `，${finalTimeLimitRules.length} 条时限规则`
      : '';

    return {
      success: true,
      message: `恢复成功！共 ${finalComplaints.length} 条诉求，${finalTemplates.length} 个模板${ruleMsg}`,
    };
  } catch (e) {
    console.error('Import failed:', e);
    return {
      success: false,
      message: '恢复失败：' + (e instanceof Error ? e.message : '未知错误'),
    };
  }
}

export function readBackupFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        resolve(content);
      } else {
        reject(new Error('文件读取失败'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}
