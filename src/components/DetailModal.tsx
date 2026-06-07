import { useState, useEffect, useRef, useMemo } from 'react';
import { X, User, MessageSquare, Send, CheckCircle, Printer, FileText, ChevronDown, AlertTriangle, AlertCircle, TrendingUp, Trash2, Lock, UserCheck, UserPlus, Clock } from 'lucide-react';
import StatusBadge from './StatusBadge';
import HandleTimeline from './HandleTimeline';
import PrintReceipt from './PrintReceipt';
import type { Complaint, HandleFormData, AssignmentFormData, HandlerUser } from '@/types/complaint';
import { STATUS_OPTIONS, COMPLAINT_TYPES } from '@/types/complaint';
import { getCurrentDateTime, formatDateInput, formatDateTime } from '@/utils/helpers';
import { calculateOverdueInfo, formatHours } from '@/utils/overdue';
import { getTemplatesByType, getTemplates } from '@/utils/replyTemplate';
import type { ReplyTemplate } from '@/types/replyTemplate';
import type { UserRole } from '@/utils/permissions';
import { hasPermission, getDisabledReason } from '@/utils/permissions';

interface DetailModalProps {
  complaint: Complaint | null;
  onClose: () => void;
  onHandle: (id: string, data: HandleFormData) => void;
  onEscalate: (id: string, reason: string) => void;
  onDelete?: (id: string) => void;
  onAssign?: (id: string, data: AssignmentFormData) => void;
  now?: Date;
  currentRole: UserRole;
  timeLimitRulesVersion?: number;
  handlers?: HandlerUser[];
  currentHandlerId?: string;
}

export default function DetailModal({ complaint, onClose, onHandle, onEscalate, onDelete, onAssign, now, currentRole, timeLimitRulesVersion, handlers = [], currentHandlerId }: DetailModalProps) {
  const canUpdateStatus = hasPermission(currentRole, 'update_status');
  const canUpdateOpinion = hasPermission(currentRole, 'update_handle_opinion');
  const canHandle = canUpdateStatus || canUpdateOpinion;
  const canEscalate = hasPermission(currentRole, 'escalate_complaint');
  const canDelete = hasPermission(currentRole, 'delete_complaint');
  const canPrint = hasPermission(currentRole, 'print_receipt');
  const canAssign = hasPermission(currentRole, 'assign_complaint');
  const canViewAll = hasPermission(currentRole, 'view_all_complaints');

  const handleDisabledReason = getDisabledReason(currentRole, 'update_status');
  const escalateDisabledReason = getDisabledReason(currentRole, 'escalate_complaint');
  const deleteDisabledReason = getDisabledReason(currentRole, 'delete_complaint');
  const printDisabledReason = getDisabledReason(currentRole, 'print_receipt');

  const [showPrint, setShowPrint] = useState(false);
  const [handleData, setHandleData] = useState<HandleFormData>({
    status: 'pending',
    handleOpinion: '',
    replyTime: '',
  });
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [templateFilterType, setTemplateFilterType] = useState<string>('all');
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignData, setAssignData] = useState<AssignmentFormData>({
    assigneeId: '',
    assigneeName: '',
    remark: '',
  });
  const templatePanelRef = useRef<HTMLDivElement>(null);

  const canHandleAssigned = useMemo(() => {
    if (!complaint) return false;
    if (canViewAll) return true;
    if (currentRole === 'handler') {
      return complaint.assigneeId === currentHandlerId;
    }
    return canHandle;
  }, [complaint, canViewAll, currentRole, currentHandlerId, canHandle]);

  const overdueInfo = useMemo(() => {
    if (!complaint) return null;
    return calculateOverdueInfo(complaint, now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complaint, now, timeLimitRulesVersion]);

  useEffect(() => {
    if (complaint) {
      setHandleData({
        status: complaint.status,
        handleOpinion: complaint.handleOpinion || '',
        replyTime: complaint.replyTime || '',
      });
    }
  }, [complaint]);

  const handleStatusChange = (status: typeof handleData.status) => {
    if (!canUpdateStatus) return;
    setHandleData((prev) => {
      const next = { ...prev, status };
      if (status === 'replied' && !prev.replyTime) {
        next.replyTime = getCurrentDateTime();
      }
      return next;
    });
  };

  const templates = useMemo(() => {
    if (templateFilterType === 'all') {
      return getTemplates();
    }
    return getTemplatesByType(templateFilterType);
  }, [templateFilterType]);

  const handleSelectTemplate = (template: ReplyTemplate) => {
    if (!canUpdateOpinion) return;
    setHandleData((prev) => ({
      ...prev,
      handleOpinion: prev.handleOpinion
        ? prev.handleOpinion + '\n' + template.content
        : template.content,
    }));
    setShowTemplatePanel(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (templatePanelRef.current && !templatePanelRef.current.contains(e.target as Node)) {
        setShowTemplatePanel(false);
      }
    };
    if (showTemplatePanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTemplatePanel]);

  if (!complaint) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canHandle || !canHandleAssigned) return;
    onHandle(complaint.id, handleData);
  };

  const handleDelete = () => {
    if (!canDelete || !onDelete) return;
    if (confirm('确定要删除这条诉求记录吗？此操作不可恢复。')) {
      onDelete(complaint.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden transition-all duration-200">
        <div className={`sticky top-0 border-b px-6 py-4 flex items-center justify-between z-10 ${
          overdueInfo?.isOverdue ? 'bg-red-50 border-red-200' :
          overdueInfo?.isWarning ? 'bg-amber-50 border-amber-200' :
          'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-900">诉求详情</h3>
            <StatusBadge status={complaint.status} />
            {overdueInfo?.isOverdue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded">
                <AlertCircle className="w-3.5 h-3.5" />
                已超期
              </span>
            )}
            {overdueInfo?.isWarning && !overdueInfo?.isOverdue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded">
                <AlertTriangle className="w-3.5 h-3.5" />
                即将超期
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button
                onClick={() => canPrint && setShowPrint(true)}
                disabled={!canPrint}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  canPrint
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                    : 'text-slate-400 bg-slate-100 cursor-not-allowed'
                }`}
                title={canPrint ? '打印回执' : printDisabledReason}
              >
                {!canPrint && <Lock className="w-3.5 h-3.5" />}
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">打印回执</span>
              </button>
              {!canPrint && (
                <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                  {printDisabledReason}
                </div>
              )}
            </div>

            <div className="relative group">
              <button
                onClick={handleDelete}
                disabled={!canDelete}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  canDelete
                    ? 'text-red-600 bg-red-50 hover:bg-red-100'
                    : 'text-slate-400 bg-slate-100 cursor-not-allowed'
                }`}
                title={canDelete ? '删除记录' : deleteDisabledReason}
              >
                {!canDelete && <Lock className="w-3.5 h-3.5" />}
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">删除</span>
              </button>
              {!canDelete && (
                <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                  {deleteDisabledReason}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            <div className="bg-slate-50 rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                基本信息
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">姓名：</span>
                  <span className="text-slate-900 font-medium">{complaint.name}</span>
                </div>
                <div>
                  <span className="text-slate-500">联系方式：</span>
                  <span className="text-slate-900 font-medium">{complaint.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500">诉求类型：</span>
                  <span className="text-blue-600 font-medium">{complaint.type}</span>
                </div>
                <div>
                  <span className="text-slate-500">来源渠道：</span>
                  <span className="text-slate-900 font-medium">{complaint.source}</span>
                </div>
                <div>
                  <span className="text-slate-500">受理时间：</span>
                  <span className="text-slate-900 font-medium">{complaint.receiveTime}</span>
                </div>
                <div>
                  <span className="text-slate-500">处理时限：</span>
                  <span className="text-slate-900 font-medium">{formatHours(overdueInfo?.timeLimitHours || 0)}</span>
                </div>
                <div>
                  <span className="text-slate-500">当前承办人：</span>
                  {complaint.assigneeName ? (
                    <span className="text-green-600 font-medium flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      {complaint.assigneeName}
                    </span>
                  ) : (
                    <span className="text-orange-500 font-medium flex items-center gap-1">
                      <UserPlus className="w-3.5 h-3.5" />
                      待分派
                    </span>
                  )}
                </div>
                {complaint.status !== 'replied' && (
                  <>
                    <div>
                      <span className="text-slate-500">截止时间：</span>
                      <span className={`font-medium ${
                        overdueInfo?.isOverdue ? 'text-red-600' :
                        overdueInfo?.isWarning ? 'text-amber-600' : 'text-slate-900'
                      }`}>{overdueInfo?.deadline}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">剩余时间：</span>
                      <span className={`font-medium ${
                        overdueInfo?.isOverdue ? 'text-red-600' :
                        overdueInfo?.isWarning ? 'text-amber-600' : 'text-slate-900'
                      }`}>
                        {overdueInfo?.isOverdue
                          ? `超期 ${formatHours(overdueInfo.overdueHours)}`
                          : formatHours(overdueInfo?.remainingHours || 0)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                诉求内容
              </h4>
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed">
                {complaint.content}
              </div>
            </div>

            <HandleTimeline records={complaint.handleRecords} />

            {complaint.escalationRecords && complaint.escalationRecords.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  升级历史
                </h4>
                <div className="space-y-2">
                  {complaint.escalationRecords.map((record, index) => (
                    <div
                      key={record.id}
                      className="bg-purple-50 border border-purple-200 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-purple-700">
                          第 {index + 1} 次升级
                        </span>
                        <span className="text-xs text-purple-500">
                          {record.escalatedAt}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{record.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {complaint.assignmentRecords && complaint.assignmentRecords.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-600" />
                  分派历史
                </h4>
                <div className="space-y-2">
                  {complaint.assignmentRecords.map((record, index) => (
                    <div
                      key={record.id}
                      className="bg-cyan-50 border border-cyan-200 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-cyan-700">
                          第 {index + 1} 次分派
                        </span>
                        <span className="text-xs text-cyan-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(new Date(record.assignedAt))}
                        </span>
                      </div>
                      <div className="text-sm text-slate-700 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-xs">承办人：</span>
                          <span className="font-medium text-cyan-700">{record.assigneeName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-xs">分派人：</span>
                          <span className="text-slate-600">{record.assignorName}</span>
                        </div>
                        {record.remark && (
                          <div className="pt-1 mt-1 border-t border-cyan-100">
                            <span className="text-slate-500 text-xs">备注：</span>
                            <span className="text-slate-600">{record.remark}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {complaint.status !== 'replied' && canAssign && (
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    setAssignData({
                      assigneeId: complaint.assigneeId || '',
                      assigneeName: complaint.assigneeName || '',
                      remark: '',
                    });
                    setShowAssignModal(true);
                  }}
                  className="w-full px-4 py-2.5 text-sm font-medium border rounded-lg transition-colors flex items-center justify-center gap-2 text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border-cyan-200"
                >
                  <UserPlus className="w-4 h-4" />
                  {complaint.assigneeName ? '更改承办人' : '分派承办人'}
                </button>
              </div>
            )}

            {complaint.status !== 'replied' && (
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    if (!canEscalate || !canHandleAssigned) return;
                    setEscalateReason('');
                    setShowEscalateModal(true);
                  }}
                  disabled={!canEscalate || !canHandleAssigned}
                  className={`w-full px-4 py-2.5 text-sm font-medium border rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    canEscalate && canHandleAssigned
                      ? 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200'
                      : 'text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed'
                  }`}
                >
                  {!canEscalate && <Lock className="w-4 h-4" />}
                  <TrendingUp className="w-4 h-4" />
                  升级处理
                  {!canEscalate && <span className="text-xs opacity-70">（无权限）</span>}
                </button>
                {!canEscalate && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                    {escalateDisabledReason}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-600" />
                  处理操作
                </h4>
                {!canHandleAssigned && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-md ring-1 ring-amber-200">
                    <Lock className="w-3 h-3" />
                    {currentRole === 'handler' && complaint?.assigneeId !== currentHandlerId ? '非您承办' : '无处理权限'}
                  </span>
                )}
              </div>

              {!canHandleAssigned && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-amber-800">
                      <p className="font-medium">
                        {currentRole === 'handler' && complaint?.assigneeId !== currentHandlerId
                          ? '该诉求未分派给您'
                          : '处理功能已禁用'}
                      </p>
                      <p className="mt-0.5 opacity-80">
                        {currentRole === 'handler' && complaint?.assigneeId !== currentHandlerId
                          ? '您只能处理分派给您的诉求'
                          : handleDisabledReason}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  更新状态
                </label>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleStatusChange(opt.value)}
                      disabled={!canUpdateStatus || !canHandleAssigned}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                        handleData.status === opt.value
                          ? opt.color === 'red'
                            ? 'bg-red-50 border-red-300 text-red-700'
                            : opt.color === 'blue'
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-green-50 border-green-300 text-green-700'
                          : canUpdateStatus && canHandleAssigned
                          ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                          : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative" ref={templatePanelRef}>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    处理意见
                  </label>
                  <button
                    type="button"
                    onClick={() => canUpdateOpinion && canHandleAssigned && setShowTemplatePanel(!showTemplatePanel)}
                    disabled={!canUpdateOpinion || !canHandleAssigned}
                    className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                      canUpdateOpinion && canHandleAssigned
                        ? 'text-blue-600 hover:text-blue-700'
                        : 'text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    使用模板
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTemplatePanel ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <textarea
                  value={handleData.handleOpinion}
                  onChange={(e) =>
                    canUpdateOpinion && canHandleAssigned && setHandleData((prev) => ({ ...prev, handleOpinion: e.target.value }))
                  }
                  placeholder={canUpdateOpinion && canHandleAssigned ? '请输入处理意见和回复内容...' : '无权限填写处理意见'}
                  rows={4}
                  disabled={!canUpdateOpinion || !canHandleAssigned}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none ${
                    canUpdateOpinion && canHandleAssigned
                      ? 'border-slate-300'
                      : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                  }`}
                />

                {showTemplatePanel && canUpdateOpinion && canHandleAssigned && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                    <div className="flex border-b border-slate-100 overflow-x-auto">
                      <button
                        type="button"
                        onClick={() => setTemplateFilterType('all')}
                        className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                          templateFilterType === 'all'
                            ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        全部
                      </button>
                      {COMPLAINT_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setTemplateFilterType(type)}
                          className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                            templateFilterType === type
                              ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {templates.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          暂无该类型的模板
                        </div>
                      ) : (
                        <div className="p-1">
                          {templates.map((template) => (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => handleSelectTemplate(template)}
                              className="w-full text-left p-2 rounded-md hover:bg-blue-50 transition-colors group"
                            >
                              <div className="text-xs font-medium text-slate-700 group-hover:text-blue-700 flex items-center gap-2">
                                <span className="inline-block px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-500 rounded">
                                  {template.type}
                                </span>
                                {template.title}
                              </div>
                              <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                                {template.content}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  回复时间
                </label>
                <input
                  type="datetime-local"
                  value={handleData.replyTime ? formatDateInput(new Date(handleData.replyTime.replace(' ', 'T'))) : ''}
                  onChange={(e) => {
                    if (!canUpdateStatus || !canHandleAssigned) return;
                    const val = e.target.value;
                    setHandleData((prev) => ({
                      ...prev,
                      replyTime: val ? val.replace('T', ' ') : '',
                    }));
                  }}
                  disabled={!canUpdateStatus || !canHandleAssigned}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    canUpdateStatus && canHandleAssigned
                      ? 'border-slate-300'
                      : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                  }`}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  关闭
                </button>
                <button
                  type="submit"
                  disabled={!canHandle || !canHandleAssigned}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    canHandle && canHandleAssigned
                      ? 'text-white bg-blue-600 hover:bg-blue-700'
                      : 'text-slate-400 bg-slate-200 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  保存处理
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {showPrint && complaint && (
        <PrintReceipt complaint={complaint} onClose={() => setShowPrint(false)} />
      )}

      {showEscalateModal && complaint && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowEscalateModal(false)}
          ></div>

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                升级处理
              </h3>
              <button
                onClick={() => setShowEscalateModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-700">
                  升级后该诉求将标记为重点关注，并记录到升级历史中。请填写升级原因。
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  升级原因
                </label>
                <textarea
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="请填写升级原因..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEscalateModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (escalateReason.trim()) {
                      onEscalate(complaint.id, escalateReason.trim());
                      setShowEscalateModal(false);
                      setEscalateReason('');
                    }
                  }}
                  disabled={!escalateReason.trim()}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  确认升级
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAssignModal && complaint && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAssignModal(false)}
          ></div>

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-600" />
                {complaint.assigneeName ? '更改承办人' : '分派承办人'}
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                <p className="text-sm text-cyan-700">
                  {complaint.assigneeName
                    ? `当前承办人：${complaint.assigneeName}，请选择新的承办人。`
                    : '该诉求尚未分派承办人，请选择一位处理员负责此诉求。'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  选择承办人 <span className="text-red-500">*</span>
                </label>
                <select
                  value={assignData.assigneeId}
                  onChange={(e) => {
                    const handler = handlers.find((h) => h.id === e.target.value);
                    setAssignData({
                      ...assignData,
                      assigneeId: e.target.value,
                      assigneeName: handler?.name || '',
                    });
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                >
                  <option value="">请选择承办人</option>
                  {handlers.map((handler) => (
                    <option key={handler.id} value={handler.id}>
                      {handler.name}
                      {handler.department ? `（${handler.department}）` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  分派备注
                </label>
                <textarea
                  value={assignData.remark}
                  onChange={(e) => setAssignData((prev) => ({ ...prev, remark: e.target.value }))}
                  placeholder="请输入分派备注（可选）..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (assignData.assigneeId && onAssign) {
                      onAssign(complaint.id, {
                        assigneeId: assignData.assigneeId,
                        assigneeName: assignData.assigneeName,
                        remark: assignData.remark,
                      });
                      setShowAssignModal(false);
                    }
                  }}
                  disabled={!assignData.assigneeId}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  确认分派
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
