import {
  BarChart3,
  Clock,
  MessageCircle,
  CheckCircle2,
  PieChart,
  TrendingUp,
  Layers,
  AlertTriangle,
  AlertCircle,
  Phone,
  Star,
  ThumbsUp,
  ThumbsDown,
  Smile,
} from 'lucide-react';
import type { DashboardStats } from '@/types/complaint';
import { SATISFACTION_OPTIONS } from '@/types/complaint';

interface DashboardProps {
  stats: DashboardStats;
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

export default function Dashboard({ stats }: DashboardProps) {
  const maxTrendCount = Math.max(...stats.dailyTrend.map((d) => d.count), 1);

  const statusCards = [
    {
      key: 'pending',
      label: '待处理',
      value: stats.statusCount.pending,
      icon: Clock,
      bgClass: 'bg-red-50',
      iconBgClass: 'bg-red-100',
      iconColor: 'text-red-600',
      textColor: 'text-red-700',
    },
    {
      key: 'processing',
      label: '处理中',
      value: stats.statusCount.processing,
      icon: MessageCircle,
      bgClass: 'bg-blue-50',
      iconBgClass: 'bg-blue-100',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-700',
    },
    {
      key: 'replied',
      label: '已回复',
      value: stats.statusCount.replied,
      icon: CheckCircle2,
      bgClass: 'bg-green-50',
      iconBgClass: 'bg-green-100',
      iconColor: 'text-green-600',
      textColor: 'text-green-700',
    },
  ];

  const visitBackCards = [
    {
      key: 'pending',
      label: '待回访',
      value: stats.visitBackStatusCount.pending,
      icon: Phone,
      bgClass: 'bg-orange-50',
      iconBgClass: 'bg-orange-100',
      iconColor: 'text-orange-600',
      textColor: 'text-orange-700',
    },
    {
      key: 'completed',
      label: '已回访',
      value: stats.visitBackStatusCount.completed,
      icon: CheckCircle2,
      bgClass: 'bg-emerald-50',
      iconBgClass: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      textColor: 'text-emerald-700',
    },
    {
      key: 'unsatisfied',
      label: '未满意',
      value: stats.visitBackStatusCount.unsatisfied,
      icon: ThumbsDown,
      bgClass: 'bg-red-50',
      iconBgClass: 'bg-red-100',
      iconColor: 'text-red-600',
      textColor: 'text-red-700',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">数据概览</h2>
              <p className="text-sm text-blue-100">实时统计 · 自动更新</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-sm text-blue-100">诉求总量</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {statusCards.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className={`${item.bgClass} rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 ${item.iconBgClass} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${item.iconColor}`} />
                </div>
              </div>
              <div className={`text-2xl font-bold ${item.textColor}`}>{item.value}</div>
              <div className={`text-xs ${item.textColor} opacity-70`}>{item.label}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
            <Phone className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">回访状态</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {visitBackCards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className={`${item.bgClass} rounded-xl p-3 text-center`}>
                <div className="flex justify-center mb-1.5">
                  <div className={`w-7 h-7 ${item.iconBgClass} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-3.5 h-3.5 ${item.iconColor}`} />
                  </div>
                </div>
                <div className={`text-xl font-bold ${item.textColor}`}>{item.value}</div>
                <div className={`text-xs ${item.textColor} opacity-70`}>{item.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-700">{stats.overdueCount.overdue}</div>
          <div className="text-xs text-red-700 opacity-70">已超期</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700">{stats.overdueCount.warning}</div>
          <div className="text-xs text-amber-700 opacity-70">即将超期</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <PieChart className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">诉求类型占比</h3>
            <p className="text-xs text-slate-500">按诉求类型分类统计</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {stats.typeRatio.map((item) => (
            <div key={item.type} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">{item.type}</span>
                <span className="text-slate-500">{item.count} 件 · {item.ratio.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`${typeColors[item.type] || 'bg-slate-500'} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${item.ratio}%` }}
                ></div>
              </div>
            </div>
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
            <p className="text-xs text-slate-500">各渠道诉求数量</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {stats.sourceDistribution.map((item) => (
            <div key={item.source} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">{item.source}</span>
                <span className="text-slate-500">{item.count} 件 · {item.ratio.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`${sourceColors[item.source] || 'bg-slate-500'} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${item.ratio}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">近7天受理趋势</h3>
            <p className="text-xs text-slate-500">每日新增诉求数量</p>
          </div>
        </div>
        <div className="flex items-end justify-between gap-2 h-32">
          {stats.dailyTrend.map((day) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="flex-1 w-full flex items-end justify-center">
                <div
                  className="w-full max-w-[20px] bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md transition-all duration-500"
                  style={{
                    height: `${(day.count / maxTrendCount) * 100}%`,
                    minHeight: day.count > 0 ? '8px' : '2px',
                    opacity: day.count > 0 ? 1 : 0.3,
                  }}
                ></div>
              </div>
              <div className="text-[10px] text-slate-500 font-medium">{day.dateLabel}</div>
              <div className="text-[10px] text-slate-400">{day.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
            <Smile className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">满意度统计</h3>
            <p className="text-xs text-slate-500">群众满意度测评</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <ThumbsUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-xl font-bold text-green-700">
              {stats.satisfactionStats.satisfactionRate.toFixed(1)}%
            </div>
            <div className="text-xs text-green-700 opacity-70">满意率</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
            <div className="text-xl font-bold text-amber-700">
              {stats.satisfactionStats.averageScore.toFixed(1)}
            </div>
            <div className="text-xs text-amber-700 opacity-70">平均分</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Phone className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-bold text-blue-700">
              {stats.satisfactionStats.visitBackRate.toFixed(1)}%
            </div>
            <div className="text-xs text-blue-700 opacity-70">回访率</div>
          </div>
        </div>
        <div className="space-y-2">
          {SATISFACTION_OPTIONS.map((opt) => {
            const countMap: Record<string, number> = {
              'very_satisfied': stats.satisfactionStats.verySatisfiedCount,
              'satisfied': stats.satisfactionStats.satisfiedCount,
              'neutral': stats.satisfactionStats.neutralCount,
              'dissatisfied': stats.satisfactionStats.dissatisfiedCount,
              'very_dissatisfied': stats.satisfactionStats.veryDissatisfiedCount,
            };
            const count = countMap[opt.value] || 0;
            const ratio = stats.satisfactionStats.visitedCount > 0
              ? (count / stats.satisfactionStats.visitedCount) * 100
              : 0;
            const bgColors: Record<string, string> = {
              'very_satisfied': 'bg-green-500',
              'satisfied': 'bg-blue-500',
              'neutral': 'bg-yellow-500',
              'dissatisfied': 'bg-orange-500',
              'very_dissatisfied': 'bg-red-500',
            };
            return (
              <div key={opt.value} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">{opt.label}</span>
                  <span className="text-slate-500">{count} 件 · {ratio.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`${bgColors[opt.value]} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${ratio}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
