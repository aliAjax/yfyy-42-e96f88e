export type ComplaintStatus = 'pending' | 'processing' | 'replied';

export type OverdueLevel = 'normal' | 'warning' | 'overdue';

export const COMPLAINT_TYPES = ['投诉', '建议', '咨询', '求助', '其他'] as const;
export const SOURCE_CHANNELS = ['来电', '来访', '网上留言', '微信公众号', '上级转办', '其他'] as const;
export const STATUS_OPTIONS: { value: ComplaintStatus; label: string; color: string }[] = [
  { value: 'pending', label: '待处理', color: 'red' },
  { value: 'processing', label: '处理中', color: 'blue' },
  { value: 'replied', label: '已回复', color: 'green' },
];

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface WorkTimeSlot {
  startTime: string;
  endTime: string;
}

export interface WorkDayConfig {
  dayOfWeek: DayOfWeek;
  enabled: boolean;
  slots: WorkTimeSlot[];
}

export interface HolidayItem {
  date: string;
  name: string;
}

export interface WorkTimeRule {
  enabled: boolean;
  workDays: WorkDayConfig[];
  holidays: HolidayItem[];
}

export interface TimeLimitRule {
  id: string;
  type: string;
  source: string;
  timeLimitHours: number;
  warningHours: number;
  useWorkTime?: boolean;
}

export interface EscalationRecord {
  id: string;
  reason: string;
  escalatedAt: string;
  escalatedBy: string;
}

export interface OverdueInfo {
  isOverdue: boolean;
  isWarning: boolean;
  level: OverdueLevel;
  remainingHours: number;
  overdueHours: number;
  timeLimitHours: number;
  deadline: string;
}

export interface HandleRecord {
  id: string;
  status: ComplaintStatus;
  handleOpinion: string;
  replyTime: string;
  operatedAt: string;
  operatorId?: string;
  operatorName?: string;
}

export interface AssignmentRecord {
  id: string;
  assigneeId: string;
  assigneeName: string;
  assignorId: string;
  assignorName: string;
  remark?: string;
  assignedAt: string;
}

export interface HandlerUser {
  id: string;
  name: string;
  phone?: string;
  department?: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  name: string;
  phone: string;
  type: string;
  content: string;
  source: string;
  receiveTime: string;
  status: ComplaintStatus;
  handleOpinion: string;
  replyTime: string;
  createdAt: string;
  updatedAt: string;
  handleRecords: HandleRecord[];
  escalationRecords: EscalationRecord[];
  assigneeId?: string;
  assigneeName?: string;
  assignmentRecords: AssignmentRecord[];
}

export type ComplaintFormData = Omit<Complaint, 'id' | 'status' | 'handleOpinion' | 'replyTime' | 'createdAt' | 'updatedAt' | 'handleRecords' | 'escalationRecords' | 'assigneeId' | 'assigneeName' | 'assignmentRecords'>;

export type AssignmentFormData = {
  assigneeId: string;
  assigneeName: string;
  remark?: string;
};

export type HandleFormData = {
  status: ComplaintStatus;
  handleOpinion: string;
  replyTime: string;
};

export interface StatusCount {
  pending: number;
  processing: number;
  replied: number;
}

export interface OverdueCount {
  total: number;
  overdue: number;
  warning: number;
}

export interface TypeRatioItem {
  type: string;
  count: number;
  ratio: number;
}

export interface SourceDistributionItem {
  source: string;
  count: number;
  ratio: number;
}

export interface DailyTrendItem {
  date: string;
  dateLabel: string;
  count: number;
}

export interface DashboardStats {
  total: number;
  statusCount: StatusCount;
  overdueCount: OverdueCount;
  typeRatio: TypeRatioItem[];
  sourceDistribution: SourceDistributionItem[];
  dailyTrend: DailyTrendItem[];
}

export interface ImportRowError {
  field: string;
  message: string;
}

export interface ParsedImportRow {
  index: number;
  data: ComplaintFormData;
  errors: ImportRowError[];
  isValid: boolean;
}

export interface ImportPreviewResult {
  total: number;
  validCount: number;
  invalidCount: number;
  rows: ParsedImportRow[];
}

export interface ViewFilter {
  types: string[];
  sources: string[];
  statuses: ComplaintStatus[];
  escalated: boolean | null;
  overdue: boolean | null;
  receiveTimeStart: string | null;
  receiveTimeEnd: string | null;
  keyword: string;
}

export interface SavedView {
  id: string;
  name: string;
  filter: ViewFilter;
  createdAt: string;
  updatedAt: string;
  role: string;
}

export const DEFAULT_FILTER: ViewFilter = {
  types: [],
  sources: [],
  statuses: [],
  escalated: null,
  overdue: null,
  receiveTimeStart: null,
  receiveTimeEnd: null,
  keyword: '',
};

export type BatchActionType = 'status' | 'escalate' | 'delete' | 'export';

export interface BatchStatusData {
  status: ComplaintStatus;
  handleOpinion: string;
  replyTime: string;
}

export interface BatchEscalateData {
  reason: string;
}

export type BatchOperationData = BatchStatusData | BatchEscalateData | Record<string, never>;
