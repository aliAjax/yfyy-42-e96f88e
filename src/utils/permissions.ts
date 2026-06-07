export type UserRole = 'registrar' | 'handler' | 'admin';

export const ROLE_LABELS: Record<UserRole, string> = {
  registrar: '登记员',
  handler: '处理员',
  admin: '管理员',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  registrar: '负责诉求登记与查阅',
  handler: '负责诉求处理与回复',
  admin: '拥有全部操作权限与系统管理',
};

export type PermissionAction =
  | 'view_complaint'
  | 'create_complaint'
  | 'update_status'
  | 'update_handle_opinion'
  | 'escalate_complaint'
  | 'delete_complaint'
  | 'merge_complaint'
  | 'manage_templates'
  | 'manage_time_limit_rules'
  | 'view_statistics'
  | 'export_data'
  | 'import_data'
  | 'print_receipt'
  | 'backup_restore'
  | 'assign_complaint'
  | 'manage_handlers'
  | 'view_all_complaints'
  | 'manage_visit_back'
  | 'view_visit_back'
  | 'view_merged_complaints';

const rolePermissions: Record<UserRole, PermissionAction[]> = {
  registrar: [
    'view_complaint',
    'create_complaint',
    'print_receipt',
    'view_all_complaints',
    'view_visit_back',
    'view_merged_complaints',
  ],
  handler: [
    'view_complaint',
    'update_status',
    'update_handle_opinion',
    'escalate_complaint',
    'print_receipt',
    'manage_visit_back',
    'view_visit_back',
    'view_merged_complaints',
  ],
  admin: [
    'view_complaint',
    'create_complaint',
    'update_status',
    'update_handle_opinion',
    'escalate_complaint',
    'delete_complaint',
    'merge_complaint',
    'manage_templates',
    'manage_time_limit_rules',
    'view_statistics',
    'export_data',
    'import_data',
    'print_receipt',
    'backup_restore',
    'assign_complaint',
    'manage_handlers',
    'view_all_complaints',
    'manage_visit_back',
    'view_visit_back',
    'view_merged_complaints',
  ],
};

const permissionLabels: Record<PermissionAction, string> = {
  view_complaint: '查看诉求',
  create_complaint: '新增诉求',
  update_status: '更新状态',
  update_handle_opinion: '填写处理意见',
  escalate_complaint: '升级处理',
  delete_complaint: '删除记录',
  merge_complaint: '合并诉求',
  manage_templates: '管理回复模板',
  manage_time_limit_rules: '管理时限规则',
  view_statistics: '查看数据统计',
  export_data: '导出数据',
  import_data: '批量导入',
  print_receipt: '打印回执',
  backup_restore: '备份与恢复',
  assign_complaint: '分派诉求',
  manage_handlers: '管理处理员',
  view_all_complaints: '查看所有诉求',
  manage_visit_back: '登记回访',
  view_visit_back: '查看回访信息',
  view_merged_complaints: '查看已合并诉求',
};

const permissionGroups: { group: string; permissions: PermissionAction[] }[] = [
  {
    group: '诉求管理',
    permissions: ['view_complaint', 'create_complaint', 'delete_complaint', 'merge_complaint', 'view_all_complaints', 'view_merged_complaints'],
  },
  {
    group: '处理操作',
    permissions: ['update_status', 'update_handle_opinion', 'escalate_complaint', 'assign_complaint'],
  },
  {
    group: '回访管理',
    permissions: ['manage_visit_back', 'view_visit_back'],
  },
  {
    group: '系统管理',
    permissions: ['manage_templates', 'manage_time_limit_rules', 'manage_handlers', 'view_statistics', 'export_data', 'import_data', 'backup_restore'],
  },
  {
    group: '其他功能',
    permissions: ['print_receipt'],
  },
];

export function hasPermission(role: UserRole, action: PermissionAction): boolean {
  return rolePermissions[role]?.includes(action) ?? false;
}

export function getPermissionLabel(action: PermissionAction): string {
  return permissionLabels[action] ?? action;
}

export function getRolePermissions(role: UserRole): PermissionAction[] {
  return rolePermissions[role] ?? [];
}

export function getDisabledReason(role: UserRole, action: PermissionAction): string {
  if (hasPermission(role, action)) return '';
  return `当前角色为"${ROLE_LABELS[role]}"，无${getPermissionLabel(action)}权限`;
}

export function getPermissionGroups(): { group: string; permissions: PermissionAction[] }[] {
  return permissionGroups;
}

export function hasAnyPermission(role: UserRole, actions: PermissionAction[]): boolean {
  return actions.some((action) => hasPermission(role, action));
}
