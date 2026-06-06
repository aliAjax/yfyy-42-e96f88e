import { COMPLAINT_TYPES, SOURCE_CHANNELS } from '@/types/complaint';
import type {
  Complaint,
  DashboardStats,
  StatusCount,
  OverdueCount,
  TypeRatioItem,
  SourceDistributionItem,
  DailyTrendItem,
} from '@/types/complaint';
import { getLast7Days } from './helpers';
import { calculateOverdueCount } from './overdue';

export function calculateStatusCount(complaints: Complaint[]): StatusCount {
  return {
    pending: complaints.filter((c) => c.status === 'pending').length,
    processing: complaints.filter((c) => c.status === 'processing').length,
    replied: complaints.filter((c) => c.status === 'replied').length,
  };
}

export function calculateTypeRatio(complaints: Complaint[]): TypeRatioItem[] {
  const total = complaints.length;
  return COMPLAINT_TYPES.map((type) => {
    const count = complaints.filter((c) => c.type === type).length;
    return {
      type,
      count,
      ratio: total > 0 ? (count / total) * 100 : 0,
    };
  }).sort((a, b) => b.count - a.count);
}

export function calculateSourceDistribution(complaints: Complaint[]): SourceDistributionItem[] {
  const total = complaints.length;
  return SOURCE_CHANNELS.map((source) => {
    const count = complaints.filter((c) => c.source === source).length;
    return {
      source,
      count,
      ratio: total > 0 ? (count / total) * 100 : 0,
    };
  }).sort((a, b) => b.count - a.count);
}

export function calculateDailyTrend(complaints: Complaint[]): DailyTrendItem[] {
  const last7Days = getLast7Days();
  const countMap = new Map<string, number>();

  complaints.forEach((c) => {
    const dateStr = c.receiveTime.split(' ')[0];
    countMap.set(dateStr, (countMap.get(dateStr) || 0) + 1);
  });

  return last7Days.map((day) => ({
    date: day.date,
    dateLabel: day.dateLabel,
    count: countMap.get(day.date) || 0,
  }));
}

export function calculateOverdueStats(complaints: Complaint[]): OverdueCount {
  return calculateOverdueCount(complaints);
}

export function calculateDashboardStats(complaints: Complaint[]): DashboardStats {
  return {
    total: complaints.length,
    statusCount: calculateStatusCount(complaints),
    overdueCount: calculateOverdueStats(complaints),
    typeRatio: calculateTypeRatio(complaints),
    sourceDistribution: calculateSourceDistribution(complaints),
    dailyTrend: calculateDailyTrend(complaints),
  };
}
