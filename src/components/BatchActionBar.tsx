import { CheckSquare, TrendingUp, Trash2, Download, X, Lock } from 'lucide-react';
import type { UserRole } from '@/utils/permissions';
import { hasPermission, getDisabledReason } from '@/utils/permissions';
import { useState } from 'react';
import type { BatchActionType } from '@/types/complaint';

interface BatchActionBarProps {
  selectedCount: number;
  totalCount: number;
  currentRole: UserRole;
  onAction: (action: BatchActionType) => void;
  onClear: () => void;
  onSelectAll?: () => void;
  allSelected?: boolean;
  someSelected?: boolean;
}

export default function BatchActionBar({
  selectedCount,
  totalCount,
  currentRole,
  onAction,
  onClear,
  onSelectAll,
  allSelected = false,
  someSelected = false,
}: BatchActionBarProps) {
  const canUpdateStatus = hasPermission(currentRole, 'update_status');
  const canEscalate = hasPermission(currentRole, 'escalate_complaint');
  const canDelete = hasPermission(currentRole, 'delete_complaint');
  const canExport = hasPermission(currentRole, 'export_data');

  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const actions = [
    {
      type: 'status' as BatchActionType,
      label: '更新状态',
      icon: CheckSquare,
      permission: 'update_status' as const,
      can: canUpdateStatus,
      hoverBg: 'hover:bg-white/20',
    },
    {
      type: 'escalate' as BatchActionType,
      label: '批量升级',
      icon: TrendingUp,
      permission: 'escalate_complaint' as const,
      can: canEscalate,
      hoverBg: 'hover:bg-white/20',
    },
    {
      type: 'delete' as BatchActionType,
      label: '批量删除',
      icon: Trash2,
      permission: 'delete_complaint' as const,
      can: canDelete,
      hoverBg: 'hover:bg-red-500/30',
    },
    {
      type: 'export' as BatchActionType,
      label: '批量导出',
      icon: Download,
      permission: 'export_data' as const,
      can: canExport,
      hoverBg: 'hover:bg-white/20',
    },
  ];

  if (selectedCount === 0) return null;

  return (
    <div className="bg-blue-600 text-white px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap shadow-lg">
      <div className="flex items-center gap-4 flex-wrap">
        {onSelectAll && (
          <label className="flex items-center gap-2 cursor-pointer text-sm select-none">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected;
              }}
              onChange={onSelectAll}
              className="w-4 h-4 text-blue-600 border-white/30 rounded focus:ring-2 focus:ring-white/30 cursor-pointer"
            />
            <span className="text-white/90">
              {allSelected ? '取消全选' : '全选当前'}
            </span>
          </label>
        )}
        <div className="h-5 w-px bg-white/20" />
        <span className="text-sm">
          已选择 <span className="font-bold text-white">{selectedCount}</span> 项
          <span className="text-white/60 ml-2">/ 共 {totalCount} 条</span>
        </span>
      </div>

      <div className="flex items-center gap-1">
        {actions.map((action) => {
          const Icon = action.icon;
          const showTip = !action.can && hoveredAction === action.type;
          return (
            <div
              key={action.type}
              className="relative"
              onMouseEnter={() => setHoveredAction(action.type)}
              onMouseLeave={() => setHoveredAction(null)}
            >
              <button
                onClick={() => action.can && onAction(action.type)}
                disabled={!action.can}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  action.can
                    ? `text-white bg-white/10 ${action.hoverBg}`
                    : 'text-white/30 bg-white/5 cursor-not-allowed'
                }`}
                title={action.can ? action.label : getDisabledReason(currentRole, action.permission)}
              >
                {!action.can && <Lock className="w-3.5 h-3.5" />}
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{action.label}</span>
              </button>
              {showTip && (
                <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap z-20 pointer-events-none shadow-lg">
                  {getDisabledReason(currentRole, action.permission)}
                </div>
              )}
            </div>
          );
        })}
        <div className="h-5 w-px bg-white/20 mx-1" />
        <button
          onClick={onClear}
          className="flex items-center justify-center w-8 h-8 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="取消选择"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
