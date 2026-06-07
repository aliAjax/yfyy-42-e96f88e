export type OperationType =
  | 'create_complaint'
  | 'update_complaint'
  | 'handle_complaint'
  | 'escalate_complaint'
  | 'delete_complaint'
  | 'batch_delete'
  | 'merge_complaint'
  | 'assign_complaint'
  | 'visit_back'
  | 'import_complaints'
  | 'export_complaints'
  | 'manage_template'
  | 'manage_time_limit_rule'
  | 'backup_data'
  | 'restore_data'
  | 'switch_role'
  | 'switch_handler'
  | 'manage_handler';

export type OperationTargetType =
  | 'complaint'
  | 'template'
  | 'time_limit_rule'
  | 'handler'
  | 'system'
  | 'role';

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  create_complaint: '新增诉求',
  update_complaint: '更新诉求',
  handle_complaint: '处理诉求',
  escalate_complaint: '升级诉求',
  delete_complaint: '删除诉求',
  batch_delete: '批量删除',
  merge_complaint: '合并诉求',
  assign_complaint: '分派诉求',
  visit_back: '回访登记',
  import_complaints: '批量导入',
  export_complaints: '导出数据',
  manage_template: '模板管理',
  manage_time_limit_rule: '时限规则管理',
  backup_data: '数据备份',
  restore_data: '数据恢复',
  switch_role: '切换角色',
  switch_handler: '切换处理员',
  manage_handler: '管理处理员',
};

export const OPERATION_TARGET_TYPE_LABELS: Record<OperationTargetType, string> = {
  complaint: '诉求记录',
  template: '回复模板',
  time_limit_rule: '时限规则',
  handler: '处理员',
  system: '系统',
  role: '角色',
};

export interface OperationLog {
  id: string;
  operationType: OperationType;
  targetType: OperationTargetType;
  targetId: string;
  targetName: string;
  operatorRole: string;
  operatorId: string;
  operatorName: string;
  operatedAt: string;
  summary: string;
  details?: Record<string, unknown>;
}

export interface OperationLogFilter {
  operationTypes: OperationType[];
  targetTypes: OperationTargetType[];
  operatorRoles: string[];
  keyword: string;
  startTime: string | null;
  endTime: string | null;
}

export const DEFAULT_LOG_FILTER: OperationLogFilter = {
  operationTypes: [],
  targetTypes: [],
  operatorRoles: [],
  keyword: '',
  startTime: null,
  endTime: null,
};

export const MAX_LOG_COUNT = 2000;
export const LOG_STORAGE_KEY = 'operation_logs';
