import { COMPLAINT_TYPES, SOURCE_CHANNELS } from '@/types/complaint';
import type { Complaint, TimeLimitRule, OverdueInfo, OverdueLevel } from '@/types/complaint';
import { formatDateTime } from './helpers';

const STORAGE_KEY = 'time_limit_rules';

const DEFAULT_RULES: TimeLimitRule[] = [
  { id: 'r1', type: '投诉', source: '来电', timeLimitHours: 24, warningHours: 12 },
  { id: 'r2', type: '投诉', source: '来访', timeLimitHours: 24, warningHours: 12 },
  { id: 'r3', type: '投诉', source: '网上留言', timeLimitHours: 48, warningHours: 24 },
  { id: 'r4', type: '投诉', source: '微信公众号', timeLimitHours: 48, warningHours: 24 },
  { id: 'r5', type: '投诉', source: '上级转办', timeLimitHours: 12, warningHours: 6 },
  { id: 'r6', type: '投诉', source: '其他', timeLimitHours: 72, warningHours: 36 },
  { id: 'r7', type: '建议', source: '来电', timeLimitHours: 48, warningHours: 24 },
  { id: 'r8', type: '建议', source: '来访', timeLimitHours: 48, warningHours: 24 },
  { id: 'r9', type: '建议', source: '网上留言', timeLimitHours: 72, warningHours: 36 },
  { id: 'r10', type: '建议', source: '微信公众号', timeLimitHours: 72, warningHours: 36 },
  { id: 'r11', type: '建议', source: '上级转办', timeLimitHours: 24, warningHours: 12 },
  { id: 'r12', type: '建议', source: '其他', timeLimitHours: 96, warningHours: 48 },
  { id: 'r13', type: '咨询', source: '来电', timeLimitHours: 12, warningHours: 6 },
  { id: 'r14', type: '咨询', source: '来访', timeLimitHours: 12, warningHours: 6 },
  { id: 'r15', type: '咨询', source: '网上留言', timeLimitHours: 24, warningHours: 12 },
  { id: 'r16', type: '咨询', source: '微信公众号', timeLimitHours: 24, warningHours: 12 },
  { id: 'r17', type: '咨询', source: '上级转办', timeLimitHours: 8, warningHours: 4 },
  { id: 'r18', type: '咨询', source: '其他', timeLimitHours: 36, warningHours: 18 },
  { id: 'r19', type: '求助', source: '来电', timeLimitHours: 12, warningHours: 6 },
  { id: 'r20', type: '求助', source: '来访', timeLimitHours: 12, warningHours: 6 },
  { id: 'r21', type: '求助', source: '网上留言', timeLimitHours: 24, warningHours: 12 },
  { id: 'r22', type: '求助', source: '微信公众号', timeLimitHours: 24, warningHours: 12 },
  { id: 'r23', type: '求助', source: '上级转办', timeLimitHours: 8, warningHours: 4 },
  { id: 'r24', type: '求助', source: '其他', timeLimitHours: 36, warningHours: 18 },
  { id: 'r25', type: '其他', source: '来电', timeLimitHours: 72, warningHours: 36 },
  { id: 'r26', type: '其他', source: '来访', timeLimitHours: 72, warningHours: 36 },
  { id: 'r27', type: '其他', source: '网上留言', timeLimitHours: 96, warningHours: 48 },
  { id: 'r28', type: '其他', source: '微信公众号', timeLimitHours: 96, warningHours: 48 },
  { id: 'r29', type: '其他', source: '上级转办', timeLimitHours: 48, warningHours: 24 },
  { id: 'r30', type: '其他', source: '其他', timeLimitHours: 120, warningHours: 60 },
];

export function getDefaultTimeLimitHours(type: string, source: string): number {
  const rule = DEFAULT_RULES.find((r) => r.type === type && r.source === source);
  return rule?.timeLimitHours || 72;
}

export function getDefaultWarningHours(type: string, source: string): number {
  const rule = DEFAULT_RULES.find((r) => r.type === type && r.source === source);
  return rule?.warningHours || 36;
}

export function getTimeLimitRules(): TimeLimitRule[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_RULES;
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RULES));
  return DEFAULT_RULES;
}

export function saveTimeLimitRules(rules: TimeLimitRule[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

export function getTimeLimitByTypeAndSource(type: string, source: string): { timeLimitHours: number; warningHours: number } {
  const rules = getTimeLimitRules();
  const rule = rules.find((r) => r.type === type && r.source === source);
  if (rule) {
    return { timeLimitHours: rule.timeLimitHours, warningHours: rule.warningHours };
  }
  return {
    timeLimitHours: getDefaultTimeLimitHours(type, source),
    warningHours: getDefaultWarningHours(type, source),
  };
}

export function calculateOverdueInfo(complaint: Complaint, now?: Date): OverdueInfo {
  const currentTime = now || new Date();

  if (complaint.status === 'replied') {
    return {
      isOverdue: false,
      isWarning: false,
      level: 'normal',
      remainingHours: 0,
      overdueHours: 0,
      timeLimitHours: 0,
      deadline: '',
    };
  }

  const { timeLimitHours, warningHours } = getTimeLimitByTypeAndSource(complaint.type, complaint.source);
  const receiveTime = new Date(complaint.receiveTime.replace(' ', 'T'));
  const deadline = new Date(receiveTime.getTime() + timeLimitHours * 60 * 60 * 1000);
  const diffMs = deadline.getTime() - currentTime.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  let level: OverdueLevel = 'normal';
  let isOverdue = false;
  let isWarning = false;

  if (diffHours <= 0) {
    level = 'overdue';
    isOverdue = true;
  } else if (diffHours <= warningHours) {
    level = 'warning';
    isWarning = true;
  }

  return {
    isOverdue,
    isWarning,
    level,
    remainingHours: Math.max(0, Math.round(diffHours * 10) / 10),
    overdueHours: Math.max(0, Math.round(-diffHours * 10) / 10),
    timeLimitHours,
    deadline: formatDateTime(deadline),
  };
}

export function isComplaintOverdue(complaint: Complaint): boolean {
  return calculateOverdueInfo(complaint).isOverdue;
}

export function isComplaintWarning(complaint: Complaint): boolean {
  return calculateOverdueInfo(complaint).isWarning;
}

export function calculateOverdueCount(complaints: Complaint[], now?: Date): { total: number; overdue: number; warning: number } {
  let overdue = 0;
  let warning = 0;

  complaints.forEach((c) => {
    if (c.status === 'replied') return;
    const info = calculateOverdueInfo(c, now);
    if (info.isOverdue) {
      overdue++;
    } else if (info.isWarning) {
      warning++;
    }
  });

  return {
    total: overdue + warning,
    overdue,
    warning,
  };
}

export function generateTimeLimitRules(): TimeLimitRule[] {
  const rules: TimeLimitRule[] = [];
  let id = 1;
  for (const type of COMPLAINT_TYPES) {
    for (const source of SOURCE_CHANNELS) {
      rules.push({
        id: `rule-${id++}`,
        type,
        source,
        timeLimitHours: getDefaultTimeLimitHours(type, source),
        warningHours: getDefaultWarningHours(type, source),
      });
    }
  }
  return rules;
}

export function formatHours(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} 分钟`;
  }
  const wholeHours = Math.floor(hours);
  const decimal = hours - wholeHours;
  if (decimal < 0.05) {
    return `${wholeHours} 小时`;
  }
  return `${hours.toFixed(1)} 小时`;
}
