import { ClipboardList } from 'lucide-react';
import type { ComplaintStatus } from '@/types/complaint';

interface HeaderProps {
  counts: Record<ComplaintStatus, number>;
}

export default function Header({ counts }: HeaderProps) {
  const total = counts.pending + counts.processing + counts.replied;

  const statItems = [
    { label: '全部', value: total, className: 'bg-slate-50 text-slate-700 ring-slate-200' },
    { label: '待处理', value: counts.pending, className: 'bg-red-50 text-red-700 ring-red-200' },
    { label: '处理中', value: counts.processing, className: 'bg-blue-50 text-blue-700 ring-blue-200' },
    { label: '已回复', value: counts.replied, className: 'bg-green-50 text-green-700 ring-green-200' },
  ];

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">投诉建议登记系统</h1>
              <p className="text-sm text-slate-500">高效管理群众诉求，提升服务质量</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {statItems.map((item) => (
              <div
                key={item.label}
                className={`px-4 py-2 rounded-lg ring-1 ${item.className}`}
              >
                <div className="text-xs opacity-80">{item.label}</div>
                <div className="text-lg font-bold">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
