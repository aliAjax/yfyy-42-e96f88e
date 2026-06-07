import { useState, useMemo } from 'react';
import { X, Search, Filter, ChevronDown, ChevronUp, ScrollText, Trash2 } from 'lucide-react';
import type {
  OperationLog,
  OperationLogFilter,
  OperationType,
  OperationTargetType,
} from '@/types/operationLog';
import {
  OPERATION_TYPE_LABELS,
  OPERATION_TARGET_TYPE_LABELS,
  DEFAULT_LOG_FILTER,
  MAX_LOG_COUNT,
} from '@/types/operationLog';
import {
  getOperationLogs,
  filterOperationLogs,
  clearOldLogs,
  getOperatorRoleLabel,
} from '@/utils/operationLog';
import { formatDateTime } from '@/utils/helpers';
import { ROLE_LABELS } from '@/utils/permissions';
import type { UserRole } from '@/utils/permissions';

interface OperationLogModalProps {
  onClose: () => void;
}

export default function OperationLogModal({ onClose }: OperationLogModalProps) {
  const [logs, setLogs] = useState<OperationLog[]>(() => getOperationLogs());
  const [filter, setFilter] = useState<OperationLogFilter>(DEFAULT_LOG_FILTER);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<OperationLog | null>(null);

  const filteredLogs = useMemo(
    () => filterOperationLogs(logs, filter),
    [logs, filter]
  );

  const handleFilterChange = (
    key: keyof OperationLogFilter,
    value: OperationLogFilter[typeof key]
  ) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilter(DEFAULT_LOG_FILTER);
  };

  const handleClearOldLogs = (days: number) => {
    if (confirm(`确定要删除 ${days} 天前的所有日志吗？此操作不可撤销。`)) {
      const removed = clearOldLogs(days);
      setLogs(getOperationLogs());
      alert(`已清理 ${removed} 条旧日志`);
    }
  };

  const toggleOperationType = (type: OperationType) => {
    setFilter((prev) => {
      const types = prev.operationTypes.includes(type)
        ? prev.operationTypes.filter((t) => t !== type)
        : [...prev.operationTypes, type];
      return { ...prev, operationTypes: types };
    });
  };

  const toggleTargetType = (type: OperationTargetType) => {
    setFilter((prev) => {
      const types = prev.targetTypes.includes(type)
        ? prev.targetTypes.filter((t) => t !== type)
        : [...prev.targetTypes, type];
      return { ...prev, targetTypes: types };
    });
  };

  const toggleRole = (role: string) => {
    setFilter((prev) => {
      const roles = prev.operatorRoles.includes(role)
        ? prev.operatorRoles.filter((r) => r !== role)
        : [...prev.operatorRoles, role];
      return { ...prev, operatorRoles: roles };
    });
  };

  const operationTypes = Object.keys(OPERATION_TYPE_LABELS) as OperationType[];
  const targetTypes = Object.keys(OPERATION_TARGET_TYPE_LABELS) as OperationTargetType[];
  const roles = Object.keys(ROLE_LABELS) as UserRole[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <ScrollText className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">操作日志</h3>
              <p className="text-xs text-slate-500">
                共 {filteredLogs.length} 条记录（最多保留 {MAX_LOG_COUNT} 条）
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜索操作对象、操作人或摘要..."
                value={filter.keyword}
                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                showFilters
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              筛选
              {showFilters ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  操作类型
                </label>
                <div className="flex flex-wrap gap-2">
                  {operationTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleOperationType(type)}
                      className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                        filter.operationTypes.includes(type)
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {OPERATION_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  操作对象类型
                </label>
                <div className="flex flex-wrap gap-2">
                  {targetTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleTargetType(type)}
                      className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                        filter.targetTypes.includes(type)
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {OPERATION_TARGET_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  操作角色
                </label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <button
                      key={role}
                      onClick={() => toggleRole(role)}
                      className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                        filter.operatorRoles.includes(role)
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-end gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    开始时间
                  </label>
                  <input
                    type="datetime-local"
                    value={filter.startTime || ''}
                    onChange={(e) =>
                      handleFilterChange('startTime', e.target.value || null)
                    }
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    结束时间
                  </label>
                  <input
                    type="datetime-local"
                    value={filter.endTime || ''}
                    onChange={(e) =>
                      handleFilterChange('endTime', e.target.value || null)
                    }
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  重置筛选
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <span className="text-sm text-slate-500">快速清理：</span>
                <button
                  onClick={() => handleClearOldLogs(30)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  清理30天前
                </button>
                <button
                  onClick={() => handleClearOldLogs(90)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  清理90天前
                </button>
                <button
                  onClick={() => handleClearOldLogs(0)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  清空全部
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <ScrollText className="w-12 h-12 mb-3" />
              <p className="text-sm">暂无操作日志</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="px-6 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                          {OPERATION_TYPE_LABELS[log.operationType]}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
                          {OPERATION_TARGET_TYPE_LABELS[log.targetType]}
                        </span>
                        <span className="text-sm font-medium text-slate-700 truncate">
                          {log.targetName}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-1">
                        {log.summary}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-500">
                        {formatDateTime(new Date(log.operatedAt))}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {getOperatorRoleLabel(log.operatorRole)} · {log.operatorName}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedLog && (
          <div className="fixed inset-0 z-60 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setSelectedLog(null)}
            ></div>
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h4 className="font-semibold text-slate-800">日志详情</h4>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 py-4 space-y-4 max-h-96 overflow-y-auto">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">操作类型</label>
                  <p className="text-sm text-slate-800 font-medium">
                    {OPERATION_TYPE_LABELS[selectedLog.operationType]}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">操作对象</label>
                  <p className="text-sm text-slate-800">
                    {OPERATION_TARGET_TYPE_LABELS[selectedLog.targetType]} · {selectedLog.targetName}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">操作人</label>
                  <p className="text-sm text-slate-800">
                    {getOperatorRoleLabel(selectedLog.operatorRole)} · {selectedLog.operatorName}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">操作时间</label>
                  <p className="text-sm text-slate-800">
                    {formatDateTime(new Date(selectedLog.operatedAt))}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">操作摘要</label>
                  <p className="text-sm text-slate-800">{selectedLog.summary}</p>
                </div>
                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">详细信息</label>
                    <div className="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-700 break-all">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
