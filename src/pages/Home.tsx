import { useState, useEffect, useMemo } from 'react';
import { BarChart3, X, Upload, FileText, Lock, Database, Clock, ScrollText } from 'lucide-react';
import Header from '@/components/Header';
import ComplaintForm from '@/components/ComplaintForm';
import ComplaintList from '@/components/ComplaintList';
import DetailModal from '@/components/DetailModal';
import AnalysisDashboard from '@/components/AnalysisDashboard';
import ImportModal from '@/components/ImportModal';
import DuplicateGroupModal from '@/components/DuplicateGroupModal';
import ReplyTemplateManageModal from '@/components/ReplyTemplateManageModal';
import BackupRestoreModal from '@/components/BackupRestoreModal';
import TimeLimitRuleManageModal from '@/components/TimeLimitRuleManageModal';
import OperationLogModal from '@/components/OperationLogModal';
import { calculateAnalysisStats } from '@/utils/stats';
import { calculateOverdueCount } from '@/utils/overdue';
import { exportComplaintsToCSV } from '@/utils/csvExport';
import { getHandlers, getCurrentHandler, setCurrentHandlerId } from '@/utils/handlers';
import { mergeComplaints, getMasterComplaint } from '@/utils/merge';
import { logOperation as recordOperationLog } from '@/utils/operationLog';
import { useComplaints } from '@/hooks/useComplaints';
import type { Complaint, ComplaintFormData, HandleFormData, ComplaintStatus, AssignmentFormData, HandlerUser, BatchStatusData, VisitBackFormData, AnalysisFilter, ViewFilter } from '@/types/complaint';
import { DEFAULT_ANALYSIS_FILTER } from '@/types/complaint';
import { hasPermission, getDisabledReason, ROLE_LABELS } from '@/utils/permissions';
import type { UserRole } from '@/utils/permissions';
import type { OperatorContext } from '@/utils/complaintMutations';

const STORAGE_KEY = 'complaint_records';
const ROLE_STORAGE_KEY = 'current_role';

export default function Home() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTemplateManage, setShowTemplateManage] = useState(false);
  const [showBackupRestore, setShowBackupRestore] = useState(false);
  const [showTimeLimitManage, setShowTimeLimitManage] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateModalComplaintId, setDuplicateModalComplaintId] = useState<string | null>(null);
  const [showMerged, setShowMerged] = useState(false);
  const [showOperationLog, setShowOperationLog] = useState(false);
  const [timeLimitRulesVersion, setTimeLimitRulesVersion] = useState(0);
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [handlers, setHandlers] = useState<HandlerUser[]>([]);
  const [currentHandlerId, setCurrentHandlerIdState] = useState<string>('');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const [now, setNow] = useState<Date>(new Date());
  const [analysisFilter, setAnalysisFilter] = useState<AnalysisFilter>({ ...DEFAULT_ANALYSIS_FILTER });
  const [drilledFilter, setDrilledFilter] = useState<ViewFilter | null>(null);

  const {
    complaints,
    selectedComplaint,
    setSelectedComplaint,
    addComplaint,
    batchImport,
    handleComplaint,
    escalateComplaint,
    assignComplaint,
    visitBackComplaint,
    deleteComplaint,
    batchHandle,
    batchEscalate,
    batchDelete,
    replaceComplaints,
    refreshFromStorage,
  } = useComplaints({ storageKey: STORAGE_KEY });

  const canViewStatistics = hasPermission(currentRole, 'view_statistics');
  const canManageTemplates = hasPermission(currentRole, 'manage_templates');
  const canManageTimeLimitRules = hasPermission(currentRole, 'manage_time_limit_rules');
  const canImport = hasPermission(currentRole, 'import_data');
  const canDelete = hasPermission(currentRole, 'delete_complaint');
  const canBackupRestore = hasPermission(currentRole, 'backup_restore');
  const canViewAll = hasPermission(currentRole, 'view_all_complaints');
  const canMerge = hasPermission(currentRole, 'merge_complaint');
  const canViewMerged = hasPermission(currentRole, 'view_merged_complaints');
  const canViewOperationLogs = hasPermission(currentRole, 'view_operation_logs');

  const visibleComplaints = useMemo(() => {
    let result = complaints;
    if (!canViewAll) {
      result = currentHandlerId ? complaints.filter((c) => c.assigneeId === currentHandlerId) : [];
    }
    if (!showMerged) {
      result = result.filter((c) => c.mergeStatus !== 'merged');
    }
    return result;
  }, [complaints, canViewAll, currentHandlerId, showMerged]);

  const analysisStats = useMemo(
    () => calculateAnalysisStats(visibleComplaints, analysisFilter, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleComplaints, analysisFilter, now, timeLimitRulesVersion]
  );

  const overdueCount = useMemo(
    () => calculateOverdueCount(visibleComplaints, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleComplaints, now, timeLimitRulesVersion]
  );

  useEffect(() => {
    const storedRole = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole;
    if (storedRole && ['registrar', 'handler', 'admin'].includes(storedRole)) {
      setCurrentRole(storedRole);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(ROLE_STORAGE_KEY, currentRole);
  }, [currentRole]);

  useEffect(() => {
    const loadedHandlers = getHandlers();
    setHandlers(loadedHandlers);
    const currentHandler = getCurrentHandler();
    if (currentHandler) {
      setCurrentHandlerIdState(currentHandler.id);
    } else if (loadedHandlers.length > 0) {
      setCurrentHandlerIdState(loadedHandlers[0].id);
    }
  }, []);

  const currentHandler = useMemo(() => {
    return handlers.find((h) => h.id === currentHandlerId) || null;
  }, [handlers, currentHandlerId]);

  const operatorContext = useMemo((): OperatorContext => {
    const operatorName = currentRole === 'handler'
      ? currentHandler?.name || ROLE_LABELS[currentRole]
      : ROLE_LABELS[currentRole];
    const operatorId = currentRole === 'handler' ? currentHandlerId : currentRole;
    return { operatorName, operatorId };
  }, [currentRole, currentHandler, currentHandlerId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 2500);
  };

  const logOperation = (
    operationType: Parameters<typeof recordOperationLog>['0']['operationType'],
    targetType: Parameters<typeof recordOperationLog>['0']['targetType'],
    targetId: string,
    targetName: string,
    summary: string,
    details?: Record<string, unknown>
  ) => {
    recordOperationLog({
      operationType,
      targetType,
      targetId,
      targetName,
      summary,
      details,
    });
  };

  const handleRoleChange = (role: UserRole) => {
    logOperation(
      'switch_role',
      'role',
      role,
      ROLE_LABELS[role],
      `从${ROLE_LABELS[currentRole]}切换为${ROLE_LABELS[role]}`,
      { fromRole: currentRole, toRole: role }
    );
    setCurrentRole(role);
    showToast(`已切换为${ROLE_LABELS[role]}角色`, 'success');
  };

  const handleCurrentHandlerChange = (handlerId: string) => {
    const handler = handlers.find((h) => h.id === handlerId);
    const oldHandler = handlers.find((h) => h.id === currentHandlerId);
    if (handler) {
      logOperation(
        'switch_handler',
        'handler',
        handlerId,
        handler.name,
        `从${oldHandler?.name || '未选择'}切换为处理员：${handler.name}`,
        { fromHandlerId: currentHandlerId, toHandlerId: handlerId }
      );
    }
    setCurrentHandlerIdState(handlerId);
    setCurrentHandlerId(handlerId);
    if (handler) {
      showToast(`已切换为处理员：${handler.name}`, 'success');
    }
  };

  const canOperateComplaint = (complaint: { id: string; assigneeId?: string }) => {
    if (canViewAll) return true;
    if (currentRole === 'handler') {
      return !!currentHandlerId && complaint.assigneeId === currentHandlerId;
    }
    return true;
  };

  const handleAddComplaint = (data: ComplaintFormData) => {
    if (!hasPermission(currentRole, 'create_complaint')) {
      showToast('无新增诉求权限', 'error');
      return;
    }
    const newComplaint = addComplaint(data);
    logOperation(
      'create_complaint',
      'complaint',
      newComplaint.id,
      data.name,
      `新增诉求：${data.name}（${data.type}），来源：${data.source}`,
      { type: data.type, source: data.source }
    );
    showToast('诉求登记成功！');
  };

  const handleBatchImport = (rows: ComplaintFormData[]) => {
    if (!hasPermission(currentRole, 'import_data')) {
      showToast('无批量导入权限', 'error');
      return;
    }
    batchImport(rows);
    setShowImportModal(false);
    logOperation(
      'import_complaints',
      'complaint',
      'batch',
      '批量导入',
      `批量导入 ${rows.length} 条诉求记录`,
      { count: rows.length }
    );
    showToast(`成功导入 ${rows.length} 条诉求！`);
  };

  const handleExport = (filteredComplaints: Complaint[]) => {
    if (!hasPermission(currentRole, 'export_data')) {
      showToast('无导出数据权限', 'error');
      return;
    }
    const result = exportComplaintsToCSV(filteredComplaints);
    if (result.success) {
      logOperation(
        'export_complaints',
        'complaint',
        'export',
        '数据导出',
        `导出 ${filteredComplaints.length} 条诉求记录`,
        { count: filteredComplaints.length }
      );
    }
    showToast(result.message, result.success ? 'success' : 'error');
  };

  const handleAnalysisDrillDown = (viewFilter: ViewFilter) => {
    setDrilledFilter(viewFilter);
    setShowDashboard(false);
    showToast('已跳转到列表并应用筛选条件', 'success');
  };

  const handleAnalysisFilterChange = (filter: AnalysisFilter) => {
    setAnalysisFilter(filter);
  };

  const handleViewDuplicates = (complaintId: string) => {
    setDuplicateModalComplaintId(complaintId);
    setShowDuplicateModal(true);
  };

  const handleMergeComplaints = (masterId: string, mergedIds: string[], mergeReason?: string) => {
    if (!canMerge) {
      showToast('无合并诉求权限', 'error');
      return;
    }

    const masterComplaint = complaints.find((c) => c.id === masterId);
    const complaintsToMerge = complaints.filter((c) => mergedIds.includes(c.id));

    if (!masterComplaint || complaintsToMerge.length === 0) {
      showToast('合并参数错误', 'error');
      return;
    }

    const mergedResults = mergeComplaints(masterComplaint, complaintsToMerge, operatorContext.operatorName, mergeReason);

    const mergedIdsSet = new Set([masterId, ...mergedIds]);
    const otherComplaints = complaints.filter((c) => !mergedIdsSet.has(c.id));

    const updatedComplaints = [...otherComplaints, ...mergedResults];

    replaceComplaints(updatedComplaints);

    const updatedMaster = mergedResults.find((c) => c.id === masterId);
    if (updatedMaster) {
      setSelectedComplaint(updatedMaster);
    }

    setShowDuplicateModal(false);
    logOperation(
      'merge_complaint',
      'complaint',
      masterId,
      masterComplaint.name,
      `合并 ${mergedIds.length} 条诉求到主诉求：${masterComplaint.name}`,
      { mergedCount: mergedIds.length, mergedIds, mergeReason }
    );
    showToast(`成功合并 ${mergedIds.length} 条诉求`);
  };

  const handleViewMaster = (complaintId: string) => {
    const master = getMasterComplaint(complaints, complaintId);
    if (master) {
      setSelectedComplaint(master);
    }
  };

  const handleComplaintAction = (id: string, data: HandleFormData) => {
    if (!hasPermission(currentRole, 'update_status') && !hasPermission(currentRole, 'update_handle_opinion')) {
      showToast('无处理权限', 'error');
      return;
    }
    const targetComplaint = complaints.find((c) => c.id === id);
    if (!targetComplaint) {
      showToast('诉求不存在', 'error');
      return;
    }
    if (!canOperateComplaint(targetComplaint)) {
      showToast('您只能处理分派给自己的诉求', 'error');
      return;
    }
    const statusLabel = data.status === 'pending' ? '待处理' : data.status === 'processing' ? '处理中' : '已回复';
    handleComplaint(id, data, operatorContext);
    logOperation(
      'handle_complaint',
      'complaint',
      id,
      targetComplaint.name,
      `处理诉求，状态更新为：${statusLabel}`,
      { status: data.status, handleOpinion: data.handleOpinion }
    );
    setSelectedComplaint(null);
    showToast('处理记录已保存！');
  };

  const handleEscalate = (id: string, reason: string) => {
    if (!hasPermission(currentRole, 'escalate_complaint')) {
      showToast('无升级处理权限', 'error');
      return;
    }
    const targetComplaint = complaints.find((c) => c.id === id);
    if (!targetComplaint) {
      showToast('诉求不存在', 'error');
      return;
    }
    if (!canOperateComplaint(targetComplaint)) {
      showToast('您只能升级分派给自己的诉求', 'error');
      return;
    }
    escalateComplaint(id, reason, ROLE_LABELS[currentRole]);
    logOperation(
      'escalate_complaint',
      'complaint',
      id,
      targetComplaint.name,
      `升级诉求，原因：${reason}`,
      { reason }
    );
    showToast('诉求已升级！');
  };

  const handleAssign = (id: string, data: AssignmentFormData) => {
    if (!hasPermission(currentRole, 'assign_complaint')) {
      showToast('无分派权限', 'error');
      return;
    }
    const targetComplaint = complaints.find((c) => c.id === id);
    assignComplaint(id, data, operatorContext);
    if (targetComplaint) {
      logOperation(
        'assign_complaint',
        'complaint',
        id,
        targetComplaint.name,
        `分派给 ${data.assigneeName}`,
        { assigneeId: data.assigneeId, assigneeName: data.assigneeName, remark: data.remark }
      );
    }
    showToast(`已分派给 ${data.assigneeName}`);
  };

  const handleVisitBack = (id: string, data: VisitBackFormData) => {
    if (!hasPermission(currentRole, 'manage_visit_back')) {
      showToast('无登记回访权限', 'error');
      return;
    }
    const targetComplaint = complaints.find((c) => c.id === id);
    if (!targetComplaint) {
      showToast('诉求不存在', 'error');
      return;
    }
    if (!canOperateComplaint(targetComplaint)) {
      showToast('您只能回访分派给自己的诉求', 'error');
      return;
    }

    visitBackComplaint(id, data, operatorContext);

    if (targetComplaint) {
      logOperation(
        'visit_back',
        'complaint',
        id,
        targetComplaint.name,
        data.reopenCase ? '回访登记，诉求重新进入处理流程' : `回访登记，满意度：${data.satisfaction}`,
        { satisfaction: data.satisfaction, isReopened: data.reopenCase, visitBackResult: data.visitBackResult }
      );
    }

    if (data.reopenCase) {
      showToast('回访登记成功，诉求已重新进入处理流程！');
    } else {
      showToast('回访登记成功！');
    }
  };

  const handleDelete = (id: string) => {
    if (!hasPermission(currentRole, 'delete_complaint')) {
      showToast('无删除记录权限', 'error');
      return;
    }
    const targetComplaint = complaints.find((c) => c.id === id);
    deleteComplaint(id);
    if (targetComplaint) {
      logOperation(
        'delete_complaint',
        'complaint',
        id,
        targetComplaint.name,
        `删除诉求：${targetComplaint.name}`,
        { type: targetComplaint.type, source: targetComplaint.source }
      );
    }
    showToast('诉求记录已删除');
  };

  const handleBatchUpdateStatus = (selectedComplaints: { id: string; assigneeId?: string; name?: string }[], data: BatchStatusData) => {
    if (!hasPermission(currentRole, 'update_status') && !hasPermission(currentRole, 'update_handle_opinion')) {
      showToast('无处理权限', 'error');
      return;
    }
    const operableComplaints = selectedComplaints.filter((c) => canOperateComplaint(c));
    if (operableComplaints.length === 0) {
      showToast('没有可操作的诉求', 'error');
      return;
    }
    const operableIds = operableComplaints.map((c) => c.id);
    batchHandle(operableIds, data, operatorContext);

    const skipped = selectedComplaints.length - operableComplaints.length;
    if (operableComplaints.length > 0) {
      logOperation(
        'handle_complaint',
        'complaint',
        'batch',
        '批量处理',
        `批量更新 ${operableComplaints.length} 条诉求状态为：${data.status}`,
        { count: operableComplaints.length, status: data.status }
      );
    }
    if (skipped > 0) {
      showToast(`成功更新 ${operableComplaints.length} 条，跳过 ${skipped} 条无权限的诉求`, 'success');
    } else {
      showToast(`成功更新 ${operableComplaints.length} 条诉求状态`);
    }
  };

  const handleBatchEscalate = (selectedComplaints: { id: string; assigneeId?: string; name?: string }[], reason: string) => {
    if (!hasPermission(currentRole, 'escalate_complaint')) {
      showToast('无升级处理权限', 'error');
      return;
    }
    const operableComplaints = selectedComplaints.filter((c) => canOperateComplaint(c));
    if (operableComplaints.length === 0) {
      showToast('没有可操作的诉求', 'error');
      return;
    }
    const operableIds = operableComplaints.map((c) => c.id);
    batchEscalate(operableIds, reason, ROLE_LABELS[currentRole]);

    const skipped = selectedComplaints.length - operableComplaints.length;
    if (operableComplaints.length > 0) {
      logOperation(
        'escalate_complaint',
        'complaint',
        'batch',
        '批量升级',
        `批量升级 ${operableComplaints.length} 条诉求，原因：${reason}`,
        { count: operableComplaints.length, reason }
      );
    }
    if (skipped > 0) {
      showToast(`成功升级 ${operableComplaints.length} 条，跳过 ${skipped} 条无权限的诉求`, 'success');
    } else {
      showToast(`成功升级 ${operableComplaints.length} 条诉求`);
    }
  };

  const handleBatchDelete = (selectedComplaints: { id: string; name?: string }[]) => {
    if (!hasPermission(currentRole, 'delete_complaint')) {
      showToast('无删除记录权限', 'error');
      return;
    }
    const idsToDelete = selectedComplaints.map((c) => c.id);
    batchDelete(idsToDelete);

    logOperation(
      'batch_delete',
      'complaint',
      'batch',
      '批量删除',
      `批量删除 ${selectedComplaints.length} 条诉求记录`,
      { count: selectedComplaints.length }
    );
    showToast(`已删除 ${selectedComplaints.length} 条诉求记录`);
  };

  const handleBatchExport = (selectedComplaints: Complaint[]) => {
    if (!hasPermission(currentRole, 'export_data')) {
      showToast('无导出数据权限', 'error');
      return;
    }
    const result = exportComplaintsToCSV(selectedComplaints);
    if (result.success) {
      logOperation(
        'export_complaints',
        'complaint',
        'batch',
        '批量导出',
        `批量导出 ${selectedComplaints.length} 条诉求记录`,
        { count: selectedComplaints.length }
      );
    }
    showToast(result.message, result.success ? 'success' : 'error');
  };

  const handleRestoreComplete = () => {
    refreshFromStorage();
    setTimeLimitRulesVersion((v) => v + 1);
    logOperation(
      'restore_data',
      'system',
      'restore',
      '数据恢复',
      '数据恢复完成',
      {}
    );
    showToast('数据恢复完成！');
  };

  const handleTimeLimitRulesSave = () => {
    setTimeLimitRulesVersion((v) => v + 1);
    showToast('时限规则已保存，统计数据已重新计算');
  };

  const counts: Record<ComplaintStatus, number> = {
    pending: visibleComplaints.filter((c) => c.status === 'pending').length,
    processing: visibleComplaints.filter((c) => c.status === 'processing').length,
    replied: visibleComplaints.filter((c) => c.status === 'replied').length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        counts={counts}
        overdueCount={overdueCount}
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        handlers={handlers}
        currentHandlerId={currentHandlerId}
        onHandlerChange={handleCurrentHandlerChange}
      />

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <ComplaintForm
              onSubmit={handleAddComplaint}
              existingComplaints={complaints}
              onViewDetail={setSelectedComplaint}
              currentRole={currentRole}
            />
          </div>

          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-base font-semibold text-slate-800">诉求管理</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative group">
                  <button
                    onClick={() => canBackupRestore && setShowBackupRestore(true)}
                    disabled={!canBackupRestore}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm ${
                      canBackupRestore
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    title={canBackupRestore ? '备份与恢复' : getDisabledReason(currentRole, 'backup_restore')}
                  >
                    {!canBackupRestore && <Lock className="w-3.5 h-3.5" />}
                    <Database className="w-4 h-4" />
                    备份恢复
                  </button>
                  {!canBackupRestore && (
                    <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      {getDisabledReason(currentRole, 'backup_restore')}
                    </div>
                  )}
                </div>

                <div className="relative group">
                  <button
                    onClick={() => canManageTemplates && setShowTemplateManage(true)}
                    disabled={!canManageTemplates}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm ${
                      canManageTemplates
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    title={canManageTemplates ? '模板管理' : getDisabledReason(currentRole, 'manage_templates')}
                  >
                    {!canManageTemplates && <Lock className="w-3.5 h-3.5" />}
                    <FileText className="w-4 h-4" />
                    模板管理
                  </button>
                  {!canManageTemplates && (
                    <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      {getDisabledReason(currentRole, 'manage_templates')}
                    </div>
                  )}
                </div>

                <div className="relative group">
                  <button
                    onClick={() => canManageTimeLimitRules && setShowTimeLimitManage(true)}
                    disabled={!canManageTimeLimitRules}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm ${
                      canManageTimeLimitRules
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    title={canManageTimeLimitRules ? '时限规则管理' : getDisabledReason(currentRole, 'manage_time_limit_rules')}
                  >
                    {!canManageTimeLimitRules && <Lock className="w-3.5 h-3.5" />}
                    <Clock className="w-4 h-4" />
                    时限规则
                  </button>
                  {!canManageTimeLimitRules && (
                    <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      {getDisabledReason(currentRole, 'manage_time_limit_rules')}
                    </div>
                  )}
                </div>

                <div className="relative group">
                  <button
                    onClick={() => canImport && setShowImportModal(true)}
                    disabled={!canImport}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm ${
                      canImport
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    title={canImport ? '批量导入' : getDisabledReason(currentRole, 'import_data')}
                  >
                    {!canImport && <Lock className="w-3.5 h-3.5" />}
                    <Upload className="w-4 h-4" />
                    批量导入
                  </button>
                  {!canImport && (
                    <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      {getDisabledReason(currentRole, 'import_data')}
                    </div>
                  )}
                </div>

                <div className="relative group">
                  <button
                    onClick={() => canViewStatistics && setShowDashboard(true)}
                    disabled={!canViewStatistics}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm ${
                      canViewStatistics
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    title={canViewStatistics ? '数据看板' : getDisabledReason(currentRole, 'view_statistics')}
                  >
                    {!canViewStatistics && <Lock className="w-3.5 h-3.5" />}
                    <BarChart3 className="w-4 h-4" />
                    数据看板
                  </button>
                  {!canViewStatistics && (
                    <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      {getDisabledReason(currentRole, 'view_statistics')}
                    </div>
                  )}
                </div>

                <div className="relative group">
                  <button
                    onClick={() => canViewOperationLogs && setShowOperationLog(true)}
                    disabled={!canViewOperationLogs}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm ${
                      canViewOperationLogs
                        ? 'bg-slate-700 hover:bg-slate-800 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    title={canViewOperationLogs ? '操作日志' : getDisabledReason(currentRole, 'view_operation_logs')}
                  >
                    {!canViewOperationLogs && <Lock className="w-3.5 h-3.5" />}
                    <ScrollText className="w-4 h-4" />
                    操作日志
                  </button>
                  {!canViewOperationLogs && (
                    <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      {getDisabledReason(currentRole, 'view_operation_logs')}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="h-[calc(100vh-220px)]">
              <ComplaintList
                complaints={visibleComplaints}
                onCardClick={setSelectedComplaint}
                onExport={handleExport}
                now={now}
                currentRole={currentRole}
                onDelete={canDelete ? handleDelete : undefined}
                currentHandlerId={currentHandlerId}
                onBatchUpdateStatus={handleBatchUpdateStatus}
                onBatchEscalate={handleBatchEscalate}
                onBatchDelete={canDelete ? handleBatchDelete : undefined}
                onBatchExport={handleBatchExport}
                showMerged={showMerged}
                onToggleShowMerged={setShowMerged}
                onViewDuplicates={canViewMerged ? handleViewDuplicates : undefined}
                onViewMaster={canViewMerged ? handleViewMaster : undefined}
                allComplaints={complaints}
                canViewMerged={canViewMerged}
                externalFilter={drilledFilter}
              />
            </div>
          </div>
        </div>
      </main>

      {selectedComplaint && (
        <DetailModal
          complaint={selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          onHandle={handleComplaintAction}
          onEscalate={handleEscalate}
          onDelete={canDelete ? handleDelete : undefined}
          onAssign={handleAssign}
          onVisitBack={handleVisitBack}
          now={now}
          currentRole={currentRole}
          timeLimitRulesVersion={timeLimitRulesVersion}
          handlers={handlers}
          currentHandlerId={currentHandlerId}
          onViewDuplicates={canViewMerged ? () => handleViewDuplicates(selectedComplaint.id) : undefined}
          onViewMaster={canViewMerged ? () => handleViewMaster(selectedComplaint.id) : undefined}
          canViewMerged={canViewMerged}
        />
      )}

      {showDashboard && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowDashboard(false)}
          ></div>
          <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-slate-50 shadow-2xl overflow-y-auto transition-transform">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-800">数据分析</h3>
              </div>
              <button
                onClick={() => setShowDashboard(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <AnalysisDashboard
                stats={analysisStats}
                filter={analysisFilter}
                onFilterChange={handleAnalysisFilterChange}
                onDrillDown={handleAnalysisDrillDown}
                complaints={visibleComplaints}
                onExport={handleExport}
              />
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleBatchImport}
          existingComplaints={complaints}
        />
      )}

      {showDuplicateModal && duplicateModalComplaintId && (
        <DuplicateGroupModal
          targetComplaint={complaints.find((c) => c.id === duplicateModalComplaintId) || null}
          allComplaints={complaints}
          onClose={() => {
            setShowDuplicateModal(false);
            setDuplicateModalComplaintId(null);
          }}
          onMerge={handleMergeComplaints}
          currentRole={currentRole}
          onViewDetail={(complaint) => {
            setSelectedComplaint(complaint);
            setShowDuplicateModal(false);
            setDuplicateModalComplaintId(null);
          }}
        />
      )}

      {showTemplateManage && (
        <ReplyTemplateManageModal
          onClose={() => setShowTemplateManage(false)}
        />
      )}

      {showBackupRestore && (
        <BackupRestoreModal
          onClose={() => setShowBackupRestore(false)}
          onRestoreComplete={handleRestoreComplete}
        />
      )}

      {showTimeLimitManage && (
        <TimeLimitRuleManageModal
          onClose={() => setShowTimeLimitManage(false)}
          onSave={handleTimeLimitRulesSave}
        />
      )}

      {showOperationLog && (
        <OperationLogModal
          onClose={() => setShowOperationLog(false)}
        />
      )}

      {toast.show && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300">
          <div
            className={`px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
