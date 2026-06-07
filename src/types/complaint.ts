export type ComplaintStatus = 'pending' | 'processing' | 'replied';

export type VisitBackStatus = 'pending' | 'completed' | 'unsatisfied';

export type MergeStatus = 'active' | 'merged' | 'master';

export interface MergeRecord {
  id: string;
  mergedComplaintId: string;
  mergedComplaintName: string;
  mergedAt: string;
  mergedBy: string;
  mergeReason?: string;
}

export interface DuplicateGroup {
  groupId: string;
  mainComplaintId: string;
  complaintIds: string[];
  createdAt: string;
  similarity: number;
  matchReasons: string[];
}

export type SatisfactionLevel = 'very_satisfied' | 'satisfied' | 'neutral' | 'dissatisfied' | 'very_dissatisfied';

export type OverdueLevel = 'normal' | 'warning' | 'overdue';

export const COMPLAINT_TYPES = ['投诉', '建议', '咨询', '求助', '其他'] as const;
export const SOURCE_CHANNELS = ['来电', '来访', '网上留言', '微信公众号', '上级转办', '其他'] as const;
export const STATUS_OPTIONS: { value: ComplaintStatus; label: string; color: string }[] = [
  { value: 'pending', label: '待处理', color: 'red' },
  { value: 'processing', label: '处理中', color: 'blue' },
  { value: 'replied', label: '已回复', color: 'green' },
];

export const VISIT_BACK_STATUS_OPTIONS: { value: VisitBackStatus; label: string; color: string }[] = [
  { value: 'pending', label: '待回访', color: 'orange' },
  { value: 'completed', label: '已回访', color: 'green' },
  { value: 'unsatisfied', label: '未满意', color: 'red' },
];

export const SATISFACTION_OPTIONS: { value: SatisfactionLevel; label: string; score: number; color: string }[] = [
  { value: 'very_satisfied', label: '非常满意', score: 5, color: 'green' },
  { value: 'satisfied', label: '满意', score: 4, color: 'blue' },
  { value: 'neutral', label: '一般', score: 3, color: 'yellow' },
  { value: 'dissatisfied', label: '不满意', score: 2, color: 'orange' },
  { value: 'very_dissatisfied', label: '非常不满意', score: 1, color: 'red' },
];

export const UNSATISFIED_REASONS = [
  '处理结果不符合预期',
  '处理时效过长',
  '服务态度不佳',
  '问题未得到根本解决',
  '沟通不及时',
  '其他原因',
] as const;

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

export interface VisitBackRecord {
  id: string;
  visitBackTime: string;
  visitBackResult: string;
  satisfaction: SatisfactionLevel;
  unsatisfiedReason?: string;
  secondaryHandleNote?: string;
  isReopened: boolean;
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
  visitBackStatus: VisitBackStatus;
  visitBackRecords: VisitBackRecord[];
  mergeStatus: MergeStatus;
  masterComplaintId?: string;
  masterComplaintName?: string;
  mergedRecords: MergeRecord[];
  duplicateGroupId?: string;
  sources: string[];
}

export type ComplaintFormData = Omit<Complaint, 'id' | 'status' | 'handleOpinion' | 'replyTime' | 'createdAt' | 'updatedAt' | 'handleRecords' | 'escalationRecords' | 'assigneeId' | 'assigneeName' | 'assignmentRecords' | 'visitBackStatus' | 'visitBackRecords' | 'mergeStatus' | 'masterComplaintId' | 'masterComplaintName' | 'mergedRecords' | 'duplicateGroupId' | 'sources'>;

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

export type VisitBackFormData = {
  visitBackTime: string;
  visitBackResult: string;
  satisfaction: SatisfactionLevel;
  unsatisfiedReason?: string;
  secondaryHandleNote?: string;
  reopenCase: boolean;
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

export interface VisitBackStatusCount {
  pending: number;
  completed: number;
  unsatisfied: number;
}

export interface SatisfactionStats {
  totalReplied: number;
  visitedCount: number;
  visitBackRate: number;
  averageScore: number;
  verySatisfiedCount: number;
  satisfiedCount: number;
  neutralCount: number;
  dissatisfiedCount: number;
  veryDissatisfiedCount: number;
  satisfactionRate: number;
}

export interface DashboardStats {
  total: number;
  statusCount: StatusCount;
  overdueCount: OverdueCount;
  typeRatio: TypeRatioItem[];
  sourceDistribution: SourceDistributionItem[];
  dailyTrend: DailyTrendItem[];
  visitBackStatusCount: VisitBackStatusCount;
  satisfactionStats: SatisfactionStats;
}

export interface ImportRowError {
  field: string;
  message: string;
}

export interface DuplicateRiskInfo {
  hasRisk: boolean;
  similarCount: number;
  topSimilarity: number;
}

export interface ParsedImportRow {
  index: number;
  data: ComplaintFormData;
  errors: ImportRowError[];
  isValid: boolean;
  duplicateRisk?: DuplicateRiskInfo;
}

export interface ImportPreviewResult {
  total: number;
  validCount: number;
  invalidCount: number;
  rows: ParsedImportRow[];
  headers: string[];
  fieldMapping: FieldMapping;
}

export type ImportFieldKey = 'name' | 'phone' | 'type' | 'source' | 'receiveTime' | 'content';

export const IMPORT_FIELD_LABELS: Record<ImportFieldKey, string> = {
  name: '姓名',
  phone: '电话',
  type: '诉求类型',
  source: '来源',
  receiveTime: '受理时间',
  content: '内容',
};

export interface FieldMapping {
  name: number | null;
  phone: number | null;
  type: number | null;
  source: number | null;
  receiveTime: number | null;
  content: number | null;
}

export type ImportStep = 'paste' | 'mapping' | 'preview';

export type ImportMode = 'all' | 'skipInvalid' | 'skipInvalidAndDuplicates';

export interface ViewFilter {
  types: string[];
  sources: string[];
  statuses: ComplaintStatus[];
  visitBackStatuses: VisitBackStatus[];
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
  visitBackStatuses: [],
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
