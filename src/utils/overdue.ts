import { COMPLAINT_TYPES, SOURCE_CHANNELS } from '@/types/complaint';
import type { Complaint, TimeLimitRule, OverdueInfo, OverdueLevel, WorkTimeRule, WorkDayConfig, HolidayItem, DayOfWeek, WorkTimeSlot } from '@/types/complaint';
import { formatDateTime } from './helpers';

const STORAGE_KEY = 'time_limit_rules';
const WORK_TIME_RULE_STORAGE_KEY = 'work_time_rule';

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
      const parsed = JSON.parse(stored);
      const migrated = parsed.map((rule: TimeLimitRule) => ({
        ...rule,
        useWorkTime: rule.useWorkTime ?? false,
      }));
      return migrated;
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

  const rules = getTimeLimitRules();
  const rule = rules.find((r) => r.type === complaint.type && r.source === complaint.source);
  const { timeLimitHours, warningHours } = getTimeLimitByTypeAndSource(complaint.type, complaint.source);
  const workTimeRule = getWorkTimeRule();

  const useWorkTime = workTimeRule.enabled && rule?.useWorkTime;

  const receiveTime = new Date(complaint.receiveTime.replace(' ', 'T'));
  let deadline: Date;
  let remainingHours: number;
  let overdueHours: number;

  if (useWorkTime) {
    deadline = addWorkHours(receiveTime, timeLimitHours, workTimeRule);
    const elapsedWorkHours = calculateWorkHoursBetween(receiveTime, currentTime, workTimeRule);
    const diffWorkHours = timeLimitHours - elapsedWorkHours;
    if (diffWorkHours >= 0) {
      remainingHours = Math.round(diffWorkHours * 10) / 10;
      overdueHours = 0;
    } else {
      remainingHours = 0;
      overdueHours = Math.round(-diffWorkHours * 10) / 10;
    }
  } else {
    deadline = new Date(receiveTime.getTime() + timeLimitHours * 60 * 60 * 1000);
    const diffMs = deadline.getTime() - currentTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    remainingHours = Math.max(0, Math.round(diffHours * 10) / 10);
    overdueHours = Math.max(0, Math.round(-diffHours * 10) / 10);
  }

  let level: OverdueLevel = 'normal';
  let isOverdue = false;
  let isWarning = false;

  if (remainingHours <= 0 && overdueHours > 0) {
    level = 'overdue';
    isOverdue = true;
  } else if (remainingHours <= warningHours) {
    level = 'warning';
    isWarning = true;
  }

  return {
    isOverdue,
    isWarning,
    level,
    remainingHours,
    overdueHours,
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

const DEFAULT_WORK_DAYS: WorkDayConfig[] = [
  { dayOfWeek: 1, enabled: true, slots: [{ startTime: '09:00', endTime: '12:00' }, { startTime: '13:30', endTime: '17:30' }] },
  { dayOfWeek: 2, enabled: true, slots: [{ startTime: '09:00', endTime: '12:00' }, { startTime: '13:30', endTime: '17:30' }] },
  { dayOfWeek: 3, enabled: true, slots: [{ startTime: '09:00', endTime: '12:00' }, { startTime: '13:30', endTime: '17:30' }] },
  { dayOfWeek: 4, enabled: true, slots: [{ startTime: '09:00', endTime: '12:00' }, { startTime: '13:30', endTime: '17:30' }] },
  { dayOfWeek: 5, enabled: true, slots: [{ startTime: '09:00', endTime: '12:00' }, { startTime: '13:30', endTime: '17:30' }] },
  { dayOfWeek: 6, enabled: false, slots: [] },
  { dayOfWeek: 0, enabled: false, slots: [] },
];

const DEFAULT_HOLIDAYS: HolidayItem[] = [];

const DEFAULT_WORK_TIME_RULE: WorkTimeRule = {
  enabled: false,
  workDays: DEFAULT_WORK_DAYS,
  holidays: DEFAULT_HOLIDAYS,
};

export function getWorkTimeRule(): WorkTimeRule {
  const stored = localStorage.getItem(WORK_TIME_RULE_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_WORK_TIME_RULE;
    }
  }
  return DEFAULT_WORK_TIME_RULE;
}

export function saveWorkTimeRule(rule: WorkTimeRule): void {
  localStorage.setItem(WORK_TIME_RULE_STORAGE_KEY, JSON.stringify(rule));
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isHoliday(date: Date, holidays: HolidayItem[]): boolean {
  const dateKey = formatDateKey(date);
  return holidays.some((h) => h.date === dateKey);
}

function isWorkDay(date: Date, workDays: WorkDayConfig[], holidays: HolidayItem[]): boolean {
  if (isHoliday(date, holidays)) return false;
  const dayOfWeek = date.getDay() as DayOfWeek;
  const workDay = workDays.find((d) => d.dayOfWeek === dayOfWeek);
  return workDay?.enabled || false;
}

function isValidSlot(slot: WorkTimeSlot): boolean {
  if (!slot.startTime || !slot.endTime) return false;
  const start = parseTime(slot.startTime);
  const end = parseTime(slot.endTime);
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  return endMinutes > startMinutes;
}

function getValidSlots(workDay: WorkDayConfig): WorkTimeSlot[] {
  return workDay.slots.filter(isValidSlot);
}

function hasAnyWorkDay(workDays: WorkDayConfig[]): boolean {
  return workDays.some((d) => d.enabled && getValidSlots(d).length > 0);
}

function isWorkTimeRuleValid(rule: WorkTimeRule): boolean {
  if (!rule.enabled) return true;
  return hasAnyWorkDay(rule.workDays);
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

function getDayWorkSeconds(workDay: WorkDayConfig): number {
  if (!workDay.enabled) return 0;
  const validSlots = getValidSlots(workDay);
  if (validSlots.length === 0) return 0;
  let totalSeconds = 0;
  for (const slot of validSlots) {
    const start = parseTime(slot.startTime);
    const end = parseTime(slot.endTime);
    const startMinutes = start.hours * 60 + start.minutes;
    const endMinutes = end.hours * 60 + end.minutes;
    totalSeconds += (endMinutes - startMinutes) * 60;
  }
  return totalSeconds;
}

function getSecondsSinceMidnight(date: Date): number {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

function getWorkSecondsPassedInDay(date: Date, workDay: WorkDayConfig): number {
  if (!workDay.enabled) return 0;
  const validSlots = getValidSlots(workDay);
  if (validSlots.length === 0) return 0;
  const currentSeconds = getSecondsSinceMidnight(date);
  let passedSeconds = 0;
  for (const slot of validSlots) {
    const start = parseTime(slot.startTime);
    const end = parseTime(slot.endTime);
    const startSeconds = start.hours * 3600 + start.minutes * 60;
    const endSeconds = end.hours * 3600 + end.minutes * 60;
    if (currentSeconds >= endSeconds) {
      passedSeconds += endSeconds - startSeconds;
    } else if (currentSeconds > startSeconds) {
      passedSeconds += currentSeconds - startSeconds;
    }
  }
  return passedSeconds;
}

function getWorkSecondsRemainingInDay(date: Date, workDay: WorkDayConfig): number {
  if (!workDay.enabled) return 0;
  const validSlots = getValidSlots(workDay);
  if (validSlots.length === 0) return 0;
  const currentSeconds = getSecondsSinceMidnight(date);
  let remainingSeconds = 0;
  for (const slot of validSlots) {
    const start = parseTime(slot.startTime);
    const end = parseTime(slot.endTime);
    const startSeconds = start.hours * 3600 + start.minutes * 60;
    const endSeconds = end.hours * 3600 + end.minutes * 60;
    if (currentSeconds <= startSeconds) {
      remainingSeconds += endSeconds - startSeconds;
    } else if (currentSeconds < endSeconds) {
      remainingSeconds += endSeconds - currentSeconds;
    }
  }
  return remainingSeconds;
}

const MAX_ITERATION_DAYS = 365 * 10;

export function addWorkHours(startDate: Date, workHours: number, workTimeRule: WorkTimeRule): Date {
  const { workDays, holidays } = workTimeRule;
  let remainingSeconds = workHours * 3600;
  const currentDate = new Date(startDate);

  if (!isWorkTimeRuleValid(workTimeRule) || workHours <= 0) {
    return new Date(startDate);
  }

  const dayOfWeek = currentDate.getDay() as DayOfWeek;
  const workDay = workDays.find((d) => d.dayOfWeek === dayOfWeek);
  const validSlots = workDay ? getValidSlots(workDay) : [];

  if (isWorkDay(currentDate, workDays, holidays) && workDay && validSlots.length > 0) {
    const remainingInDay = getWorkSecondsRemainingInDay(currentDate, workDay);
    if (remainingSeconds <= remainingInDay) {
      let secsToAdd = remainingSeconds;
      const currentSeconds = getSecondsSinceMidnight(currentDate);
      for (const slot of validSlots) {
        const start = parseTime(slot.startTime);
        const end = parseTime(slot.endTime);
        const startSeconds = start.hours * 3600 + start.minutes * 60;
        const endSeconds = end.hours * 3600 + end.minutes * 60;
        if (currentSeconds >= endSeconds) continue;
        const slotStart = Math.max(currentSeconds, startSeconds);
        const slotDuration = endSeconds - slotStart;
        if (secsToAdd <= slotDuration) {
          const resultSeconds = slotStart + secsToAdd;
          currentDate.setHours(0, 0, 0, 0);
          currentDate.setSeconds(resultSeconds);
          return currentDate;
        } else {
          secsToAdd -= slotDuration;
        }
      }
    } else {
      remainingSeconds -= remainingInDay;
    }
  }

  currentDate.setHours(0, 0, 0, 0);
  currentDate.setDate(currentDate.getDate() + 1);

  let iterations = 0;
  while (remainingSeconds > 0 && iterations < MAX_ITERATION_DAYS) {
    iterations++;
    const dayOfWeek = currentDate.getDay() as DayOfWeek;
    const workDay = workDays.find((d) => d.dayOfWeek === dayOfWeek);
    const validSlots = workDay ? getValidSlots(workDay) : [];

    if (isWorkDay(currentDate, workDays, holidays) && workDay && validSlots.length > 0) {
      const dayWorkSeconds = getDayWorkSeconds(workDay);
      if (remainingSeconds <= dayWorkSeconds) {
        let secsToAdd = remainingSeconds;
        for (const slot of validSlots) {
          const start = parseTime(slot.startTime);
          const end = parseTime(slot.endTime);
          const startSeconds = start.hours * 3600 + start.minutes * 60;
          const endSeconds = end.hours * 3600 + end.minutes * 60;
          const slotDuration = endSeconds - startSeconds;
          if (secsToAdd <= slotDuration) {
            const resultSeconds = startSeconds + secsToAdd;
            currentDate.setSeconds(resultSeconds);
            return currentDate;
          } else {
            secsToAdd -= slotDuration;
          }
        }
      } else {
        remainingSeconds -= dayWorkSeconds;
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return currentDate;
}

export function calculateWorkHoursBetween(startDate: Date, endDate: Date, workTimeRule: WorkTimeRule): number {
  const { workDays, holidays } = workTimeRule;
  if (endDate <= startDate) return 0;
  if (!isWorkTimeRuleValid(workTimeRule)) return 0;

  let totalSeconds = 0;
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startDayOfWeek = start.getDay() as DayOfWeek;
  const startWorkDay = workDays.find((d) => d.dayOfWeek === startDayOfWeek);
  if (isWorkDay(start, workDays, holidays) && startWorkDay) {
    const startDayEnd = new Date(start);
    startDayEnd.setHours(23, 59, 59, 999);
    if (end <= startDayEnd) {
      const endDayOfWeek = end.getDay() as DayOfWeek;
      const endWorkDay = workDays.find((d) => d.dayOfWeek === endDayOfWeek);
      if (endWorkDay && isWorkDay(end, workDays, holidays)) {
        const startPassed = getWorkSecondsPassedInDay(start, startWorkDay);
        const endPassed = getWorkSecondsPassedInDay(end, endWorkDay);
        totalSeconds = endPassed - startPassed;
        return Math.max(0, totalSeconds) / 3600;
      }
    }
    totalSeconds += getWorkSecondsRemainingInDay(start, startWorkDay);
  }

  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  current.setDate(current.getDate() + 1);

  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  let iterations = 0;
  while (current < endDay && iterations < MAX_ITERATION_DAYS) {
    iterations++;
    const dayOfWeek = current.getDay() as DayOfWeek;
    const workDay = workDays.find((d) => d.dayOfWeek === dayOfWeek);
    if (isWorkDay(current, workDays, holidays) && workDay) {
      totalSeconds += getDayWorkSeconds(workDay);
    }
    current.setDate(current.getDate() + 1);
  }

  const endDayOfWeek = end.getDay() as DayOfWeek;
  const endWorkDay = workDays.find((d) => d.dayOfWeek === endDayOfWeek);
  if (isWorkDay(end, workDays, holidays) && endWorkDay) {
    totalSeconds += getWorkSecondsPassedInDay(end, endWorkDay);
  }

  return Math.max(0, totalSeconds) / 3600;
}
