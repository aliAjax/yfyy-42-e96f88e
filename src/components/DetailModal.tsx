import { useState, useEffect } from 'react';
import { X, User, MessageSquare, Send, CheckCircle, Printer } from 'lucide-react';
import StatusBadge from './StatusBadge';
import HandleTimeline from './HandleTimeline';
import PrintReceipt from './PrintReceipt';
import type { Complaint, HandleFormData } from '@/types/complaint';
import { STATUS_OPTIONS } from '@/types/complaint';
import { getCurrentDateTime, formatDateInput } from '@/utils/helpers';

interface DetailModalProps {
  complaint: Complaint | null;
  onClose: () => void;
  onHandle: (id: string, data: HandleFormData) => void;
}

export default function DetailModal({ complaint, onClose, onHandle }: DetailModalProps) {
  const [showPrint, setShowPrint] = useState(false);
  const [handleData, setHandleData] = useState<HandleFormData>({
    status: 'pending',
    handleOpinion: '',
    replyTime: '',
  });

  useEffect(() => {
    if (complaint) {
      setHandleData({
        status: complaint.status,
        handleOpinion: complaint.handleOpinion || '',
        replyTime: complaint.replyTime || '',
      });
    }
  }, [complaint]);

  if (!complaint) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onHandle(complaint.id, handleData);
  };

  const handleStatusChange = (status: typeof handleData.status) => {
    setHandleData((prev) => {
      const next = { ...prev, status };
      if (status === 'replied' && !prev.replyTime) {
        next.replyTime = getCurrentDateTime();
      }
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden transition-all duration-200">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-900">诉求详情</h3>
            <StatusBadge status={complaint.status} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrint(true)}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">打印回执</span>
            </button>
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
                <div className="col-span-2">
                  <span className="text-slate-500">受理时间：</span>
                  <span className="text-slate-900 font-medium">{complaint.receiveTime}</span>
                </div>
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

            <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-slate-200">
              <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600" />
                处理操作
              </h4>

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
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                        handleData.status === opt.value
                          ? opt.color === 'red'
                            ? 'bg-red-50 border-red-300 text-red-700'
                            : opt.color === 'blue'
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-green-50 border-green-300 text-green-700'
                          : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  处理意见
                </label>
                <textarea
                  value={handleData.handleOpinion}
                  onChange={(e) =>
                    setHandleData((prev) => ({ ...prev, handleOpinion: e.target.value }))
                  }
                  placeholder="请输入处理意见和回复内容..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  回复时间
                </label>
                <input
                  type="datetime-local"
                  value={handleData.replyTime ? formatDateInput(new Date(handleData.replyTime.replace(' ', 'T'))) : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setHandleData((prev) => ({
                      ...prev,
                      replyTime: val ? val.replace('T', ' ') : '',
                    }));
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
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
    </div>
  );
}
