import { useState } from 'react';
import { Search, ListFilter, Download } from 'lucide-react';
import ComplaintCard from './ComplaintCard';
import type { Complaint, ComplaintStatus } from '@/types/complaint';
import { STATUS_OPTIONS } from '@/types/complaint';

interface ComplaintListProps {
  complaints: Complaint[];
  onCardClick: (complaint: Complaint) => void;
  onExport?: (complaints: Complaint[]) => void;
}

type TabType = 'all' | ComplaintStatus;

export default function ComplaintList({ complaints, onCardClick, onExport }: ComplaintListProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'all', label: '全部', count: complaints.length },
    ...STATUS_OPTIONS.map((opt) => ({
      key: opt.value as ComplaintStatus,
      label: opt.label,
      count: complaints.filter((c) => c.status === opt.value).length,
    })),
  ];

  const filteredComplaints = complaints
    .filter((c) => {
      if (activeTab !== 'all' && c.status !== activeTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.content.toLowerCase().includes(q) ||
          c.phone.includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-blue-600" />
            诉求列表
          </h2>
          <p className="text-xs text-slate-500 mt-1">共 {filteredComplaints.length} 条 / 总计 {complaints.length} 条</p>
        </div>
        {onExport && (
          <button
            onClick={() => onExport(filteredComplaints)}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            导出报表
          </button>
        )}
      </div>

      <div className="px-6 py-3 border-b border-slate-100">
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索姓名、内容、电话..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full ${
                  activeTab === tab.key
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredComplaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Search className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">暂无数据</p>
          </div>
        ) : (
          filteredComplaints.map((complaint) => (
            <ComplaintCard
              key={complaint.id}
              complaint={complaint}
              onClick={() => onCardClick(complaint)}
            />
          ))
        )}
      </div>
    </div>
  );
}
