import { User, Phone, Clock, MessageSquare, AlertTriangle, AlertCircle, Trash2, Lock, UserCheck, PhoneCall, Copy, ExternalLink } from 'lucide-react';
import StatusBadge from './StatusBadge';
import type { Complaint } from '@/types/complaint';
import { VISIT_BACK_STATUS_OPTIONS, SATISFACTION_OPTIONS } from '@/types/complaint';
import { calculateOverdueInfo, formatHours } from '@/utils/overdue';
import type { UserRole } from '@/utils/permissions';
import { hasPermission, getDisabledReason } from '@/utils/permissions';
import { useState } from 'react';
import { findSimilarComplaints } from '@/utils/similarity';

interface ComplaintCardProps {
  complaint: Complaint;
  onClick: () => void;
  now?: Date;
  currentRole: UserRole;
  onDelete?: (id: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onViewDuplicates?: (complaintId: string) => void;
  allComplaints?: Complaint[];
  onViewMaster?: (complaintId: string) => void;
  canViewMerged?: boolean;
}

export default function ComplaintCard({
  complaint,
  onClick,
  now,
  currentRole,
  onDelete,
  selectable = false,
  selected = false,
  onSelect,
  onViewDuplicates,
  allComplaints = [],
  onViewMaster,
  canViewMerged: propCanViewMerged,
}: ComplaintCardProps) {
  const overdueInfo = calculateOverdueInfo(complaint, now);
  const canDelete = hasPermission(currentRole, 'delete_complaint');
  const deleteDisabledReason = getDisabledReason(currentRole, 'delete_complaint');
  const canViewMerged = propCanViewMerged ?? hasPermission(currentRole, 'view_merged_complaints');
  const [showDeleteTip, setShowDeleteTip] = useState(false);

  const similarCount = allComplaints.length > 0 && complaint.mergeStatus === 'active'
    ? findSimilarComplaints(
        {
          name: complaint.name,
          phone: complaint.phone,
          type: complaint.type,
          content: complaint.content,
          source: complaint.source,
          receiveTime: complaint.receiveTime,
        },
        allComplaints.filter(
          (c) => c.id !== complaint.id && c.mergeStatus === 'active'
        ),
        0.5
      ).length
    : 0;

  const isMerged = complaint.mergeStatus === 'merged';
  const isMaster = complaint.mergeStatus === 'master';

  const getBorderClass = () => {
    if (selected) return 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/30';
    if (isMerged) return 'border-slate-300 bg-slate-50 opacity-70';
    if (isMaster) return 'border-emerald-400 ring-2 ring-emerald-100';
    if (overdueInfo.isOverdue) return 'border-red-400 ring-2 ring-red-100';
    if (overdueInfo.isWarning) return 'border-amber-400 ring-2 ring-amber-100';
    return 'border-slate-200 hover:border-blue-300';
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(complaint.id, e.target.checked);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canDelete) return;
    if (onDelete && confirm('确定要删除这条诉求记录吗？')) {
      onDelete(complaint.id);
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${getBorderClass()}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        {selectable && (
          <div className="flex-shrink-0 pt-0.5">
            <input
              type="checkbox"
              checked={selected}
              onChange={handleCheckboxChange}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
            />
          </div>
        )}
        <div className="flex items-center gap-2 min-w-0 flex-1" onClick={onClick}>
          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-slate-500" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
              <span className="truncate">{complaint.name}</span>
              {isMaster && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded flex-shrink-0">
                  <Copy className="w-3 h-3" />
                  主诉求
                </span>
              )}
              {isMerged && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-600 rounded flex-shrink-0">
                  已合并
                </span>
              )}
              {overdueInfo.isOverdue && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 rounded flex-shrink-0">
                  <AlertCircle className="w-3 h-3" />
                  已超期
                </span>
              )}
              {overdueInfo.isWarning && !overdueInfo.isOverdue && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded flex-shrink-0">
                  <AlertTriangle className="w-3 h-3" />
                  即将超期
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Phone className="w-3 h-3 flex-shrink-0" />
              {complaint.phone}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <StatusBadge status={complaint.status} />
          <div
            className="relative"
            onMouseEnter={() => setShowDeleteTip(true)}
            onMouseLeave={() => setShowDeleteTip(false)}
          >
            <button
              onClick={handleDelete}
              disabled={!canDelete}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                canDelete
                  ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
              title={canDelete ? '删除' : deleteDisabledReason}
            >
              {canDelete ? (
                <Trash2 className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
            </button>
            {showDeleteTip && !canDelete && (
              <div className="absolute right-0 top-full mt-1 px-2 py-1.5 bg-slate-800 text-white text-xs rounded whitespace-nowrap z-10">
                {deleteDisabledReason}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2 flex-wrap" onClick={onClick}>
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded">
          {complaint.type}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded">
          {complaint.source}
        </span>
        {canViewMerged && similarCount > 0 && onViewDuplicates && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDuplicates(complaint.id);
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 rounded hover:bg-amber-100 transition-colors"
          >
            <Copy className="w-3 h-3" />
            疑似重复 {similarCount + 1} 条
          </button>
        )}
        {canViewMerged && isMerged && complaint.masterComplaintName && onViewMaster && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewMaster(complaint.id);
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            查看主诉求
          </button>
        )}
        {complaint.assigneeName ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-teal-50 text-teal-700 rounded">
            <UserCheck className="w-3 h-3" />
            {complaint.assigneeName}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 rounded">
            待分派
          </span>
        )}
      </div>

      <div className="text-sm text-slate-600 line-clamp-2 mb-3 flex items-start gap-1.5" onClick={onClick}>
        <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
        <span>{complaint.content}</span>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100" onClick={onClick}>
        <div className="text-xs text-slate-400 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          受理：{complaint.receiveTime}
        </div>
        {complaint.replyTime ? (
          <div className="text-xs text-green-600">
            回复：{complaint.replyTime}
          </div>
        ) : (
          <div className={`text-xs flex items-center gap-1 ${
            overdueInfo.isOverdue ? 'text-red-600 font-medium' :
            overdueInfo.isWarning ? 'text-amber-600 font-medium' : 'text-slate-400'
          }`}>
            {overdueInfo.isOverdue ? (
              <>超期 {formatHours(overdueInfo.overdueHours)}</>
            ) : (
              <>剩余 {formatHours(overdueInfo.remainingHours)}</>
            )}
          </div>
        )}
      </div>

      {complaint.status === 'replied' && (
        <div className="mt-2 pt-2 border-t border-slate-100" onClick={onClick}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${
              complaint.visitBackStatus === 'pending'
                ? 'bg-orange-50 text-orange-700'
                : complaint.visitBackStatus === 'completed'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}>
              <PhoneCall className="w-3 h-3" />
              {VISIT_BACK_STATUS_OPTIONS.find((opt) => opt.value === complaint.visitBackStatus)?.label}
            </span>
            {complaint.visitBackRecords && complaint.visitBackRecords.length > 0 && (
              <span className="text-xs text-slate-500">
                回访 {complaint.visitBackRecords.length} 次
              </span>
            )}
          </div>
          {complaint.visitBackRecords && complaint.visitBackRecords.length > 0 && (() => {
            const lastRecord = complaint.visitBackRecords[complaint.visitBackRecords.length - 1];
            const satisfaction = SATISFACTION_OPTIONS.find((opt) => opt.value === lastRecord.satisfaction);
            return (
              <div className="mt-1 flex items-center gap-1">
                <span className="text-xs text-slate-500">满意度：</span>
                <span className={`text-xs font-medium ${
                  satisfaction?.color === 'green' ? 'text-green-600' :
                  satisfaction?.color === 'blue' ? 'text-blue-600' :
                  satisfaction?.color === 'yellow' ? 'text-amber-600' :
                  satisfaction?.color === 'orange' ? 'text-orange-600' :
                  'text-red-600'
                }`}>
                  {satisfaction?.label}
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {complaint.escalationRecords && complaint.escalationRecords.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-100" onClick={onClick}>
          <div className="text-xs text-purple-600 font-medium">
            已升级 {complaint.escalationRecords.length} 次
          </div>
        </div>
      )}
    </div>
  );
}
