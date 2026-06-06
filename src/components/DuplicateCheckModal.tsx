import { X, AlertTriangle, Eye, FileText, User, Clock } from 'lucide-react';
import type { SimilarComplaint } from '@/utils/similarity';
import StatusBadge from './StatusBadge';

interface DuplicateCheckModalProps {
  similarComplaints: SimilarComplaint[];
  onContinue: () => void;
  onViewDetail: (complaint: SimilarComplaint['complaint']) => void;
  onClose: () => void;
}

export default function DuplicateCheckModal({
  similarComplaints,
  onContinue,
  onViewDetail,
  onClose,
}: DuplicateCheckModalProps) {
  if (similarComplaints.length === 0) return null;

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 70) return 'text-red-600 bg-red-50';
    if (similarity >= 50) return 'text-orange-600 bg-orange-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const truncateContent = (content: string, maxLength: number = 60) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden transition-all duration-200">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">发现相似诉求</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  检测到 {similarComplaints.length} 条可能重复的记录
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-180px)]">
          <div className="p-6 space-y-3">
            {similarComplaints.map((item) => (
              <div
                key={item.complaint.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-md ${getSimilarityColor(item.similarity)}`}
                    >
                      {item.similarity}% 相似
                    </span>
                    <StatusBadge status={item.complaint.status} />
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <User className="w-3.5 h-3.5" />
                      <span>{item.complaint.name}</span>
                    </div>
                    <div className="text-slate-500">{item.complaint.phone}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 font-medium text-xs bg-blue-50 px-2 py-0.5 rounded">
                      {item.complaint.type}
                    </span>
                    <span className="text-slate-400 text-xs">·</span>
                    <div className="flex items-center gap-1 text-slate-500 text-xs">
                      <Clock className="w-3 h-3" />
                      <span>{item.complaint.receiveTime}</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <div className="flex items-start gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <p className="text-slate-700 text-sm leading-relaxed">
                        {truncateContent(item.complaint.content)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.matchReasons.map((reason, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => onViewDetail(item.complaint)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-white border border-slate-200 hover:border-blue-300 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  查看详情
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={onContinue}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              继续登记
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
