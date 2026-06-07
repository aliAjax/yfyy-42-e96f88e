import { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Clock, AlertTriangle } from 'lucide-react';
import { COMPLAINT_TYPES, SOURCE_CHANNELS } from '@/types/complaint';
import type { TimeLimitRule } from '@/types/complaint';
import { getTimeLimitRules, saveTimeLimitRules, getDefaultTimeLimitHours, getDefaultWarningHours } from '@/utils/overdue';

interface TimeLimitRuleManageModalProps {
  onClose: () => void;
  onSave?: () => void;
}

export default function TimeLimitRuleManageModal({ onClose, onSave }: TimeLimitRuleManageModalProps) {
  const [rules, setRules] = useState<TimeLimitRule[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setRules(getTimeLimitRules());
  }, []);

  const handleTimeLimitChange = (id: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;
    setRules((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, timeLimitHours: numValue } : r));
      setHasChanges(true);
      return updated;
    });
  };

  const handleWarningHoursChange = (id: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;
    setRules((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, warningHours: numValue } : r));
      setHasChanges(true);
      return updated;
    });
  };

  const handleResetToDefault = () => {
    if (!confirm('确定要将所有时限规则重置为默认值吗？')) return;
    const defaultRules: TimeLimitRule[] = [];
    let id = 1;
    for (const type of COMPLAINT_TYPES) {
      for (const source of SOURCE_CHANNELS) {
        defaultRules.push({
          id: `rule-${id++}`,
          type,
          source,
          timeLimitHours: getDefaultTimeLimitHours(type, source),
          warningHours: getDefaultWarningHours(type, source),
        });
      }
    }
    setRules(defaultRules);
    setHasChanges(true);
  };

  const handleSave = () => {
    saveTimeLimitRules(rules);
    setHasChanges(false);
    if (onSave) {
      onSave();
    }
  };

  const getRulesByType = (type: string) => {
    return rules.filter((r) => r.type === type);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">时限规则管理</h3>
              <p className="text-sm text-slate-500">按诉求类型和来源渠道配置处理时限与预警时长</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {COMPLAINT_TYPES.map((type) => {
              const typeRules = getRulesByType(type);
              return (
                <div key={type} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-indigo-500"></span>
                    {type}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                          <th className="pb-2 pl-2 font-medium">来源渠道</th>
                          <th className="pb-2 font-medium w-36">处理时限（小时）</th>
                          <th className="pb-2 font-medium w-36">预警时长（小时）</th>
                          <th className="pb-2 pr-2 font-medium w-28">说明</th>
                        </tr>
                      </thead>
                      <tbody>
                        {typeRules.map((rule) => (
                          <tr key={rule.id} className="border-b border-slate-100 last:border-0">
                            <td className="py-2 pl-2 text-slate-700 font-medium">{rule.source}</td>
                            <td className="py-2">
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={rule.timeLimitHours}
                                onChange={(e) => handleTimeLimitChange(rule.id, e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                              />
                            </td>
                            <td className="py-2">
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={rule.warningHours}
                                onChange={(e) => handleWarningHoursChange(rule.id, e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                              />
                            </td>
                            <td className="py-2 pr-2 text-xs text-slate-400">
                              剩余 {rule.warningHours} 小时内预警
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">温馨提示</p>
                <p className="mt-1 text-amber-700 opacity-90">
                  修改时限规则后，所有诉求的超期状态、剩余时间、统计数据将立即按新规则重新计算。
                  预警时长应小于处理时限，否则预警将不会生效。
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <button
            onClick={handleResetToDefault}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            重置默认
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              保存规则
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
