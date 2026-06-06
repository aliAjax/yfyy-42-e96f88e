export type UserRole = 'registrar' | 'handler' | 'admin';

export const ROLE_LABELS: Record<UserRole, string> = {
  registrar: '登记员',
  handler: '处理员',
  admin: '管理员',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  registrar: '负责新增和查看诉求',
  handler: '负责更新状态和处理意见',
  admin: '拥有全部操作权限',
};

export type PermissionAction =
  | 'view_complaint'
  | 'create_complaint'
  | 'update_status'
  | 'update_handle_opinion'
  | 'escalate_complaint'
  | 'delete_complaint'
  | 'manage_templates'
  | 'view_statistics'
  | 'export_data'
  | 'import_data'
  | 'print_receipt';

const rolePermissions: Record<UserRole, PermissionAction[]> = {
  registrar: [
    'view_complaint',
    'create_complaint',
    'print_receipt',
  ],
  handler: [
    'view_complaint',
    'create_complaint',
    'update_status',
    'update_handle_opinion',
    'escalate_complaint',
    'print_receipt',
  ],
  admin: [
    'view_complaint',
    'create_complaint',
    'update_status',
    'update_handle_opinion',
    'escalate_complaint',
    'delete_complaint',
    'manage_templates',
    'view_statistics',
    'export_data',
    'import_data',
    'print_receipt',
  ],
};

const permissionLabels: Record<PermissionAction, string> = {
  view_complaint: '查看诉求',
  create_complaint: '新增诉求',
  update_status: '更新状态',
  update_handle_opinion: '填写处理意见',
  escalate_complaint: '升级处理',
  delete_complaint: '删除记录',
  manage_templates: '管理回复模板',
  view_statistics: '查看数据统计',
  export_data: '导出数据',
  import_data: '批量导入',
  print_receipt: '打印回执',
};

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
