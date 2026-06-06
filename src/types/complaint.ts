export type ComplaintStatus = 'pending' | 'processing' | 'replied';

export type OverdueLevel = 'normal' | 'warning' | 'overdue';

export const COMPLAINT_TYPES = ['投诉', '建议', '咨询', '求助', '其他'] as const;
export const SOURCE_CHANNELS = ['来电', '来访', '网上留言', '微信公众号', '上级转办', '其他'] as const;
export const STATUS_OPTIONS: { value: ComplaintStatus; label: string; color: string }[] = [
  { value: 'pending', label: '待处理', color: 'red' },
  { value: 'processing', label: '处理中', color: 'blue' },
  { value: 'replied', label: '已回复', color: 'green' },
];

export interface TimeLimitRule {
  id: string;
  type: string;
  source: string;
  timeLimitHours: number;
  warningHours: number;
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
}

export type ComplaintFormData = Omit<Complaint, 'id' | 'status' | 'handleOpinion' | 'replyTime' | 'createdAt' | 'updatedAt' | 'handleRecords' | 'escalationRecords'>;

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
