import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateOverdueInfo,
  isComplaintOverdue,
  isComplaintWarning,
  calculateOverdueCount,
  getTimeLimitRules,
  saveTimeLimitRules,
  getWorkTimeRule,
  saveWorkTimeRule,
  addWorkHours,
  calculateWorkHoursBetween,
  getDefaultTimeLimitHours,
  getDefaultWarningHours,
  getTimeLimitByTypeAndSource,
  formatHours,
} from './overdue';
import type { Complaint, WorkTimeRule, TimeLimitRule } from '@/types/complaint';

const STORAGE_KEY = 'time_limit_rules';
const WORK_TIME_RULE_STORAGE_KEY = 'work_time_rule';

function createMockComplaint(
  overrides: Partial<Complaint> = {}
): Complaint {
  const base: Complaint = {
    id: 'test-1',
    name: '测试用户',
    phone: '13800138000',
    type: '投诉',
    content: '测试内容',
    source: '来电',
    receiveTime: '2024-01-15 10:00',
    status: 'pending',
    handleOpinion: '',
    replyTime: '',
    createdAt: '2024-01-15 10:00',
    updatedAt: '2024-01-15 10:00',
    handleRecords: [],
    escalationRecords: [],
    assignmentRecords: [],
    visitBackStatus: 'pending',
    visitBackRecords: [],
    mergeStatus: 'active',
    mergedRecords: [],
    sources: ['来电'],
  };
  return { ...base, ...overrides };
}

function createStandardWorkTimeRule(): WorkTimeRule {
  return {
    enabled: true,
    workDays: [
      { dayOfWeek: 1, enabled: true, slots: [{ startTime: '09:00', endTime: '12:00' }, { startTime: '13:30', endTime: '17:30' }] },
      { dayOfWeek: 2, enabled: true, slots: [{ startTime: '09:00', endTime: '12:00' }, { startTime: '13:30', endTime: '17:30' }] },
      { dayOfWeek: 3, enabled: true, slots: [{ startTime: '09:00', endTime: '12:00' }, { startTime: '13:30', endTime: '17:30' }] },
      { dayOfWeek: 4, enabled: true, slots: [{ startTime: '09:00', endTime: '12:00' }, { startTime: '13:30', endTime: '17:30' }] },
      { dayOfWeek: 5, enabled: true, slots: [{ startTime: '09:00', endTime: '12:00' }, { startTime: '13:30', endTime: '17:30' }] },
      { dayOfWeek: 6, enabled: false, slots: [] },
      { dayOfWeek: 0, enabled: false, slots: [] },
    ],
    holidays: [],
  };
}

describe('overdue utils - 基础规则读取', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('getDefaultTimeLimitHours 应返回正确的默认时限', () => {
    expect(getDefaultTimeLimitHours('投诉', '来电')).toBe(24);
    expect(getDefaultTimeLimitHours('投诉', '网上留言')).toBe(48);
    expect(getDefaultTimeLimitHours('投诉', '上级转办')).toBe(12);
    expect(getDefaultTimeLimitHours('建议', '来电')).toBe(48);
    expect(getDefaultTimeLimitHours('咨询', '来电')).toBe(12);
    expect(getDefaultTimeLimitHours('求助', '来电')).toBe(12);
    expect(getDefaultTimeLimitHours('其他', '其他')).toBe(120);
    expect(getDefaultTimeLimitHours('不存在的类型', '不存在的来源')).toBe(72);
  });

  it('getDefaultWarningHours 应返回正确的默认预警时间', () => {
    expect(getDefaultWarningHours('投诉', '来电')).toBe(12);
    expect(getDefaultWarningHours('投诉', '网上留言')).toBe(24);
    expect(getDefaultWarningHours('投诉', '上级转办')).toBe(6);
    expect(getDefaultWarningHours('建议', '来电')).toBe(24);
    expect(getDefaultWarningHours('咨询', '来电')).toBe(6);
  });

  it('getTimeLimitRules 首次调用应初始化默认规则到 localStorage', () => {
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    const rules = getTimeLimitRules();
    expect(rules.length).toBe(30);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.length).toBe(30);
  });

  it('saveTimeLimitRules 和 getTimeLimitByTypeAndSource 应正确读写自定义规则', () => {
    const customRules: TimeLimitRule[] = [
      { id: 'custom-1', type: '投诉', source: '来电', timeLimitHours: 10, warningHours: 5 },
    ];
    saveTimeLimitRules(customRules);
    const result = getTimeLimitByTypeAndSource('投诉', '来电');
    expect(result.timeLimitHours).toBe(10);
    expect(result.warningHours).toBe(5);
  });

  it('getTimeLimitByTypeAndSource 对未匹配类型应返回默认值', () => {
    saveTimeLimitRules([]);
    const result = getTimeLimitByTypeAndSource('未知类型', '未知来源');
    expect(result.timeLimitHours).toBe(72);
    expect(result.warningHours).toBe(36);
  });
});

describe('overdue utils - 自然小时模式', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('已回复诉求不应计入预警或逾期', () => {
    const complaint = createMockComplaint({
      status: 'replied',
      receiveTime: '2024-01-15 10:00',
    });
    const now = new Date('2024-01-20 10:00');
    const info = calculateOverdueInfo(complaint, now);
    expect(info.isOverdue).toBe(false);
    expect(info.isWarning).toBe(false);
    expect(info.level).toBe('normal');
    expect(info.remainingHours).toBe(0);
    expect(info.overdueHours).toBe(0);
    expect(info.timeLimitHours).toBe(0);
  });

  it('新受理且时限充裕时应为 normal 状态', () => {
    const complaint = createMockComplaint({
      type: '投诉',
      source: '来电',
      receiveTime: '2024-01-15 10:00',
      status: 'pending',
    });
    const now = new Date('2024-01-15 11:00');
    const info = calculateOverdueInfo(complaint, now);
    expect(info.isOverdue).toBe(false);
    expect(info.isWarning).toBe(false);
    expect(info.level).toBe('normal');
    expect(info.remainingHours).toBe(23);
    expect(info.overdueHours).toBe(0);
    expect(info.timeLimitHours).toBe(24);
  });

  it('剩余时间刚好等于预警阈值时应进入预警', () => {
    const complaint = createMockComplaint({
      type: '投诉',
      source: '来电',
      receiveTime: '2024-01-15 10:00',
      status: 'pending',
    });
    const now = new Date('2024-01-15 22:00');
    const info = calculateOverdueInfo(complaint, now);
    expect(info.isWarning).toBe(true);
    expect(info.level).toBe('warning');
    expect(info.remainingHours).toBe(12);
  });

  it('剩余时间略小于预警阈值时应处于预警状态', () => {
    const complaint = createMockComplaint({
      type: '投诉',
      source: '来电',
      receiveTime: '2024-01-15 10:00',
      status: 'pending',
    });
    const now = new Date('2024-01-15 23:00');
    const info = calculateOverdueInfo(complaint, now);
    expect(info.isWarning).toBe(true);
    expect(info.level).toBe('warning');
    expect(info.remainingHours).toBe(11);
  });

  it('刚好到达截止时间时 remainingHours 和 overdueHours 都为 0，状态为 warning', () => {
    const complaint = createMockComplaint({
      type: '投诉',
      source: '来电',
      receiveTime: '2024-01-15 10:00',
      status: 'pending',
    });
    const now = new Date('2024-01-16 10:00');
    const info = calculateOverdueInfo(complaint, now);
    expect(info.remainingHours).toBe(0);
    expect(info.overdueHours).toBe(0);
    expect(info.isWarning).toBe(true);
    expect(info.level).toBe('warning');
  });

  it('超过截止时间几分钟（超过舍入精度）应判定为逾期', () => {
    const complaint = createMockComplaint({
      type: '投诉',
      source: '来电',
      receiveTime: '2024-01-15 10:00',
      status: 'pending',
    });
    const now = new Date('2024-01-16 10:06');
    const info = calculateOverdueInfo(complaint, now);
    expect(info.isOverdue).toBe(true);
    expect(info.level).toBe('overdue');
    expect(info.remainingHours).toBe(0);
    expect(info.overdueHours).toBe(0.1);
  });

  it('超过截止时间后应计算正确的逾期小时数', () => {
    const complaint = createMockComplaint({
      type: '投诉',
      source: '来电',
      receiveTime: '2024-01-15 10:00',
      status: 'pending',
    });
    const now = new Date('2024-01-16 15:30');
    const info = calculateOverdueInfo(complaint, now);
    expect(info.isOverdue).toBe(true);
    expect(info.overdueHours).toBe(5.5);
    expect(info.remainingHours).toBe(0);
  });

  it('不同诉求类型和来源应读取对应时限规则', () => {
    const complaint1 = createMockComplaint({
      type: '投诉',
      source: '上级转办',
      receiveTime: '2024-01-15 10:00',
      status: 'pending',
    });
    const info1 = calculateOverdueInfo(complaint1, new Date('2024-01-15 15:00'));
    expect(info1.timeLimitHours).toBe(12);
    expect(info1.remainingHours).toBe(7);

    const complaint2 = createMockComplaint({
      type: '建议',
      source: '网上留言',
      receiveTime: '2024-01-15 10:00',
      status: 'pending',
    });
    const info2 = calculateOverdueInfo(complaint2, new Date('2024-01-15 15:00'));
    expect(info2.timeLimitHours).toBe(72);
    expect(info2.remainingHours).toBe(67);
  });

  it('isComplaintOverdue 和 isComplaintWarning 辅助函数应返回正确结果', () => {
    const complaint = createMockComplaint({
      type: '投诉',
      source: '来电',
      receiveTime: '2024-01-15 10:00',
      status: 'pending',
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15 15:00'));
    expect(isComplaintOverdue(complaint)).toBe(false);
    expect(isComplaintWarning(complaint)).toBe(false);

    vi.setSystemTime(new Date('2024-01-15 23:00'));
    expect(isComplaintOverdue(complaint)).toBe(false);
    expect(isComplaintWarning(complaint)).toBe(true);

    vi.setSystemTime(new Date('2024-01-16 15:00'));
    expect(isComplaintOverdue(complaint)).toBe(true);
    expect(isComplaintWarning(complaint)).toBe(false);
    vi.useRealTimers();
  });

  it('calculateOverdueCount 应正确统计逾期和预警数量，跳过已回复', () => {
    const complaints: Complaint[] = [
      createMockComplaint({ id: '1', status: 'replied', receiveTime: '2024-01-10 10:00' }),
      createMockComplaint({ id: '2', status: 'pending', receiveTime: '2024-01-10 10:00', type: '投诉', source: '来电' }),
      createMockComplaint({ id: '3', status: 'processing', receiveTime: '2024-01-14 22:00', type: '投诉', source: '来电' }),
      createMockComplaint({ id: '4', status: 'pending', receiveTime: '2024-01-15 15:00', type: '投诉', source: '来电' }),
    ];
    const now = new Date('2024-01-16 10:00');
    const result = calculateOverdueCount(complaints, now);
    expect(result.overdue).toBe(2);
    expect(result.warning).toBe(1);
    expect(result.total).toBe(3);
  });
});

describe('overdue utils - formatHours', () => {
  it('小于1小时应显示分钟', () => {
    expect(formatHours(0.5)).toBe('30 分钟');
    expect(formatHours(0.25)).toBe('15 分钟');
  });

  it('整数小时应只显示小时', () => {
    expect(formatHours(2)).toBe('2 小时');
    expect(formatHours(5)).toBe('5 小时');
  });

  it('带小数的小时应显示一位小数', () => {
    expect(formatHours(2.5)).toBe('2.5 小时');
    expect(formatHours(3.3)).toBe('3.3 小时');
  });
});

describe('overdue utils - 工作时间模式 - addWorkHours', () => {
  const workRule = createStandardWorkTimeRule();

  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('工作日上午开始 + 3小时应在当天中午12点结束', () => {
    const start = new Date('2024-01-15T09:00:00');
    const result = addWorkHours(start, 3, workRule);
    expect(result.getHours()).toBe(12);
    expect(result.getMinutes()).toBe(0);
    expect(result.getDate()).toBe(15);
  });

  it('工作日上午 11:00 开始 + 3小时应跨午休到下午 15:30', () => {
    const start = new Date('2024-01-15T11:00:00');
    const result = addWorkHours(start, 3, workRule);
    expect(result.getHours()).toBe(15);
    expect(result.getMinutes()).toBe(30);
    expect(result.getDate()).toBe(15);
  });

  it('工作日午休期间开始应从下午上班时间算起', () => {
    const start = new Date('2024-01-15T12:30:00');
    const result = addWorkHours(start, 1, workRule);
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(30);
    expect(result.getDate()).toBe(15);
  });

  it('工作日下午 14:00 开始 + 5小时应跨到第二天上午 10:30', () => {
    const start = new Date('2024-01-15T14:00:00');
    const result = addWorkHours(start, 5, workRule);
    expect(result.getDate()).toBe(16);
    expect(result.getHours()).toBe(10);
    expect(result.getMinutes()).toBe(30);
  });

  it('刚上班时加 0 小时应返回原时间', () => {
    const start = new Date('2024-01-15T09:00:00');
    const result = addWorkHours(start, 0, workRule);
    expect(result.getTime()).toBe(start.getTime());
  });

  it('工作时间加负数应返回原时间', () => {
    const start = new Date('2024-01-15T09:00:00');
    const result = addWorkHours(start, -1, workRule);
    expect(result.getTime()).toBe(start.getTime());
  });
});

describe('overdue utils - 工作时间模式 - calculateWorkHoursBetween', () => {
  const workRule = createStandardWorkTimeRule();

  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('同工作日上午时段应正确计算', () => {
    const start = new Date('2024-01-15T09:00:00');
    const end = new Date('2024-01-15T11:30:00');
    const hours = calculateWorkHoursBetween(start, end, workRule);
    expect(hours).toBe(2.5);
  });

  it('跨午休时段应正确计算（只算工作时段）', () => {
    const start = new Date('2024-01-15T11:00:00');
    const end = new Date('2024-01-15T14:00:00');
    const hours = calculateWorkHoursBetween(start, end, workRule);
    expect(hours).toBe(1.5);
  });

  it('跨两个完整工作日应正确计算', () => {
    const start = new Date('2024-01-15T09:00:00');
    const end = new Date('2024-01-16T12:00:00');
    const hours = calculateWorkHoursBetween(start, end, workRule);
    expect(hours).toBe(10);
  });

  it('end 早于 start 应返回 0', () => {
    const start = new Date('2024-01-15T15:00:00');
    const end = new Date('2024-01-15T10:00:00');
    const hours = calculateWorkHoursBetween(start, end, workRule);
    expect(hours).toBe(0);
  });

  it('同一时刻应返回 0', () => {
    const date = new Date('2024-01-15T12:00:00');
    const hours = calculateWorkHoursBetween(date, date, workRule);
    expect(hours).toBe(0);
  });
});

describe('overdue utils - 工作时间模式 - 周末和节假日', () => {
  const workRule = createStandardWorkTimeRule();

  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('周五下午 14:00 开始 + 5小时应跨周末到下周一 10:30', () => {
    const start = new Date('2024-01-12T14:00:00');
    const result = addWorkHours(start, 5, workRule);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(10);
    expect(result.getMinutes()).toBe(30);
  });

  it('周六开始计算应自动跳到周一', () => {
    const start = new Date('2024-01-13T10:00:00');
    const result = addWorkHours(start, 3, workRule);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(12);
    expect(result.getMinutes()).toBe(0);
  });

  it('周日开始计算应自动跳到周一', () => {
    const start = new Date('2024-01-14T10:00:00');
    const result = addWorkHours(start, 3, workRule);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(12);
    expect(result.getMinutes()).toBe(0);
  });

  it('节假日应跳过不计算工作时间', () => {
    const ruleWithHoliday: WorkTimeRule = {
      ...workRule,
      holidays: [{ date: '2024-01-15', name: '测试假日' }],
    };
    const start = new Date('2024-01-12T14:00:00');
    const result = addWorkHours(start, 5, ruleWithHoliday);
    expect(result.getDate()).toBe(16);
    expect(result.getHours()).toBe(10);
    expect(result.getMinutes()).toBe(30);
  });

  it('calculateWorkHoursBetween 跨周末应只算工作日', () => {
    const start = new Date('2024-01-12T09:00:00');
    const end = new Date('2024-01-15T12:00:00');
    const hours = calculateWorkHoursBetween(start, end, workRule);
    expect(hours).toBe(10);
  });

  it('整个周末区间应返回 0 小时', () => {
    const start = new Date('2024-01-13T09:00:00');
    const end = new Date('2024-01-14T18:00:00');
    const hours = calculateWorkHoursBetween(start, end, workRule);
    expect(hours).toBe(0);
  });
});

describe('overdue utils - 工作时间模式 - 临界时间', () => {
  const workRule = createStandardWorkTimeRule();

  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('上午下班临界 - 刚好 12:00 结束', () => {
    const start = new Date('2024-01-15T09:00:00');
    const result = addWorkHours(start, 3, workRule);
    expect(result.getHours()).toBe(12);
    expect(result.getMinutes()).toBe(0);
  });

  it('下午下班临界 - 刚好 17:30 结束', () => {
    const start = new Date('2024-01-15T13:30:00');
    const result = addWorkHours(start, 4, workRule);
    expect(result.getHours()).toBe(17);
    expect(result.getMinutes()).toBe(30);
  });

  it('非工作日且时间相同应返回 0 小时', () => {
    const date = new Date('2024-01-13T12:00:00');
    const hours = calculateWorkHoursBetween(date, date, workRule);
    expect(hours).toBe(0);
  });

  it('工作时间规则无效时 addWorkHours 应返回原时间', () => {
    const invalidRule: WorkTimeRule = {
      enabled: true,
      workDays: [],
      holidays: [],
    };
    const start = new Date('2024-01-15T09:00:00');
    const result = addWorkHours(start, 5, invalidRule);
    expect(result.getTime()).toBe(start.getTime());
  });

  it('工作时间规则无效时 calculateWorkHoursBetween 应返回 0', () => {
    const invalidRule: WorkTimeRule = {
      enabled: true,
      workDays: [],
      holidays: [],
    };
    const start = new Date('2024-01-15T09:00:00');
    const end = new Date('2024-01-16T09:00:00');
    const hours = calculateWorkHoursBetween(start, end, invalidRule);
    expect(hours).toBe(0);
  });
});

describe('overdue utils - 工作时间模式 - 与 calculateOverdueInfo 集成', () => {
  const workRule = createStandardWorkTimeRule();

  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  function setupWorkTimeRule(type: string, source: string, timeLimitHours: number, warningHours: number) {
    saveWorkTimeRule(workRule);
    const rules: TimeLimitRule[] = [
      { id: 'test-1', type, source, timeLimitHours, warningHours, useWorkTime: true },
    ];
    saveTimeLimitRules(rules);
  }

  it('使用工作时间模式时应按工作时间计算剩余时间', () => {
    setupWorkTimeRule('投诉', '来电', 8, 4);
    const complaint = createMockComplaint({
      type: '投诉',
      source: '来电',
      receiveTime: '2024-01-15 09:00',
      status: 'pending',
    });
    const now = new Date('2024-01-15 11:00');
    const info = calculateOverdueInfo(complaint, now);
    expect(info.isOverdue).toBe(false);
    expect(info.remainingHours).toBe(6);
    expect(info.timeLimitHours).toBe(8);
  });

  it('工作时间模式下跨午休的预警判定', () => {
    setupWorkTimeRule('投诉', '来电', 4, 2);
    const complaint = createMockComplaint({
      type: '投诉',
      source: '来电',
      receiveTime: '2024-01-15 11:00',
      status: 'pending',
    });
    const now = new Date('2024-01-15 13:30');
    const info = calculateOverdueInfo(complaint, now);
    expect(info.remainingHours).toBe(3);
    expect(info.isWarning).toBe(false);
    expect(info.level).toBe('normal');
  });

  it('工作时间模式下剩余时间刚好等于预警阈值时应进入预警', () => {
    setupWorkTimeRule('投诉', '来电', 4, 2);
    const complaint = createMockComplaint({
      type: '投诉',
      source: '来电',
      receiveTime: '2024-01-15 09:00',
      status: 'pending',
    });
    const now = new Date('2024-01-15 11:00');
    const info = calculateOverdueInfo(complaint, now);
    expect(info.remainingHours).toBe(2);
    expect(info.isWarning).toBe(true);
    expect(info.level).toBe('warning');
  });

  it('工作时间模式下刚好到达截止时间时状态为 warning', () => {
    setupWorkTimeRule('投诉', '来电', 3, 1);
    const complaint = createMockComplaint({
      type: '投诉',
      source: '来电',
      receiveTime: '2024-01-15 09:00',
      status: 'pending',
    });
    const now = new Date('2024-01-15 12:00');
    const info = calculateOverdueInfo(complaint, now);
    expect(info.remainingHours).toBe(0);
    expect(info.overdueHours).toBe(0);
    expect(info.isWarning).toBe(true);
    expect(info.level).toBe('warning');
  });

  it('工作时间模式下超过截止时间应判定为逾期', () => {
    setupWorkTimeRule('投诉', '来电', 3, 1);
    const complaint = createMockComplaint({
      type: '投诉',
      source: '来电',
      receiveTime: '2024-01-15 09:00',
      status: 'pending',
    });
    const now = new Date('2024-01-15 13:36');
    const info = calculateOverdueInfo(complaint, now);
    expect(info.isOverdue).toBe(true);
    expect(info.level).toBe('overdue');
    expect(info.overdueHours).toBe(0.1);
  });

  it('工作时间模式下已回复诉求不计入', () => {
    setupWorkTimeRule('投诉', '来电', 8, 4);
    const complaint = createMockComplaint({
      type: '投诉',
      source: '来电',
      receiveTime: '2024-01-10 09:00',
      status: 'replied',
    });
    const now = new Date('2024-01-20 10:00');
    const info = calculateOverdueInfo(complaint, now);
    expect(info.isOverdue).toBe(false);
    expect(info.isWarning).toBe(false);
    expect(info.level).toBe('normal');
  });

  it('工作时间模式下跨周末的逾期判定', () => {
    setupWorkTimeRule('投诉', '来电', 4, 2);
    const complaint = createMockComplaint({
      type: '投诉',
      source: '来电',
      receiveTime: '2024-01-12 14:00',
      status: 'pending',
    });
    const now = new Date('2024-01-15 11:00');
    const info = calculateOverdueInfo(complaint, now);
    expect(info.overdueHours).toBe(1.5);
    expect(info.isOverdue).toBe(true);
  });

  it('工作时间规则未启用时应退回自然小时模式', () => {
    saveWorkTimeRule({ ...workRule, enabled: false });
    const rules: TimeLimitRule[] = [
      { id: 'test-1', type: '投诉', source: '来电', timeLimitHours: 24, warningHours: 12, useWorkTime: true },
    ];
    saveTimeLimitRules(rules);

    const complaint = createMockComplaint({
      type: '投诉',
      source: '来电',
      receiveTime: '2024-01-15 10:00',
      status: 'pending',
    });
    const now = new Date('2024-01-16 10:06');
    const info = calculateOverdueInfo(complaint, now);
    expect(info.isOverdue).toBe(true);
  });

  it('规则未设置 useWorkTime 时应使用自然小时模式', () => {
    saveWorkTimeRule(workRule);
    const rules: TimeLimitRule[] = [
      { id: 'test-1', type: '投诉', source: '来电', timeLimitHours: 24, warningHours: 12 },
    ];
    saveTimeLimitRules(rules);

    const complaint = createMockComplaint({
      type: '投诉',
      source: '来电',
      receiveTime: '2024-01-15 10:00',
      status: 'pending',
    });
    const now = new Date('2024-01-16 10:06');
    const info = calculateOverdueInfo(complaint, now);
    expect(info.isOverdue).toBe(true);
  });
});

describe('overdue utils - localStorage 边界情况', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('localStorage 存了无效 JSON 时应回退到默认规则', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid json');
    const rules = getTimeLimitRules();
    expect(rules.length).toBe(30);
  });

  it('localStorage 存了无效 workTimeRule 时应回退到默认', () => {
    localStorage.setItem(WORK_TIME_RULE_STORAGE_KEY, 'not valid json');
    const rule = getWorkTimeRule();
    expect(rule.enabled).toBe(false);
    expect(rule.workDays.length).toBe(7);
  });

  it('旧版规则（没有 useWorkTime 字段）应自动迁移为 false', () => {
    const oldRules = [
      { id: 'old-1', type: '投诉', source: '来电', timeLimitHours: 24, warningHours: 12 },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(oldRules));
    const rules = getTimeLimitRules();
    expect(rules[0].useWorkTime).toBe(false);
  });
});
