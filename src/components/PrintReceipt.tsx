import { useState, useEffect } from 'react';
import { Printer, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { Complaint } from '@/types/complaint';
import { STATUS_OPTIONS } from '@/types/complaint';
import { formatDateTime } from '@/utils/helpers';

interface PrintReceiptProps {
  complaint: Complaint;
  onClose: () => void;
}

export default function PrintReceipt({ complaint, onClose }: PrintReceiptProps) {
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  const statusLabel = STATUS_OPTIONS.find((opt) => opt.value === complaint.status)?.label || complaint.status;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        const scaleValue = (window.innerWidth - 32) / 794;
        setScale(Math.min(scaleValue, 1));
      } else {
        setScale(1);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const truncateContent = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 2));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.3));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm print:bg-transparent print:z-auto print:fixed print:inset-auto print:flex-none">
      <div className="relative w-full max-w-3xl max-h-[95vh] flex flex-col print:max-w-none print:max-h-none print:flex-none print:relative print:w-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10 rounded-t-xl print:hidden">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900">受理回执打印预览</h3>
          <div className="flex items-center gap-1 sm:gap-2">
            {isMobile && (
              <div className="flex items-center gap-1 mr-2">
                <button
                  onClick={zoomOut}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="缩小"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-500 w-10 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={zoomIn}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="放大"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            )}
            <button
              onClick={handlePrint}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">打印</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-auto flex-1 print:overflow-visible print:flex-none bg-slate-100 print:bg-transparent p-2 sm:p-8">
          <div
            className="receipt-paper bg-white mx-auto shadow-lg print:shadow-none print:m-0 origin-top"
            style={{
              width: isMobile ? '210mm' : '210mm',
              minHeight: '297mm',
              padding: '20mm',
              transform: isMobile ? `scale(${scale})` : 'none',
            }}
          >
            <div className="text-center mb-8 pb-6 border-b-2 border-slate-800">
              <h1 className="text-2xl font-bold text-slate-900 tracking-wider mb-2">诉求受理回执</h1>
              <p className="text-sm text-slate-600">Complaint Acceptance Receipt</p>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">诉求编号</span>
                  <span className="text-base font-bold text-blue-700 font-mono">{complaint.id}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-slate-500 text-xs">姓名</span>
                  <p className="text-slate-900 font-medium">{complaint.name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 text-xs">联系方式</span>
                  <p className="text-slate-900 font-medium">{complaint.phone}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 text-xs">诉求类型</span>
                  <p className="text-slate-900 font-medium">{complaint.type}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 text-xs">来源渠道</span>
                  <p className="text-slate-900 font-medium">{complaint.source}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <span className="text-slate-500 text-xs">受理时间</span>
                  <p className="text-slate-900 font-medium">{complaint.receiveTime}</p>
                </div>
              </div>

              <div className="pt-2">
                <div className="text-sm font-medium text-slate-700 mb-2 pb-1 border-b border-slate-200">
                  内容摘要
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {truncateContent(complaint.content, 300)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <span className="text-slate-500 text-xs">当前状态</span>
                  <p className="text-slate-900 font-medium">{statusLabel}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 text-xs">打印时间</span>
                  <p className="text-slate-900 font-medium">{formatDateTime(new Date())}</p>
                </div>
              </div>

              <div className="pt-2">
                <div className="text-sm font-medium text-slate-700 mb-2 pb-1 border-b border-slate-200">
                  社区处理意见
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {complaint.handleOpinion || '暂无'}
                </p>
              </div>

              <div className="pt-8 mt-8 border-t border-dashed border-slate-300">
                <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
                  <div>
                    <p className="mb-1">受理单位：社区服务中心</p>
                    <p>经办人：_______________</p>
                  </div>
                  <div className="text-right">
                    <p className="mb-1">联系电话：12345</p>
                    <p>日期：_______________</p>
                  </div>
                </div>
              </div>

              <div className="text-center pt-6 text-xs text-slate-400">
                <p>本回执由系统自动生成，如有疑问请联系社区服务中心</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
