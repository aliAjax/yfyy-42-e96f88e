import { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Clock, AlertTriangle, Calendar, Settings, Plus, Trash2 } from 'lucide-react';
import { COMPLAINT_TYPES, SOURCE_CHANNELS } from '@/types/complaint';
import type { TimeLimitRule, WorkTimeRule, HolidayItem, DayOfWeek } from '@/types/complaint';
import { getTimeLimitRules, saveTimeLimitRules, getDefaultTimeLimitHours, getDefaultWarningHours, getWorkTimeRule, saveWorkTimeRule } from '@/utils/overdue';
import { logOperation } from '@/utils/operationLog';

interface TimeLimitRuleManageModalProps {
  onClose: () => void;
  onSave?: () => void;
}

const DAY_LABELS: Record<DayOfWeek, string> = {
  0: '周日',
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
};

export default function TimeLimitRuleManageModal({ onClose, onSave }: TimeLimitRuleManageModalProps) {
  const [activeTab, setActiveTab] = useState<'rules' | 'worktime'>('rules');
  const [rules, setRules] = useState<TimeLimitRule[]>([]);
  const [workTimeRule, setWorkTimeRule] = useState<WorkTimeRule | null>(null);
  const [rulesHasChanges, setRulesHasChanges] = useState(false);
  const [workTimeHasChanges, setWorkTimeHasChanges] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');

  useEffect(() => {
    setRules(getTimeLimitRules());
    setWorkTimeRule(getWorkTimeRule());
  }, []);

  const handleTimeLimitChange = (id: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;
    setRules((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, timeLimitHours: numValue } : r));
      setRulesHasChanges(true);
      return updated;
    });
  };

  const handleWarningHoursChange = (id: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;
    setRules((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, warningHours: numValue } : r));
      setRulesHasChanges(true);
      return updated;
    });
  };

  const handleUseWorkTimeChange = (id: string, checked: boolean) => {
    setRules((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, useWorkTime: checked } : r));
      setRulesHasChanges(true);
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
          useWorkTime: false,
        });
      }
    }
    setRules(defaultRules);
    setRulesHasChanges(true);
  };

  const handleSaveRules = () => {
    saveTimeLimitRules(rules);
    setRulesHasChanges(false);
  };

  const handleWorkTimeEnabledChange = (checked: boolean) => {
    if (!workTimeRule) return;
    setWorkTimeRule({ ...workTimeRule, enabled: checked });
    setWorkTimeHasChanges(true);
  };

  const handleWorkDayEnabledChange = (dayOfWeek: DayOfWeek, enabled: boolean) => {
    if (!workTimeRule) return;
    const newWorkDays = workTimeRule.workDays.map((d) =>
      d.dayOfWeek === dayOfWeek ? { ...d, enabled } : d
    );
    setWorkTimeRule({ ...workTimeRule, workDays: newWorkDays });
    setWorkTimeHasChanges(true);
  };

  const handleSlotTimeChange = (dayOfWeek: DayOfWeek, slotIndex: number, field: 'startTime' | 'endTime', value: string) => {
    if (!workTimeRule) return;
    const newWorkDays = workTimeRule.workDays.map((d) => {
      if (d.dayOfWeek !== dayOfWeek) return d;
      const newSlots = [...d.slots];
      newSlots[slotIndex] = { ...newSlots[slotIndex], [field]: value };
      return { ...d, slots: newSlots };
    });
    setWorkTimeRule({ ...workTimeRule, workDays: newWorkDays });
    setWorkTimeHasChanges(true);
  };

  const handleAddSlot = (dayOfWeek: DayOfWeek) => {
    if (!workTimeRule) return;
    const newWorkDays = workTimeRule.workDays.map((d) => {
      if (d.dayOfWeek !== dayOfWeek) return d;
      return { ...d, slots: [...d.slots, { startTime: '09:00', endTime: '18:00' }] };
    });
    setWorkTimeRule({ ...workTimeRule, workDays: newWorkDays });
    setWorkTimeHasChanges(true);
  };

  const handleRemoveSlot = (dayOfWeek: DayOfWeek, slotIndex: number) => {
    if (!workTimeRule) return;
    const newWorkDays = workTimeRule.workDays.map((d) => {
      if (d.dayOfWeek !== dayOfWeek) return d;
      const newSlots = d.slots.filter((_, i) => i !== slotIndex);
      return { ...d, slots: newSlots };
    });
    setWorkTimeRule({ ...workTimeRule, workDays: newWorkDays });
    setWorkTimeHasChanges(true);
  };

  const handleAddHoliday = () => {
    if (!workTimeRule || !newHolidayDate) return;
    if (workTimeRule.holidays.some((h) => h.date === newHolidayDate)) {
      alert('该日期已添加为节假日');
      return;
    }
    const newHoliday: HolidayItem = {
      date: newHolidayDate,
      name: newHolidayName || '节假日',
    };
    setWorkTimeRule({
      ...workTimeRule,
      holidays: [...workTimeRule.holidays, newHoliday].sort((a, b) => a.date.localeCompare(b.date)),
    });
    setNewHolidayDate('');
    setNewHolidayName('');
    setWorkTimeHasChanges(true);
  };

  const handleRemoveHoliday = (date: string) => {
    if (!workTimeRule) return;
    setWorkTimeRule({
      ...workTimeRule,
      holidays: workTimeRule.holidays.filter((h) => h.date !== date),
    });
    setWorkTimeHasChanges(true);
  };

  const handleResetWorkTime = () => {
    if (!confirm('确定要将工作时间设置重置为默认值吗？')) return;
    const defaultRule = getWorkTimeRule();
    setWorkTimeRule(defaultRule);
    setWorkTimeHasChanges(true);
  };

  const handleSaveWorkTime = () => {
    if (!workTimeRule) return;
    saveWorkTimeRule(workTimeRule);
    setWorkTimeHasChanges(false);
  };

  const handleSaveAll = () => {
    const actions: string[] = [];
    if (rulesHasChanges) {
      handleSaveRules();
      actions.push('时限规则');
    }
    if (workTimeHasChanges) {
      handleSaveWorkTime();
      actions.push('工作时间规则');
    }
    if (actions.length > 0) {
      logOperation({
        operationType: 'manage_time_limit_rule',
        targetType: 'time_limit_rule',
        targetId: 'system',
        targetName: '时限规则',
        summary: `更新${actions.join('和')}`,
        details: { rulesCount: rules.length, hasWorkTimeRule: workTimeRule?.enabled },
      });
    }
    if (onSave) {
      onSave();
    }
    onClose();
  };

  const hasChanges = rulesHasChanges || workTimeHasChanges;

  const getRulesByType = (type: string) => {
    return rules.filter((r) => r.type === type);
  };

  const sortedWorkDays = workTimeRule
    ? [...workTimeRule.workDays].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    : [];

  const sortedHolidays = workTimeRule
    ? [...workTimeRule.holidays].sort((a, b) => a.date.localeCompare(b.date))
    : [];

  function isValidWorkTimeSlot(slot: { startTime: string; endTime: string }): boolean {
    if (!slot.startTime || !slot.endTime) return false;
    const [startH, startM] = slot.startTime.split(':').map(Number);
    const [endH, endM] = slot.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return endMinutes > startMinutes;
  }

  function hasValidWorkDay(rule: WorkTimeRule): boolean {
    return rule.workDays.some(
      (d) => d.enabled && d.slots.some(isValidWorkTimeSlot)
    );
  }

  const workTimeIsValid = workTimeRule ? hasValidWorkDay(workTimeRule) : false;
  const showWorkTimeWarning = workTimeRule?.enabled && !workTimeIsValid;

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
              <p className="text-sm text-slate-500">配置处理时限与工作时间规则</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 flex-shrink-0 px-6">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'rules'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            时限规则
          </button>
          <button
            onClick={() => setActiveTab('worktime')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'worktime'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            工作时间设置
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'rules' && (
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
                            <th className="pb-2 font-medium w-32">工作时间计算</th>
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
                              <td className="py-2">
                                <label className="inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={rule.useWorkTime || false}
                                    onChange={(e) => handleUseWorkTimeChange(rule.id, e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                  />
                                  <span className="ml-2 text-xs text-slate-600">启用</span>
                                </label>
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

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">温馨提示</p>
                    <p className="mt-1 text-amber-700 opacity-90">
                      修改时限规则后，所有诉求的超期状态、剩余时间、统计数据将立即按新规则重新计算。
                      预警时长应小于处理时限，否则预警将不会生效。
                      启用"工作时间计算"后，将仅在工作日的工作时段内累计计时。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'worktime' && workTimeRule && (
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700">工作时间计算</h4>
                      <p className="text-xs text-slate-500">启用后，超期时间将仅在工作时段内累计</p>
                    </div>
                  </div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={workTimeRule.enabled}
                      onChange={(e) => handleWorkTimeEnabledChange(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm font-medium text-slate-700">
                      {workTimeRule.enabled ? '已启用' : '未启用'}
                    </span>
                  </label>
                </div>
              </div>

              {showWorkTimeWarning && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <p className="font-medium">配置无效</p>
                      <p className="mt-1 text-red-700 opacity-90">
                        工作时间功能已启用，但没有配置任何有效的工作日时段。请至少启用一个工作日并配置有效的工作时段，否则相关诉求将回退为自然小时计算。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-indigo-500"></span>
                  工作日设置
                </h4>
                <div className="space-y-3">
                  {sortedWorkDays.map((workDay) => (
                    <div
                      key={workDay.dayOfWeek}
                      className={`p-3 rounded-lg border transition-all ${
                        workDay.enabled
                          ? 'bg-white border-indigo-200'
                          : 'bg-slate-100 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={workDay.enabled}
                            onChange={(e) => handleWorkDayEnabledChange(workDay.dayOfWeek, e.target.checked)}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm font-medium text-slate-700">
                            {DAY_LABELS[workDay.dayOfWeek]}
                          </span>
                        </label>
                        {workDay.enabled && (
                          <button
                            onClick={() => handleAddSlot(workDay.dayOfWeek)}
                            className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            添加时段
                          </button>
                        )}
                      </div>
                      {workDay.enabled && workDay.slots.length > 0 && (
                        <div className="space-y-2 pl-6">
                          {workDay.slots.map((slot, slotIndex) => {
                            const slotValid = isValidWorkTimeSlot(slot);
                            return (
                              <div key={slotIndex} className="flex items-center gap-2">
                                <input
                                  type="time"
                                  value={slot.startTime}
                                  onChange={(e) =>
                                    handleSlotTimeChange(workDay.dayOfWeek, slotIndex, 'startTime', e.target.value)
                                  }
                                  className={`px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                                    slotValid ? 'border-slate-300' : 'border-red-400 bg-red-50'
                                  }`}
                                />
                                <span className="text-slate-400 text-xs">至</span>
                                <input
                                  type="time"
                                  value={slot.endTime}
                                  onChange={(e) =>
                                    handleSlotTimeChange(workDay.dayOfWeek, slotIndex, 'endTime', e.target.value)
                                  }
                                  className={`px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                                    slotValid ? 'border-slate-300' : 'border-red-400 bg-red-50'
                                  }`}
                                />
                                {!slotValid && (
                                  <span className="text-xs text-red-500 flex-shrink-0">无效</span>
                                )}
                                {workDay.slots.length > 1 && (
                                  <button
                                    onClick={() => handleRemoveSlot(workDay.dayOfWeek, slotIndex)}
                                    className="text-red-400 hover:text-red-600 p-1"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {workDay.enabled && workDay.slots.length === 0 && (
                        <p className="text-xs text-slate-400 pl-6">请添加工作时段</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-indigo-500"></span>
                  节假日设置
                </h4>
                <div className="flex items-end gap-2 mb-4">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">日期</label>
                    <input
                      type="date"
                      value={newHolidayDate}
                      onChange={(e) => setNewHolidayDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">名称（可选）</label>
                    <input
                      type="text"
                      value={newHolidayName}
                      onChange={(e) => setNewHolidayName(e.target.value)}
                      placeholder="如：元旦"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <button
                    onClick={handleAddHoliday}
                    disabled={!newHolidayDate}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    添加
                  </button>
                </div>
                {sortedHolidays.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {sortedHolidays.map((holiday) => (
                      <div
                        key={holiday.date}
                        className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-slate-700">{holiday.date}</span>
                          <span className="text-xs text-slate-500">{holiday.name}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveHoliday(holiday.date)}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">暂无节假日设置</p>
                )}
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">温馨提示</p>
                    <p className="mt-1 text-amber-700 opacity-90">
                      工作时间规则全局生效，需要配合每条时限规则的"工作时间计算"开关使用。
                      只有当全局开关和单条规则开关都开启时，该规则才会按工作时间计算超期。
                      节假日优先级高于工作日设置，即使是工作日如果被设为节假日也不计入工作时间。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <button
            onClick={activeTab === 'rules' ? handleResetToDefault : handleResetWorkTime}
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
              onClick={handleSaveAll}
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
