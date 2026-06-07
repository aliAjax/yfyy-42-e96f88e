import { useState, useEffect } from 'react';
import { X, CheckSquare, TrendingUp, Trash2, Download, AlertTriangle, Shield, Info } from 'lucide-react';
import { STATUS_OPTIONS } from '@/types/complaint';
import type { Complaint, BatchActionType, BatchStatusData, BatchEscalateData } from '@/types/complaint';
import type { UserRole } from '@/utils/permissions';
import { hasPermission, getDisabledReason, ROLE_LABELS, getPermissionLabel } from '@/utils/permissions';
import { getCurrentDateTime } from '@/utils/helpers';

interface BatchOperationModalProps {
  action: BatchActionType | null;
  selectedComplaints: Complaint[];
  currentRole: UserRole;
  onClose: () => void;
  onConfirm: (action: BatchActionType, data: any) => void;
}

const actionConfig: Record<BatchActionType, {
  label: string;
  icon: any;
  color: string;
  bgColor: string;
  permission: string;
  description: string;
}> = {
  status: {
    label: '批量更新状态',
    icon: CheckSquare,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    permission: 'update_status',
    description: '将选中的诉求批量更新为指定状态，并记录处理意见。',
  },
  escalate: {
    label: '批量升级',
    icon: TrendingUp,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    permission: 'escalate_complaint',
    description: '将选中的诉求标记为升级处理，并记录升级原因。',
  },
  delete: {
    label: '批量删除',
    icon: Trash2,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    permission: 'delete_complaint',
    description: '永久删除选中的诉求记录，此操作不可撤销。',
  },
  export: {
    label: '批量导出',
    icon: Download,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
    permission: 'export_data',
    description: '将选中的诉求数据导出为 CSV 文件。',
  },
};

export default function BatchOperationModal({
  action,
  selectedComplaints,
  currentRole,
  onClose,
  onConfirm,
}: BatchOperationModalProps) {
  const [statusData, setStatusData] = useState<BatchStatusData>({
    status: 'processing',
    handleOpinion: '',
    replyTime: '',
  });
  const [escalateData, setEscalateData] = useState<BatchEscalateData>({
    reason: '',
  });

  useEffect(() => {
    if (action === 'status') {
      setStatusData({
        status: 'processing',
        handleOpinion: '',
        replyTime: '',
      });
    }
    if (action === 'escalate') {
      setEscalateData({ reason: '' });
    }
  }, [action]);

  if (!action) return null;

  const config = actionConfig[action];
  const Icon = config.icon;
  const canPerform = hasPermission(currentRole, config.permission as any);
  const count = selectedComplaints.length;

  const handleStatusChange = (status: typeof statusData.status) => {
    setStatusData((prev) => {
      const next = { ...prev, status };
      if (status === 'replied' && !prev.replyTime) {
        next.replyTime = getCurrentDateTime();
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (!canPerform) return;

    switch (action) {
      case 'status':
        onConfirm(action, statusData);
        break;
      case 'escalate':
        if (escalateData.reason.trim()) {
          onConfirm(action, escalateData);
        }
        break;
      case 'delete':
      case 'export':
        onConfirm(action, {});
        break;
    }
  };

  const canConfirm = () => {
    if (!canPerform) return false;
    switch (action) {
      case 'escalate':
        return escalateData.reason.trim().length > 0;
      default:
        return true;
    }
  };

  const getSummaryStats = () => {
    const statusCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    let overdueCount = 0;
    let escalatedCount = 0;

    selectedComplaints.forEach((c) => {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
      if (c.escalationRecords && c.escalationRecords.length > 0) {
        escalatedCount++;
      }
    });

    return { statusCounts, typeCounts, overdueCount, escalatedCount };
  };

  const stats = getSummaryStats();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bgColor}`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{config.label}</h3>
              <p className="text-xs text-slate-500">
                影响 <span className="font-semibold text-slate-700">{count}</span> 条诉求
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-5">
            {!canPerform && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">权限不足</p>
                  <p className="text-xs text-amber-700 mt-1">
                    当前角色为「{ROLE_LABELS[currentRole]}」，
                    无{getPermissionLabel(config.permission as any)}权限。
                  </p>
                </div>
              </div>
            )}

            <div className={`rounded-xl border p-4 ${config.bgColor}`}>
              <div className="flex items-start gap-2">
                <Info className={`w-4 h-4 ${config.color} flex-shrink-0 mt-0.5`} />
                <p className={`text-sm ${config.color.replace('text-', 'text-').replace('600', '700')}`}>
                  {config.description}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                影响范围
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white rounded-lg p-3 border border-slate-100">
                  <p className="text-slate-500 mb-1">选中数量</p>
                  <p className="text-lg font-bold text-slate-800">{count} 条</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-100">
                  <p className="text-slate-500 mb-1">状态分布</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(stats.statusCounts).map(([status, cnt]) => {
                      const opt = STATUS_OPTIONS.find((o) => o.value === status);
                      return (
                        <span
                          key={status}
                          className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded"
                        >
                          {opt?.label || status}: {cnt}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                涉及类型：{Object.keys(stats.typeCounts).join('、') || '-'}
              </div>
            </div>

            {action === 'status' && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    目标状态
                  </label>
                  <div className="flex gap-2">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleStatusChange(opt.value)}
                        disabled={!canPerform}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                          statusData.status === opt.value
                            ? opt.color === 'red'
                              ? 'bg-red-50 border-red-300 text-red-700'
                              : opt.color === 'blue'
                              ? 'bg-blue-50 border-blue-300 text-blue-700'
                              : 'bg-green-50 border-green-300 text-green-700'
                            : canPerform
                            ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                            : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    处理意见
                  </label>
                  <textarea
                    value={statusData.handleOpinion}
                    onChange={(e) =>
                      canPerform && setStatusData((prev) => ({ ...prev, handleOpinion: e.target.value }))
                    }
                    placeholder="请输入处理意见（可选）..."
                    rows={3}
                    disabled={!canPerform}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none ${
                      canPerform
                        ? 'border-slate-300'
                        : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                    }`}
                  />
                </div>

                {statusData.status === 'replied' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      回复时间
                    </label>
                    <input
                      type="text"
                      value={statusData.replyTime}
                      onChange={(e) =>
                        canPerform && setStatusData((prev) => ({ ...prev, replyTime: e.target.value }))
                      }
                      disabled={!canPerform}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        canPerform
                          ? 'border-slate-300'
                          : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                      }`}
                    />
                  </div>
                )}
              </div>
            )}

            {action === 'escalate' && (
              <div className="space-y-2 pt-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  升级原因 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={escalateData.reason}
                  onChange={(e) =>
                    canPerform && setEscalateData({ reason: e.target.value })
                  }
                  placeholder="请填写升级原因..."
                  rows={4}
                  disabled={!canPerform}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none ${
                    canPerform
                      ? 'border-slate-300'
                      : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                  }`}
                />
              </div>
            )}

            {action === 'delete' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">警告：此操作不可撤销</p>
                    <p className="text-xs text-red-700 mt-1">
                      删除后，这 {count} 条诉求记录将永久丢失，无法恢复。
                      请确认您已备份重要数据。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {action === 'export' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Download className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800">导出说明</p>
                    <p className="text-xs text-emerald-700 mt-1">
                      将导出 {count} 条诉求数据为 CSV 格式文件，
                      包含编号、姓名、联系方式、诉求类型、来源渠道、受理时间、状态、处理意见等字段。
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm()}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
              canConfirm()
                ? action === 'delete'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : action === 'status'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : action === 'escalate'
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Icon className="w-4 h-4" />
            确认{config.label.replace('批量', '').replace('更新状态', '更新')}
          </button>
        </div>
      </div>
    </div>
  );
}
