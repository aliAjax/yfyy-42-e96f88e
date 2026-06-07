import { useState, useMemo } from 'react';
import { ListFilter, Download, Lock, Search } from 'lucide-react';
import ComplaintCard from './ComplaintCard';
import ViewFilterPanel from './ViewFilterPanel';
import type { Complaint, ViewFilter } from '@/types/complaint';
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
}

export default function ComplaintList({
  complaints,
  onCardClick,
  onExport,
  now,
  currentRole,
  onDelete,
  currentHandlerId,
}: ComplaintListProps) {
  const canExport = hasPermission(currentRole, 'export_data');
  const canViewAll = hasPermission(currentRole, 'view_all_complaints');
  const exportDisabledReason = getDisabledReason(currentRole, 'export_data');

  const [filter, setFilter] = useState<ViewFilter>({ ...DEFAULT_FILTER });

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

  const handleFilterChange = (newFilter: ViewFilter) => {
    setFilter(newFilter);
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
            />
          ))
        )}
      </div>
    </div>
  );
}
