import { useState, useMemo } from 'react';
import {
  BarChart3,
  Clock,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Layers,
  TrendingUp,
  Download,
  Calendar,
  Zap,
  ArrowRight,
  Clock3,
  Repeat,
  ChevronDown,
  PieChart,
} from 'lucide-react';
import type {
  AnalysisStats,
  AnalysisFilter,
  ViewFilter,
  Complaint,
} from '@/types/complaint';
import {
  DEFAULT_FILTER,
  COMPLAINT_TYPES,
  SOURCE_CHANNELS,
  STATUS_OPTIONS,
} from '@/types/complaint';
import { formatDateKey } from '@/utils/helpers';
import { exportComplaintsToCSV } from '@/utils/csvExport';
import { filterComplaintsByTimeRange } from '@/utils/stats';

interface AnalysisDashboardProps {
  stats: AnalysisStats;
  filter: AnalysisFilter;
  onFilterChange: (filter: AnalysisFilter) => void;
  onDrillDown: (viewFilter: ViewFilter) => void;
  complaints: Complaint[];
  onClose: () => void;
  onExport?: (complaints: Complaint[]) => void;
}

const typeColors: Record<string, string> = {
  '投诉': 'bg-red-500',
  '建议': 'bg-blue-500',
  '咨询': 'bg-green-500',
  '求助': 'bg-amber-500',
  '其他': 'bg-slate-500',
};

const sourceColors: Record<string, string> = {
  '来电': 'bg-blue-500',
  '来访': 'bg-green-500',
  '网上留言': 'bg-purple-500',
  '微信公众号': 'bg-emerald-500',
  '上级转办': 'bg-orange-500',
  '其他': 'bg-slate-500',
};

const timeRanges = [
  { label: '今天', days: 0 },
  { label: '近7天', days: 6 },
  { label: '近30天', days: 29 },
  { label: '近90天', days: 89 },
];

export default function AnalysisDashboard({
  stats,
  filter,
  onFilterChange,
  onDrillDown,
  complaints,
  onClose,
  onExport,
}: AnalysisDashboardProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const activeComplaints = useMemo(
    () => complaints.filter((c) => c.mergeStatus !== 'merged'),
    [complaints]
  );

  const filteredComplaints = useMemo(
    () => filterComplaintsByTimeRange(activeComplaints, filter),
    [activeComplaints, filter]
  );

  const handleTimeRangeClick = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    onFilterChange({
      receiveTimeStart: formatDateKey(start),
      receiveTimeEnd: formatDateKey(end),
    });
  };

  const handleStartDateChange = (value: string) => {
    onFilterChange({ ...filter, receiveTimeStart: value || null });
  };

  const handleEndDateChange = (value: string) => {
    onFilterChange({ ...filter, receiveTimeEnd: value || null });
  };

  const handleExport = () => {
    if (onExport) {
      onExport(filteredComplaints);
    } else {
      exportComplaintsToCSV(filteredComplaints);
    }
  };

  const handleDrillDownByType = (type: string) => {
    const viewFilter: ViewFilter = {
      ...DEFAULT_FILTER,
      types: [type],
      receiveTimeStart: filter.receiveTimeStart,
      receiveTimeEnd: filter.receiveTimeEnd,
    };
    onDrillDown(viewFilter);
  };

  const handleDrillDownBySource = (source: string) => {
    const viewFilter: ViewFilter = {
      ...DEFAULT_FILTER,
      sources: [source],
      receiveTimeStart: filter.receiveTimeStart,
      receiveTimeEnd: filter.receiveTimeEnd,
    };
    onDrillDown(viewFilter);
  };

  const handleDrillDownByStatus = (status: string) => {
    const viewFilter: ViewFilter = {
      ...DEFAULT_FILTER,
      statuses: [status as 'pending' | 'processing' | 'replied'],
      receiveTimeStart: filter.receiveTimeStart,
      receiveTimeEnd: filter.receiveTimeEnd,
    };
    onDrillDown(viewFilter);
  };

  const handleDrillDownByOverdueLevel = (level: 'normal' | 'warning' | 'overdue') => {
    const viewFilter: ViewFilter = {
      ...DEFAULT_FILTER,
      overdueLevel: level,
      receiveTimeStart: filter.receiveTimeStart,
      receiveTimeEnd: filter.receiveTimeEnd,
    };
    onDrillDown(viewFilter);
  };

  const handleDrillDownByEscalation = (level: '0次' | '1次' | '2次' | '3次及以上') => {
    let escalationMin: number | null = null;
    let escalationMax: number | null = null;

    if (level === '0次') {
      escalationMin = 0;
      escalationMax = 0;
    } else if (level === '1次') {
      escalationMin = 1;
      escalationMax = 1;
    } else if (level === '2次') {
      escalationMin = 2;
      escalationMax = 2;
    } else {
      escalationMin = 3;
      escalationMax = null;
    }

    const viewFilter: ViewFilter = {
      ...DEFAULT_FILTER,
      escalationMin,
      escalationMax,
      receiveTimeStart: filter.receiveTimeStart,
      receiveTimeEnd: filter.receiveTimeEnd,
    };
    onDrillDown(viewFilter);
  };

  const responseTimeBuckets = [
    { label: '1小时内', min: 0, max: 1 },
    { label: '1-6小时', min: 1, max: 6 },
    { label: '6-12小时', min: 6, max: 12 },
    { label: '12-24小时', min: 12, max: 24 },
    { label: '24-48小时', min: 24, max: 48 },
    { label: '48小时以上', min: 48, max: Infinity },
  ];

  const handleDrillDownByResponseTime = (bucketLabel: string) => {
    const bucket = responseTimeBuckets.find((b) => b.label === bucketLabel);
    if (!bucket) return;

    const viewFilter: ViewFilter = {
      ...DEFAULT_FILTER,
      responseTimeMinHours: bucket.min,
      responseTimeMaxHours: bucket.max === Infinity ? null : bucket.max,
      receiveTimeStart: filter.receiveTimeStart,
      receiveTimeEnd: filter.receiveTimeEnd,
    };
    onDrillDown(viewFilter);
  };

  const statusCards = [
    {
      key: 'pending',
      label: '待处理',
      value: stats.statusCount.pending,
      icon: Clock,
      bgClass: 'bg-red-50 hover:bg-red-100',
      iconBgClass: 'bg-red-100',
      iconColor: 'text-red-600',
      textColor: 'text-red-700',
    },
    {
      key: 'processing',
      label: '处理中',
      value: stats.statusCount.processing,
      icon: MessageCircle,
      bgClass: 'bg-blue-50 hover:bg-blue-100',
      iconBgClass: 'bg-blue-100',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-700',
    },
    {
      key: 'replied',
      label: '已回复',
      value: stats.statusCount.replied,
      icon: CheckCircle2,
      bgClass: 'bg-green-50 hover:bg-green-100',
      iconBgClass: 'bg-green-100',
      iconColor: 'text-green-600',
      textColor: 'text-green-700',
    },
  ];

  const maxTrendCount = Math.max(...stats.dailyTrend.map((d) => d.count), 1);

  const getEscalationLevel = (key: string): '0次' | '1次' | '2次' | '3次及以上' => {
    return key as '0次' | '1次' | '2次' | '3次及以上';
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">数据分析</h2>
              <p className="text-sm text-blue-100">可钻取 · 多维度统计</p>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors backdrop-blur"
          >
            <Download className="w-4 h-4" />
            导出明细
          </button>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-4xl font-bold">{stats.total}</div>
            <div className="text-sm text-blue-100 mt-1">诉求总量（分析范围内）</div>
          </div>
          <div className="text-right text-xs text-blue-100">
            {filter.receiveTimeStart || '不限开始'}
            <br />
            至
            <br />
            {filter.receiveTimeEnd || '不限结束'}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">时间范围</h3>
        </div>
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {timeRanges.map((range) => (
              <button
                key={range.label}
                onClick={() => handleTimeRangeClick(range.days)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  true
                    ? 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600'
                    : ''
                }`}
              >
                {range.label}
              </button>
            ))}
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1 ${
                showDatePicker
                  ? 'bg-blue-50 text-blue-600 border-blue-400'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              自定义
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          {showDatePicker && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <input
                type="date"
                value={filter.receiveTimeStart || ''}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-slate-400 text-xs">至</span>
              <input
                type="date"
                value={filter.receiveTimeEnd || ''}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {statusCards.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => handleDrillDownByStatus(item.key)}
              className={`${item.bgClass} rounded-xl p-4 text-left cursor-pointer transition-colors`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 ${item.iconBgClass} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${item.iconColor}`} />
                </div>
              </div>
              <div className={`text-2xl font-bold ${item.textColor}`}>{item.value}</div>
              <div className={`text-xs ${item.textColor} opacity-70 flex items-center gap-1`}>
                {item.label}
                <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">超期级别分布</h3>
            <p className="text-xs text-slate-500">未完结诉求的超期状态</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <button
            onClick={() => handleDrillDownByOverdueLevel('normal')}
            className="bg-green-50 hover:bg-green-100 rounded-xl p-3 text-center transition-colors cursor-pointer"
          >
            <div className="text-xl font-bold text-green-700">
              {stats.overdueLevelDistribution.normal.count}
            </div>
            <div className="text-xs text-green-700 opacity-70 flex items-center justify-center gap-1">
              正常
              <ArrowRight className="w-3 h-3" />
            </div>
          </button>
          <button
            onClick={() => handleDrillDownByOverdueLevel('warning')}
            className="bg-amber-50 hover:bg-amber-100 rounded-xl p-3 text-center transition-colors cursor-pointer"
          >
            <div className="text-xl font-bold text-amber-700">
              {stats.overdueLevelDistribution.warning.count}
            </div>
            <div className="text-xs text-amber-700 opacity-70 flex items-center justify-center gap-1">
              即将超期
              <ArrowRight className="w-3 h-3" />
            </div>
          </button>
          <button
            onClick={() => handleDrillDownByOverdueLevel('overdue')}
            className="bg-red-50 hover:bg-red-100 rounded-xl p-3 text-center transition-colors cursor-pointer"
          >
            <div className="text-xl font-bold text-red-700">
              {stats.overdueLevelDistribution.overdue.count}
            </div>
            <div className="text-xs text-red-700 opacity-70 flex items-center justify-center gap-1">
              已超期
              <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        </div>
        <div className="space-y-2">
          {[
            { key: 'normal', label: '正常', count: stats.overdueLevelDistribution.normal, color: 'bg-green-500' },
            { key: 'warning', label: '即将超期', count: stats.overdueLevelDistribution.warning, color: 'bg-amber-500' },
            { key: 'overdue', label: '已超期', count: stats.overdueLevelDistribution.overdue, color: 'bg-red-500' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => handleDrillDownByOverdueLevel(item.key as 'normal' | 'warning' | 'overdue')}
              className="w-full space-y-1 text-left hover:bg-slate-50 rounded-lg p-1 -mx-1 transition-colors"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">{item.label}</span>
                <span className="text-slate-500">{item.count.count} 件 · {item.count.ratio.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`${item.color} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${item.count.ratio}%` }}
                ></div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <PieChart className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">诉求类型分布</h3>
            <p className="text-xs text-slate-500">点击可查看对应类型列表</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {stats.typeRatio.map((item) => (
            <button
              key={item.type}
              onClick={() => handleDrillDownByType(item.type)}
              className="w-full space-y-1 text-left hover:bg-slate-50 rounded-lg p-1 -mx-1 transition-colors"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${typeColors[item.type] || 'bg-slate-500'}`}></span>
                  {item.type}
                </span>
                <span className="text-slate-500 flex items-center gap-1">
                  {item.count} 件 · {item.ratio.toFixed(1)}%
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`${typeColors[item.type] || 'bg-slate-500'} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${item.ratio}%` }}
                ></div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">来源渠道分布</h3>
            <p className="text-xs text-slate-500">各渠道诉求数量统计</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {stats.sourceDistribution.map((item) => (
            <button
              key={item.source}
              onClick={() => handleDrillDownBySource(item.source)}
              className="w-full space-y-1 text-left hover:bg-slate-50 rounded-lg p-1 -mx-1 transition-colors"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${sourceColors[item.source] || 'bg-slate-500'}`}></span>
                  {item.source}
                </span>
                <span className="text-slate-500 flex items-center gap-1">
                  {item.count} 件 · {item.ratio.toFixed(1)}%
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`${sourceColors[item.source] || 'bg-slate-500'} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${item.ratio}%` }}
                ></div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">升级次数分布</h3>
            <p className="text-xs text-slate-500">诉求升级处理次数统计</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {Object.entries(stats.escalationDistribution).map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleDrillDownByEscalation(getEscalationLevel(key))}
              className="w-full space-y-1 text-left hover:bg-slate-50 rounded-lg p-1 -mx-1 transition-colors"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">{key}</span>
                <span className="text-slate-500 flex items-center gap-1">
                  {value.count} 件 · {value.ratio.toFixed(1)}%
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    key === '0次'
                      ? 'bg-slate-400'
                      : key === '1次'
                      ? 'bg-blue-500'
                      : key === '2次'
                      ? 'bg-orange-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${value.ratio}%` }}
                ></div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
            <Clock3 className="w-4 h-4 text-cyan-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">回复耗时统计</h3>
            <p className="text-xs text-slate-500">
              平均 {stats.responseTimeStats.avgHours.toFixed(1)} 小时 · 中位数{' '}
              {stats.responseTimeStats.medianHours.toFixed(1)} 小时
            </p>
          </div>
        </div>
        <div className="space-y-2.5">
          {stats.responseTimeStats.buckets.map((item) => (
            <button
              key={item.bucket}
              onClick={() => handleDrillDownByResponseTime(item.bucket)}
              className="w-full space-y-1 text-left hover:bg-slate-50 rounded-lg p-1 -mx-1 transition-colors"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">{item.bucket}</span>
                <span className="text-slate-500 flex items-center gap-1">
                  {item.count} 件 · {item.ratio.toFixed(1)}%
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${item.ratio}%` }}
                ></div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Repeat className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">状态流转统计</h3>
            <p className="text-xs text-slate-500">共 {stats.statusFlowStats.totalTransitions} 次状态变更</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                待处理
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                处理中
              </span>
            </div>
            <span className="text-sm font-semibold text-slate-700">
              {stats.statusFlowStats.pendingToProcessing} 次
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                处理中
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                已回复
              </span>
            </div>
            <span className="text-sm font-semibold text-slate-700">
              {stats.statusFlowStats.processingToReplied} 次
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                待处理
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                已回复
              </span>
            </div>
            <span className="text-sm font-semibold text-slate-700">
              {stats.statusFlowStats.pendingToReplied} 次
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">受理趋势</h3>
            <p className="text-xs text-slate-500">分析范围内每日新增诉求</p>
          </div>
        </div>
        <div className="flex items-end justify-between gap-1 h-32 overflow-x-auto">
          {stats.dailyTrend.map((day) => (
            <div key={day.date} className="flex-1 min-w-[24px] flex flex-col items-center gap-1.5">
              <div className="flex-1 w-full flex items-end justify-center">
                <div
                  className="w-full max-w-[16px] bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md transition-all duration-500"
                  style={{
                    height: `${(day.count / maxTrendCount) * 100}%`,
                    minHeight: day.count > 0 ? '4px' : '2px',
                    opacity: day.count > 0 ? 1 : 0.3,
                  }}
                  title={`${day.dateLabel}: ${day.count} 件`}
                ></div>
              </div>
              <div className="text-[9px] text-slate-500 font-medium whitespace-nowrap">
                {day.dateLabel}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
