import { COMPLAINT_TYPES, SOURCE_CHANNELS, SATISFACTION_OPTIONS } from '@/types/complaint';
import type {
  Complaint,
  DashboardStats,
  StatusCount,
  OverdueCount,
  TypeRatioItem,
  SourceDistributionItem,
  DailyTrendItem,
  VisitBackStatusCount,
  SatisfactionStats,
  SatisfactionLevel,
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

export function calculateOverdueStats(complaints: Complaint[], now?: Date): OverdueCount {
  return calculateOverdueCount(complaints, now);
}

export function calculateVisitBackStatusCount(complaints: Complaint[]): VisitBackStatusCount {
  const repliedComplaints = complaints.filter((c) => c.status === 'replied');
  return {
    pending: repliedComplaints.filter((c) => c.visitBackStatus === 'pending').length,
    completed: repliedComplaints.filter((c) => c.visitBackStatus === 'completed').length,
    unsatisfied: repliedComplaints.filter((c) => c.visitBackStatus === 'unsatisfied').length,
  };
}

export function calculateSatisfactionStats(complaints: Complaint[]): SatisfactionStats {
  const repliedComplaints = complaints.filter((c) => c.status === 'replied');
  const visitedComplaints = repliedComplaints.filter(
    (c) => c.visitBackStatus === 'completed' || c.visitBackStatus === 'unsatisfied'
  );

  let totalScore = 0;
  let verySatisfiedCount = 0;
  let satisfiedCount = 0;
  let neutralCount = 0;
  let dissatisfiedCount = 0;
  let veryDissatisfiedCount = 0;

  visitedComplaints.forEach((c) => {
    if (c.visitBackRecords && c.visitBackRecords.length > 0) {
      const lastRecord = c.visitBackRecords[c.visitBackRecords.length - 1];
      const satisfaction = lastRecord.satisfaction;
      const score = SATISFACTION_OPTIONS.find((opt) => opt.value === satisfaction)?.score || 0;
      totalScore += score;

      switch (satisfaction) {
        case 'very_satisfied':
          verySatisfiedCount++;
          break;
        case 'satisfied':
          satisfiedCount++;
          break;
        case 'neutral':
          neutralCount++;
          break;
        case 'dissatisfied':
          dissatisfiedCount++;
          break;
        case 'very_dissatisfied':
          veryDissatisfiedCount++;
          break;
      }
    }
  });

  const visitedCount = visitedComplaints.length;
  const totalReplied = repliedComplaints.length;
  const visitBackRate = totalReplied > 0 ? (visitedCount / totalReplied) * 100 : 0;
  const averageScore = visitedCount > 0 ? totalScore / visitedCount : 0;
  const satisfiedOrAbove = verySatisfiedCount + satisfiedCount;
  const satisfactionRate = visitedCount > 0 ? (satisfiedOrAbove / visitedCount) * 100 : 0;

  return {
    totalReplied,
    visitedCount,
    visitBackRate,
    averageScore,
    verySatisfiedCount,
    satisfiedCount,
    neutralCount,
    dissatisfiedCount,
    veryDissatisfiedCount,
    satisfactionRate,
  };
}

export function calculateDashboardStats(complaints: Complaint[], now?: Date): DashboardStats {
  return {
    total: complaints.length,
    statusCount: calculateStatusCount(complaints),
    overdueCount: calculateOverdueStats(complaints, now),
    typeRatio: calculateTypeRatio(complaints),
    sourceDistribution: calculateSourceDistribution(complaints),
    dailyTrend: calculateDailyTrend(complaints),
    visitBackStatusCount: calculateVisitBackStatusCount(complaints),
    satisfactionStats: calculateSatisfactionStats(complaints),
  };
}
