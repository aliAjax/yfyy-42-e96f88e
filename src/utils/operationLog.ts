import type {
  OperationLog,
  OperationLogFilter,
  OperationType,
  OperationTargetType,
} from '@/types/operationLog';
import {
  LOG_STORAGE_KEY,
  MAX_LOG_COUNT,
} from '@/types/operationLog';
import { generateId } from './helpers';
import { ROLE_LABELS } from './permissions';
import type { UserRole } from './permissions';
import { getCurrentHandler } from './handlers';

export function getOperationLogs(): OperationLog[] {
  try {
    const stored = localStorage.getItem(LOG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load operation logs from localStorage:', e);
  }
  return [];
}

export function saveOperationLogs(logs: OperationLog[]): void {
  try {
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save operation logs to localStorage:', e);
  }
}

function truncateLogs(logs: OperationLog[]): OperationLog[] {
  if (logs.length <= MAX_LOG_COUNT) {
    return logs;
  }
  return logs.slice(0, MAX_LOG_COUNT);
}

interface AddLogParams {
  operationType: OperationType;
  targetType: OperationTargetType;
  targetId: string;
  targetName: string;
  operatorRole: UserRole;
  operatorId: string;
  operatorName: string;
  summary: string;
  details?: Record<string, unknown>;
}

export function addOperationLog(params: AddLogParams): OperationLog {
  const logs = getOperationLogs();

  const newLog: OperationLog = {
    id: generateId(),
    operationType: params.operationType,
    targetType: params.targetType,
    targetId: params.targetId,
    targetName: params.targetName,
    operatorRole: params.operatorRole,
    operatorId: params.operatorId,
    operatorName: params.operatorName,
    operatedAt: new Date().toISOString(),
    summary: params.summary,
    details: params.details,
  };

  const updatedLogs = [newLog, ...logs];
  const truncatedLogs = truncateLogs(updatedLogs);
  saveOperationLogs(truncatedLogs);

  return newLog;
}

export function filterOperationLogs(
  logs: OperationLog[],
  filter: OperationLogFilter
): OperationLog[] {
  return logs.filter((log) => {
    if (
      filter.operationTypes.length > 0 &&
      !filter.operationTypes.includes(log.operationType)
    ) {
      return false;
    }

    if (
      filter.targetTypes.length > 0 &&
      !filter.targetTypes.includes(log.targetType)
    ) {
      return false;
    }

    if (
      filter.operatorRoles.length > 0 &&
      !filter.operatorRoles.includes(log.operatorRole)
    ) {
      return false;
    }

    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase();
      const matchesKeyword =
        log.targetName.toLowerCase().includes(keyword) ||
        log.operatorName.toLowerCase().includes(keyword) ||
        log.summary.toLowerCase().includes(keyword);
      if (!matchesKeyword) {
        return false;
      }
    }

    if (filter.startTime) {
      const logTime = new Date(log.operatedAt).getTime();
      const startTime = new Date(filter.startTime).getTime();
      if (logTime < startTime) {
        return false;
      }
    }

    if (filter.endTime) {
      const logTime = new Date(log.operatedAt).getTime();
      const endTime = new Date(filter.endTime).getTime();
      if (logTime > endTime) {
        return false;
      }
    }

    return true;
  });
}

export function clearOldLogs(daysToKeep: number): number {
  const logs = getOperationLogs();
  const cutoffTime = new Date().getTime() - daysToKeep * 24 * 60 * 60 * 1000;

  const filteredLogs = logs.filter(
    (log) => new Date(log.operatedAt).getTime() >= cutoffTime
  );

  const removedCount = logs.length - filteredLogs.length;
  saveOperationLogs(filteredLogs);

  return removedCount;
}

export function getLogStats(logs: OperationLog[]) {
  const typeCount: Record<string, number> = {};
  const roleCount: Record<string, number> = {};

  logs.forEach((log) => {
    typeCount[log.operationType] = (typeCount[log.operationType] || 0) + 1;
    roleCount[log.operatorRole] = (roleCount[log.operatorRole] || 0) + 1;
  });

  return {
    total: logs.length,
    byType: typeCount,
    byRole: roleCount,
  };
}

export function getOperatorRoleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] || role;
}

const ROLE_STORAGE_KEY = 'current_role';

function getCurrentRole(): UserRole {
  try {
    const stored = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole;
    if (stored && ['registrar', 'handler', 'admin'].includes(stored)) {
      return stored;
    }
  } catch {
    // ignore
  }
  return 'admin';
}

interface QuickLogParams {
  operationType: OperationType;
  targetType: OperationTargetType;
  targetId: string;
  targetName: string;
  summary: string;
  details?: Record<string, unknown>;
}

export function logOperation(params: QuickLogParams): OperationLog {
  const role = getCurrentRole();
  const handler = getCurrentHandler();

  const operatorName = role === 'handler'
    ? handler?.name || ROLE_LABELS[role]
    : ROLE_LABELS[role];
  const operatorId = role === 'handler' ? handler?.id || '' : role;

  return addOperationLog({
    operationType: params.operationType,
    targetType: params.targetType,
    targetId: params.targetId,
    targetName: params.targetName,
    operatorRole: role,
    operatorId,
    operatorName,
    summary: params.summary,
    details: params.details,
  });
}
