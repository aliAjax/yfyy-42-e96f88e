import { useState } from 'react';
import { Search, ListFilter, Download, Lock } from 'lucide-react';
import ComplaintCard from './ComplaintCard';
import type { Complaint, ComplaintStatus } from '@/types/complaint';
import { STATUS_OPTIONS } from '@/types/complaint';
import { calculateOverdueInfo } from '@/utils/overdue';
import type { UserRole } from '@/utils/permissions';
import { hasPermission, getDisabledReason } from '@/utils/permissions';

interface ComplaintListProps {
  complaints: Complaint[];
  onCardClick: (complaint: Complaint) => void;
  onExport?: (complaints: Complaint[]) => void;
  now?: Date;
  currentRole: UserRole;
  onDelete?: (id: string) => void;
}

type TabType = 'all' | ComplaintStatus | 'overdue' | 'warning' | 'escalated';

export default function ComplaintList({ complaints, onCardClick, onExport, now, currentRole, onDelete }: ComplaintListProps) {
  const canExport = hasPermission(currentRole, 'export_data');
  const exportDisabledReason = getDisabledReason(currentRole, 'export_data');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const overdueCount = complaints.filter(
    (c) => c.status !== 'replied' && calculateOverdueInfo(c, now).isOverdue
  ).length;
  const warningCount = complaints.filter(
    (c) => c.status !== 'replied' && calculateOverdueInfo(c, now).isWarning && !calculateOverdueInfo(c, now).isOverdue
  ).length;
  const escalatedCount = complaints.filter(
    (c) => c.escalationRecords && c.escalationRecords.length > 0
  ).length;

  const tabs: { key: TabType; label: string; count: number; icon?: string }[] = [
    { key: 'all', label: '全部', count: complaints.length },
    ...STATUS_OPTIONS.map((opt) => ({
      key: opt.value as ComplaintStatus,
      label: opt.label,
      count: complaints.filter((c) => c.status === opt.value).length,
    })),
    { key: 'overdue', label: '已超期', count: overdueCount },
    { key: 'warning', label: '即将超期', count: warningCount },
    { key: 'escalated', label: '已升级', count: escalatedCount },
  ];

  const filteredComplaints = complaints
    .filter((c) => {
      if (activeTab === 'overdue') {
        return c.status !== 'replied' && calculateOverdueInfo(c, now).isOverdue;
      }
      if (activeTab === 'warning') {
        const info = calculateOverdueInfo(c, now);
        return c.status !== 'replied' && info.isWarning && !info.isOverdue;
      }
      if (activeTab === 'escalated') {
        return c.escalationRecords && c.escalationRecords.length > 0;
      }
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
    .sort((a, b) => {
      const aOverdue = a.status !== 'replied' && calculateOverdueInfo(a, now).isOverdue;
      const bOverdue = b.status !== 'replied' && calculateOverdueInfo(b, now).isOverdue;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

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
        <div className="relative group">
          <button
            onClick={() => canExport && onExport(filteredComplaints)}
            disabled={!canExport}
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

        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {tabs.map((tab) => {
            const isOverdueTab = tab.key === 'overdue';
            const isWarningTab = tab.key === 'warning';
            const isEscalatedTab = tab.key === 'escalated';
            
            const getActiveClass = () => {
              if (isOverdueTab) return 'bg-white text-red-600 shadow-sm';
              if (isWarningTab) return 'bg-white text-amber-600 shadow-sm';
              if (isEscalatedTab) return 'bg-white text-purple-600 shadow-sm';
              return 'bg-white text-blue-600 shadow-sm';
            };
            
            const getInactiveClass = () => {
              if (isOverdueTab) return 'text-red-500 hover:text-red-700';
              if (isWarningTab) return 'text-amber-500 hover:text-amber-700';
              if (isEscalatedTab) return 'text-purple-500 hover:text-purple-700';
              return 'text-slate-600 hover:text-slate-800';
            };
            
            const getBadgeActiveClass = () => {
              if (isOverdueTab) return 'bg-red-100 text-red-600';
              if (isWarningTab) return 'bg-amber-100 text-amber-600';
              if (isEscalatedTab) return 'bg-purple-100 text-purple-600';
              return 'bg-blue-100 text-blue-600';
            };
            
            const getBadgeInactiveClass = () => {
              if (isOverdueTab) return 'bg-red-200/50 text-red-600';
              if (isWarningTab) return 'bg-amber-200/50 text-amber-600';
              if (isEscalatedTab) return 'bg-purple-200/50 text-purple-600';
              return 'bg-slate-200 text-slate-600';
            };
            
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === tab.key ? getActiveClass() : getInactiveClass()
                }`}
              >
                {tab.label}
                <span
                  className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full ${
                    activeTab === tab.key ? getBadgeActiveClass() : getBadgeInactiveClass()
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
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
