import { User, Phone, Clock, MessageSquare, AlertTriangle, AlertCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';
import type { Complaint } from '@/types/complaint';
import { calculateOverdueInfo } from '@/utils/overdue';

interface ComplaintCardProps {
  complaint: Complaint;
  onClick: () => void;
}

export default function ComplaintCard({ complaint, onClick }: ComplaintCardProps) {
  const overdueInfo = calculateOverdueInfo(complaint);

  const getBorderClass = () => {
    if (overdueInfo.isOverdue) return 'border-red-400 ring-2 ring-red-100';
    if (overdueInfo.isWarning) return 'border-amber-400 ring-2 ring-amber-100';
    return 'border-slate-200 hover:border-blue-300';
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${getBorderClass()}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <div className="font-medium text-slate-900 text-sm flex items-center gap-1.5">
              {complaint.name}
              {overdueInfo.isOverdue && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 rounded">
                  <AlertCircle className="w-3 h-3" />
                  已超期
                </span>
              )}
              {overdueInfo.isWarning && !overdueInfo.isOverdue && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded">
                  <AlertTriangle className="w-3 h-3" />
                  即将超期
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {complaint.phone}
            </div>
          </div>
        </div>
        <StatusBadge status={complaint.status} />
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded">
          {complaint.type}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded">
          {complaint.source}
        </span>
      </div>

      <div className="text-sm text-slate-600 line-clamp-2 mb-3 flex items-start gap-1.5">
        <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
        <span>{complaint.content}</span>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
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
              <>超期 {overdueInfo.overdueHours} 小时</>
            ) : (
              <>剩余 {overdueInfo.remainingHours} 小时</>
            )}
          </div>
        )}
      </div>

      {complaint.escalationRecords && complaint.escalationRecords.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          <div className="text-xs text-purple-600 font-medium">
            已升级 {complaint.escalationRecords.length} 次
          </div>
        </div>
      )}
    </div>
  );
}
