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

function hasEnteredVisitBackFlow(complaint: Complaint): boolean {
  return (
    complaint.status === 'replied' ||
    Boolean(complaint.replyTime) ||
    complaint.handleRecords.some((record) => record.status === 'replied') ||
    complaint.visitBackRecords.length > 0
  );
}

export function calculateVisitBackStatusCount(complaints: Complaint[]): VisitBackStatusCount {
  const visitBackFlowComplaints = complaints.filter(hasEnteredVisitBackFlow);
  return {
    pending: visitBackFlowComplaints.filter((c) => c.visitBackStatus === 'pending').length,
    completed: visitBackFlowComplaints.filter((c) => c.visitBackStatus === 'completed').length,
    unsatisfied: visitBackFlowComplaints.filter((c) => c.visitBackStatus === 'unsatisfied').length,
  };
}

export function calculateSatisfactionStats(complaints: Complaint[]): SatisfactionStats {
  const visitBackFlowComplaints = complaints.filter(hasEnteredVisitBackFlow);
  const visitedComplaints = visitBackFlowComplaints.filter(
    (c) =>
      c.visitBackRecords.length > 0 &&
      (c.visitBackStatus === 'completed' || c.visitBackStatus === 'unsatisfied')
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
  const totalReplied = visitBackFlowComplaints.length;
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
  const activeComplaints = complaints.filter((c) => c.mergeStatus !== 'merged');
  return {
    total: activeComplaints.length,
    statusCount: calculateStatusCount(activeComplaints),
    overdueCount: calculateOverdueStats(activeComplaints, now),
    typeRatio: calculateTypeRatio(activeComplaints),
    sourceDistribution: calculateSourceDistribution(activeComplaints),
    dailyTrend: calculateDailyTrend(activeComplaints),
    visitBackStatusCount: calculateVisitBackStatusCount(activeComplaints),
    satisfactionStats: calculateSatisfactionStats(activeComplaints),
  };
}
