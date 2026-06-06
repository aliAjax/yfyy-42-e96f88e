import { Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { HandleRecord } from '@/types/complaint';
import { STATUS_OPTIONS } from '@/types/complaint';
import { formatDateTime } from '@/utils/helpers';

interface HandleTimelineProps {
  records: HandleRecord[];
}

export default function HandleTimeline({ records }: HandleTimelineProps) {
  if (!records || records.length === 0) {
    return null;
  }

  const getStatusInfo = (status: string) => {
    const opt = STATUS_OPTIONS.find((o) => o.value === status);
    return opt || { label: status, color: 'slate' };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="w-4 h-4" />;
      case 'processing':
        return <Loader2 className="w-4 h-4" />;
      case 'replied':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColorClasses = (color: string) => {
    switch (color) {
      case 'red':
        return {
          dot: 'bg-red-500',
          ring: 'ring-red-200',
          badge: 'bg-red-50 text-red-700 border-red-200',
          line: 'bg-red-200',
        };
      case 'blue':
        return {
          dot: 'bg-blue-500',
          ring: 'ring-blue-200',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          line: 'bg-blue-200',
        };
      case 'green':
        return {
          dot: 'bg-green-500',
          ring: 'ring-green-200',
          badge: 'bg-green-50 text-green-700 border-green-200',
          line: 'bg-green-200',
        };
      default:
        return {
          dot: 'bg-slate-500',
          ring: 'ring-slate-200',
          badge: 'bg-slate-50 text-slate-700 border-slate-200',
          line: 'bg-slate-200',
        };
    }
  };

  const sortedRecords = [...records].sort(
    (a, b) => new Date(a.operatedAt).getTime() - new Date(b.operatedAt).getTime()
  );

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <Clock className="w-4 h-4 text-blue-600" />
        处理记录时间线
      </h4>
      <div className="relative pl-6">
        {sortedRecords.map((record, index) => {
          const statusInfo = getStatusInfo(record.status);
          const colorClasses = getStatusColorClasses(statusInfo.color);
          const isLast = index === sortedRecords.length - 1;

          return (
            <div key={record.id} className="relative pb-5 last:pb-0">
              {!isLast && (
                <div
                  className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${colorClasses.line}`}
                ></div>
              )}
              <div
                className={`absolute -left-6 top-1 w-6 h-6 rounded-full ${colorClasses.dot} ring-4 ${colorClasses.ring} flex items-center justify-center text-white`}
              >
                {getStatusIcon(record.status)}
              </div>
              <div className="ml-2">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border ${colorClasses.badge}`}
                  >
                    {statusInfo.label}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(new Date(record.operatedAt))}
                  </span>
                </div>
                {record.handleOpinion && (
                  <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-100">
                    {record.handleOpinion}
                  </div>
                )}
                {record.replyTime && (
                  <div className="mt-1.5 text-xs text-slate-500 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    回复时间：{record.replyTime}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
