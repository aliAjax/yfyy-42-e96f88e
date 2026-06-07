import { useState, useEffect, useMemo } from 'react';
import { BarChart3, X, Upload, FileText, Lock, Database, Clock, Users } from 'lucide-react';
import Header from '@/components/Header';
import ComplaintForm from '@/components/ComplaintForm';
import ComplaintList from '@/components/ComplaintList';
import DetailModal from '@/components/DetailModal';
import Dashboard from '@/components/Dashboard';
import ImportModal from '@/components/ImportModal';
import ReplyTemplateManageModal from '@/components/ReplyTemplateManageModal';
import BackupRestoreModal from '@/components/BackupRestoreModal';
import TimeLimitRuleManageModal from '@/components/TimeLimitRuleManageModal';
import { mockComplaints } from '@/data/mockData';
import { generateId, migrateComplaintData, formatDateTime } from '@/utils/helpers';
import { calculateDashboardStats } from '@/utils/stats';
import { calculateOverdueCount } from '@/utils/overdue';
import { exportComplaintsToCSV } from '@/utils/csvExport';
import { getHandlers, getCurrentHandler, setCurrentHandlerId } from '@/utils/handlers';
import type { Complaint, ComplaintFormData, HandleFormData, ComplaintStatus, EscalationRecord, AssignmentFormData, HandlerUser } from '@/types/complaint';
import type { UserRole } from '@/utils/permissions';
import { hasPermission, getDisabledReason, ROLE_LABELS } from '@/utils/permissions';

const STORAGE_KEY = 'complaint_records';
const ROLE_STORAGE_KEY = 'current_role';

export default function Home() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTemplateManage, setShowTemplateManage] = useState(false);
  const [showBackupRestore, setShowBackupRestore] = useState(false);
  const [showTimeLimitManage, setShowTimeLimitManage] = useState(false);
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

  const canViewStatistics = hasPermission(currentRole, 'view_statistics');
  const canManageTemplates = hasPermission(currentRole, 'manage_templates');
  const canManageTimeLimitRules = hasPermission(currentRole, 'manage_time_limit_rules');
  const canImport = hasPermission(currentRole, 'import_data');
  const canDelete = hasPermission(currentRole, 'delete_complaint');
  const canBackupRestore = hasPermission(currentRole, 'backup_restore');

  const dashboardStats = useMemo(
    () => calculateDashboardStats(complaints, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [complaints, now, timeLimitRulesVersion]
  );
  const overdueCount = useMemo(
    () => calculateOverdueCount(complaints, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [complaints, now, timeLimitRulesVersion]
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

  const handleCurrentHandlerChange = (handlerId: string) => {
    setCurrentHandlerIdState(handlerId);
    setCurrentHandlerId(handlerId);
    const handler = handlers.find((h) => h.id === handlerId);
    if (handler) {
      showToast(`已切换为处理员：${handler.name}`, 'success');
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const migrated = migrateComplaintData(parsed);
        setComplaints(migrated);
      } catch {
        setComplaints(mockComplaints);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockComplaints));
      }
    } else {
      setComplaints(mockComplaints);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockComplaints));
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (complaints.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
    }
  }, [complaints]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 2500);
  };

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    showToast(`已切换为${ROLE_LABELS[role]}角色`, 'success');
  };

  const handleAddComplaint = (data: ComplaintFormData) => {
    if (!hasPermission(currentRole, 'create_complaint')) {
      showToast('无新增诉求权限', 'error');
      return;
    }
    const now = new Date().toISOString();
    const newComplaint: Complaint = {
      id: generateId(),
      ...data,
      status: 'pending',
      handleOpinion: '',
      replyTime: '',
      createdAt: now,
      updatedAt: now,
      handleRecords: [],
      escalationRecords: [],
      assignmentRecords: [],
    };
    setComplaints((prev) => [newComplaint, ...prev]);
    showToast('诉求登记成功！');
  };

  const handleBatchImport = (rows: ComplaintFormData[]) => {
    if (!hasPermission(currentRole, 'import_data')) {
      showToast('无批量导入权限', 'error');
      return;
    }
    const now = new Date().toISOString();
    const newComplaints: Complaint[] = rows.map((data) => ({
      id: generateId(),
      ...data,
      status: 'pending',
      handleOpinion: '',
      replyTime: '',
      createdAt: now,
      updatedAt: now,
      handleRecords: [],
      escalationRecords: [],
      assignmentRecords: [],
    }));
    setComplaints((prev) => [...newComplaints, ...prev]);
    setShowImportModal(false);
    showToast(`成功导入 ${rows.length} 条诉求！`);
  };

  const handleExport = (filteredComplaints: Complaint[]) => {
    if (!hasPermission(currentRole, 'export_data')) {
      showToast('无导出数据权限', 'error');
      return;
    }
    const result = exportComplaintsToCSV(filteredComplaints);
    showToast(result.message, result.success ? 'success' : 'error');
  };

  const handleComplaint = (id: string, data: HandleFormData) => {
    if (!hasPermission(currentRole, 'update_status') && !hasPermission(currentRole, 'update_handle_opinion')) {
      showToast('无处理权限', 'error');
      return;
    }
    const now = new Date().toISOString();
    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;

        const lastRecord = c.handleRecords.length > 0
          ? c.handleRecords[c.handleRecords.length - 1]
          : null;

        const hasChanged = !lastRecord
          || lastRecord.status !== data.status
          || lastRecord.handleOpinion !== data.handleOpinion
          || lastRecord.replyTime !== data.replyTime;

        const newRecords = hasChanged
          ? [
              ...c.handleRecords,
              {
                id: generateId(),
                status: data.status,
                handleOpinion: data.handleOpinion,
                replyTime: data.replyTime,
                operatedAt: now,
              },
            ]
          : c.handleRecords;

        return {
          ...c,
          status: data.status,
          handleOpinion: data.handleOpinion,
          replyTime: data.replyTime,
          updatedAt: now,
          handleRecords: newRecords,
        };
      })
    );
    setSelectedComplaint(null);
    showToast('处理记录已保存！');
  };

  const handleEscalate = (id: string, reason: string) => {
    if (!hasPermission(currentRole, 'escalate_complaint')) {
      showToast('无升级处理权限', 'error');
      return;
    }
    const now = new Date().toISOString();
    const escalationRecord: EscalationRecord = {
      id: generateId(),
      reason,
      escalatedAt: formatDateTime(new Date(now)),
      escalatedBy: ROLE_LABELS[currentRole],
    };

    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const existingRecords = c.escalationRecords || [];
        return {
          ...c,
          updatedAt: now,
          escalationRecords: [...existingRecords, escalationRecord],
        };
      })
    );

    setSelectedComplaint((prev) => {
      if (!prev || prev.id !== id) return prev;
      return {
        ...prev,
        updatedAt: now,
        escalationRecords: [...(prev.escalationRecords || []), escalationRecord],
      };
    });

    showToast('诉求已升级！');
  };

  const handleAssign = (id: string, data: AssignmentFormData) => {
    if (!hasPermission(currentRole, 'assign_complaint')) {
      showToast('无分派权限', 'error');
      return;
    }
    const now = new Date().toISOString();
    const assignmentRecord = {
      id: generateId(),
      assigneeId: data.assigneeId,
      assigneeName: data.assigneeName,
      assignorId: 'admin',
      assignorName: ROLE_LABELS[currentRole],
      remark: data.remark,
      assignedAt: now,
    };

    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const existingRecords = c.assignmentRecords || [];
        return {
          ...c,
          assigneeId: data.assigneeId,
          assigneeName: data.assigneeName,
          updatedAt: now,
          assignmentRecords: [...existingRecords, assignmentRecord],
        };
      })
    );

    setSelectedComplaint((prev) => {
      if (!prev || prev.id !== id) return prev;
      return {
        ...prev,
        assigneeId: data.assigneeId,
        assigneeName: data.assigneeName,
        updatedAt: now,
        assignmentRecords: [...(prev.assignmentRecords || []), assignmentRecord],
      };
    });

    showToast(`已分派给 ${data.assigneeName}`);
  };

  const handleDelete = (id: string) => {
    if (!hasPermission(currentRole, 'delete_complaint')) {
      showToast('无删除记录权限', 'error');
      return;
    }
    setComplaints((prev) => prev.filter((c) => c.id !== id));
    showToast('诉求记录已删除');
  };

  const handleRestoreComplete = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const migrated = migrateComplaintData(parsed);
        setComplaints(migrated);
      } catch {
        // ignore
      }
    }
    setTimeLimitRulesVersion((v) => v + 1);
    showToast('数据恢复完成！');
  };

  const handleTimeLimitRulesSave = () => {
    setTimeLimitRulesVersion((v) => v + 1);
    showToast('时限规则已保存，统计数据已重新计算');
  };

  const counts: Record<ComplaintStatus, number> = {
    pending: complaints.filter((c) => c.status === 'pending').length,
    processing: complaints.filter((c) => c.status === 'processing').length,
    replied: complaints.filter((c) => c.status === 'replied').length,
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
              </div>
            </div>
            <div className="h-[calc(100vh-220px)]">
              <ComplaintList
                complaints={complaints}
                onCardClick={setSelectedComplaint}
                onExport={handleExport}
                now={now}
                currentRole={currentRole}
                onDelete={canDelete ? handleDelete : undefined}
                currentHandlerId={currentHandlerId}
              />
            </div>
          </div>
        </div>
      </main>

      {selectedComplaint && (
        <DetailModal
          complaint={selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          onHandle={handleComplaint}
          onEscalate={handleEscalate}
          onDelete={canDelete ? handleDelete : undefined}
          onAssign={handleAssign}
          now={now}
          currentRole={currentRole}
          timeLimitRulesVersion={timeLimitRulesVersion}
          handlers={handlers}
          currentHandlerId={currentHandlerId}
        />
      )}

      {showDashboard && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowDashboard(false)}
          ></div>
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-slate-50 shadow-2xl overflow-y-auto transition-transform">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-800">数据看板</h3>
              </div>
              <button
                onClick={() => setShowDashboard(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <Dashboard stats={dashboardStats} />
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleBatchImport}
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
