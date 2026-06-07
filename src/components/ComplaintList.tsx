import { useState, useMemo, useEffect } from 'react';
import { ListFilter, Download, Lock, Search } from 'lucide-react';
import ComplaintCard from './ComplaintCard';
import ViewFilterPanel from './ViewFilterPanel';
import BatchActionBar from './BatchActionBar';
import BatchOperationModal from './BatchOperationModal';
import type { Complaint, ViewFilter, BatchActionType } from '@/types/complaint';
import { DEFAULT_FILTER } from '@/types/complaint';
import { calculateOverdueInfo } from '@/utils/overdue';
import type { UserRole } from '@/utils/permissions';
import { hasPermission, getDisabledReason } from '@/utils/permissions';
import { applyFilter } from '@/utils/views';

interface ComplaintListProps {
  complaints: Complaint[];
  onCardClick: (complaint: Complaint) => void;
  onExport?: (complaints: Complaint[]) => void;
  now?: Date;
  currentRole: UserRole;
  onDelete?: (id: string) => void;
  currentHandlerId?: string;
  onBatchUpdateStatus?: (complaints: Complaint[], data: any) => void;
  onBatchEscalate?: (complaints: Complaint[], reason: string) => void;
  onBatchDelete?: (complaints: Complaint[]) => void;
  onBatchExport?: (complaints: Complaint[]) => void;
}

export default function ComplaintList({
  complaints,
  onCardClick,
  onExport,
  now,
  currentRole,
  onDelete,
  currentHandlerId,
  onBatchUpdateStatus,
  onBatchEscalate,
  onBatchDelete,
  onBatchExport,
}: ComplaintListProps) {
  const canExport = hasPermission(currentRole, 'export_data');
  const canViewAll = hasPermission(currentRole, 'view_all_complaints');
  const canUpdateStatus = hasPermission(currentRole, 'update_status');
  const canEscalate = hasPermission(currentRole, 'escalate_complaint');
  const canDelete = hasPermission(currentRole, 'delete_complaint');
  const exportDisabledReason = getDisabledReason(currentRole, 'export_data');

  const [filter, setFilter] = useState<ViewFilter>({ ...DEFAULT_FILTER });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchAction, setBatchAction] = useState<BatchActionType | null>(null);

  const visibleComplaints = useMemo(() => {
    if (!canViewAll) {
      return currentHandlerId
        ? complaints.filter((c) => c.assigneeId === currentHandlerId)
        : [];
    }
    return complaints;
  }, [complaints, canViewAll, currentHandlerId]);

  const filteredComplaints = useMemo(() => {
    const result = applyFilter(visibleComplaints, filter, now);
    return result.sort((a, b) => {
      const aOverdue =
        a.status !== 'replied' && calculateOverdueInfo(a, now).isOverdue;
      const bOverdue =
        b.status !== 'replied' && calculateOverdueInfo(b, now).isOverdue;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [visibleComplaints, filter, now]);

  const selectedComplaints = useMemo(() => {
    return filteredComplaints.filter((c) => selectedIds.has(c.id));
  }, [filteredComplaints, selectedIds]);

  const allSelected = filteredComplaints.length > 0 && selectedIds.size === filteredComplaints.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const hasAnyBatchPermission = canUpdateStatus || canEscalate || canDelete || canExport;

  useEffect(() => {
    setSelectedIds(new Set());
  }, [filter]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const filteredIds = new Set(filteredComplaints.map((c) => c.id));
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (filteredIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [filteredComplaints]);

  const handleFilterChange = (newFilter: ViewFilter) => {
    setFilter(newFilter);
  };

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredComplaints.map((c) => c.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBatchAction = (action: BatchActionType) => {
    if (selectedComplaints.length === 0) return;
    setBatchAction(action);
  };

  const handleBatchConfirm = (action: BatchActionType, data: any) => {
    switch (action) {
      case 'status':
        onBatchUpdateStatus && onBatchUpdateStatus(selectedComplaints, data);
        break;
      case 'escalate':
        onBatchEscalate && onBatchEscalate(selectedComplaints, data.reason);
        break;
      case 'delete':
        onBatchDelete && onBatchDelete(selectedComplaints);
        break;
      case 'export':
        onBatchExport && onBatchExport(selectedComplaints);
        break;
    }
    setBatchAction(null);
    setSelectedIds(new Set());
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-blue-600" />
            诉求列表
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            共 {filteredComplaints.length} 条
            {canViewAll && <> / 总计 {complaints.length} 条</>}
          </p>
        </div>
        <div className="relative group">
          <button
            onClick={() => canExport && onExport && onExport(filteredComplaints)}
            disabled={!canExport || !onExport}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm ${
              canExport
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {!canExport && <Lock className="w-3.5 h-3.5" />}
            <Download className="w-4 h-4" />
            导出报表
          </button>
          {!canExport && (
            <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              {exportDisabledReason}
            </div>
          )}
        </div>
      </div>

      {hasAnyBatchPermission && selectedIds.size > 0 && (
        <BatchActionBar
          selectedCount={selectedIds.size}
          totalCount={filteredComplaints.length}
          currentRole={currentRole}
          onAction={handleBatchAction}
          onClear={handleClearSelection}
          onSelectAll={handleSelectAll}
          allSelected={allSelected}
          someSelected={someSelected}
        />
      )}

      <ViewFilterPanel
        filter={filter}
        onFilterChange={handleFilterChange}
        currentRole={currentRole}
        totalCount={visibleComplaints.length}
        filteredCount={filteredComplaints.length}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredComplaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Search className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">暂无匹配的诉求数据</p>
            <p className="text-xs mt-1">尝试调整筛选条件或切换视图</p>
          </div>
        ) : (
          filteredComplaints.map((complaint) => (
            <ComplaintCard
              key={complaint.id}
              complaint={complaint}
              now={now}
              onClick={() => onCardClick(complaint)}
              currentRole={currentRole}
              onDelete={onDelete}
              selectable={hasAnyBatchPermission}
              selected={selectedIds.has(complaint.id)}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>

      <BatchOperationModal
        action={batchAction}
        selectedComplaints={selectedComplaints}
        currentRole={currentRole}
        onClose={() => setBatchAction(null)}
        onConfirm={handleBatchConfirm}
      />
    </div>
  );
}
