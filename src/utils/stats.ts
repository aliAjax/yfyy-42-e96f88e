import { COMPLAINT_TYPES, SOURCE_CHANNELS, SATISFACTION_OPTIONS, STATUS_OPTIONS } from '@/types/complaint';
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
  EscalationDistribution,
  ResponseTimeStats,
  OverdueLevelDistribution,
  StatusFlowStats,
  AnalysisStats,
  AnalysisFilter,
} from '@/types/complaint';
import { getLast7Days, formatDateKey, formatDateShort } from './helpers';
import { calculateOverdueCount, calculateOverdueInfo } from './overdue';

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

export function filterComplaintsByTimeRange(
  complaints: Complaint[],
  filter: AnalysisFilter
): Complaint[] {
  return complaints.filter((c) => {
    if (filter.receiveTimeStart) {
      if (new Date(c.receiveTime) < new Date(filter.receiveTimeStart)) return false;
    }
    if (filter.receiveTimeEnd) {
      const endDate = new Date(filter.receiveTimeEnd);
      endDate.setHours(23, 59, 59, 999);
      if (new Date(c.receiveTime) > endDate) return false;
    }
    return true;
  });
}

export function calculateEscalationDistribution(complaints: Complaint[]): EscalationDistribution {
  const total = complaints.length;
  let count0 = 0;
  let count1 = 0;
  let count2 = 0;
  let count3plus = 0;

  complaints.forEach((c) => {
    const len = c.escalationRecords?.length || 0;
    if (len === 0) count0++;
    else if (len === 1) count1++;
    else if (len === 2) count2++;
    else count3plus++;
  });

  return {
    '0次': { count: count0, ratio: total > 0 ? (count0 / total) * 100 : 0 },
    '1次': { count: count1, ratio: total > 0 ? (count1 / total) * 100 : 0 },
    '2次': { count: count2, ratio: total > 0 ? (count2 / total) * 100 : 0 },
    '3次及以上': { count: count3plus, ratio: total > 0 ? (count3plus / total) * 100 : 0 },
  };
}

export function calculateResponseTimeStats(complaints: Complaint[]): ResponseTimeStats {
  const repliedComplaints = complaints.filter(
    (c) => c.status === 'replied' && c.receiveTime && c.replyTime
  );

  const responseTimes: number[] = repliedComplaints.map((c) => {
    const receive = new Date(c.receiveTime).getTime();
    const reply = new Date(c.replyTime).getTime();
    return (reply - receive) / (1000 * 60 * 60);
  });

  responseTimes.sort((a, b) => a - b);

  const buckets = [
    { label: '1小时内', min: 0, max: 1 },
    { label: '1-6小时', min: 1, max: 6 },
    { label: '6-12小时', min: 6, max: 12 },
    { label: '12-24小时', min: 12, max: 24 },
    { label: '24-48小时', min: 24, max: 48 },
    { label: '48小时以上', min: 48, max: Infinity },
  ];

  const total = repliedComplaints.length;
  const bucketStats = buckets.map((b) => {
    const count = responseTimes.filter((t) => t >= b.min && t < b.max).length;
    return {
      bucket: b.label,
      count,
      ratio: total > 0 ? (count / total) * 100 : 0,
    };
  });

  const avgHours = responseTimes.length > 0
    ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
    : 0;

  const medianHours = responseTimes.length > 0
    ? responseTimes.length % 2 === 0
      ? (responseTimes[responseTimes.length / 2 - 1] + responseTimes[responseTimes.length / 2]) / 2
      : responseTimes[Math.floor(responseTimes.length / 2)]
    : 0;

  return {
    buckets: bucketStats,
    avgHours,
    medianHours,
  };
}

export function calculateOverdueLevelDistribution(
  complaints: Complaint[],
  now?: Date
): OverdueLevelDistribution {
  const activeComplaints = complaints.filter((c) => c.status !== 'replied');
  const total = activeComplaints.length;

  let normal = 0;
  let warning = 0;
  let overdue = 0;

  activeComplaints.forEach((c) => {
    const info = calculateOverdueInfo(c, now);
    if (info.isOverdue) overdue++;
    else if (info.isWarning) warning++;
    else normal++;
  });

  return {
    normal: { count: normal, ratio: total > 0 ? (normal / total) * 100 : 0 },
    warning: { count: warning, ratio: total > 0 ? (warning / total) * 100 : 0 },
    overdue: { count: overdue, ratio: total > 0 ? (overdue / total) * 100 : 0 },
  };
}

export function calculateStatusFlowStats(complaints: Complaint[]): StatusFlowStats {
  let pendingToProcessing = 0;
  let processingToReplied = 0;
  let pendingToReplied = 0;

  complaints.forEach((c) => {
    const records = [...(c.handleRecords || [])].sort(
      (a, b) => new Date(a.operatedAt).getTime() - new Date(b.operatedAt).getTime()
    );

    if (records.length < 2) return;

    for (let i = 1; i < records.length; i++) {
      const from = records[i - 1].status;
      const to = records[i].status;

      if (from === 'pending' && to === 'processing') pendingToProcessing++;
      else if (from === 'processing' && to === 'replied') processingToReplied++;
      else if (from === 'pending' && to === 'replied') pendingToReplied++;
    }
  });

  const totalTransitions = pendingToProcessing + processingToReplied + pendingToReplied;

  return {
    pendingToProcessing,
    processingToReplied,
    pendingToReplied,
    totalTransitions,
  };
}

export function calculateDailyTrendByRange(
  complaints: Complaint[],
  startDate: string,
  endDate: string
): DailyTrendItem[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const days: DailyTrendItem[] = [];
  const countMap = new Map<string, number>();

  complaints.forEach((c) => {
    const dateStr = c.receiveTime.split(' ')[0];
    countMap.set(dateStr, (countMap.get(dateStr) || 0) + 1);
  });

  const current = new Date(start);
  while (current <= end) {
    const dateStr = formatDateKey(current);
    days.push({
      date: dateStr,
      dateLabel: formatDateShort(current),
      count: countMap.get(dateStr) || 0,
    });
    current.setDate(current.getDate() + 1);
  }

  return days;
}

function getDefaultTimeRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return {
    start: formatDateKey(start),
    end: formatDateKey(end),
  };
}

export function calculateAnalysisStats(
  complaints: Complaint[],
  filter: AnalysisFilter,
  now?: Date
): AnalysisStats {
  const activeComplaints = complaints.filter((c) => c.mergeStatus !== 'merged');
  const filtered = filterComplaintsByTimeRange(activeComplaints, filter);

  const { start: defaultStart, end: defaultEnd } = getDefaultTimeRange();
  const trendStart = filter.receiveTimeStart || defaultStart;
  const trendEnd = filter.receiveTimeEnd || defaultEnd;

  return {
    total: filtered.length,
    typeRatio: calculateTypeRatio(filtered),
    sourceDistribution: calculateSourceDistribution(filtered),
    statusCount: calculateStatusCount(filtered),
    overdueLevelDistribution: calculateOverdueLevelDistribution(filtered, now),
    escalationDistribution: calculateEscalationDistribution(filtered),
    responseTimeStats: calculateResponseTimeStats(filtered),
    statusFlowStats: calculateStatusFlowStats(filtered),
    dailyTrend: calculateDailyTrendByRange(filtered, trendStart, trendEnd),
  };
}
