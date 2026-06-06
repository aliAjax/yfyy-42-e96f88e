export type ComplaintStatus = 'pending' | 'processing' | 'replied';

export const COMPLAINT_TYPES = ['投诉', '建议', '咨询', '求助', '其他'] as const;
export const SOURCE_CHANNELS = ['来电', '来访', '网上留言', '微信公众号', '上级转办', '其他'] as const;
export const STATUS_OPTIONS: { value: ComplaintStatus; label: string; color: string }[] = [
  { value: 'pending', label: '待处理', color: 'red' },
  { value: 'processing', label: '处理中', color: 'blue' },
  { value: 'replied', label: '已回复', color: 'green' },
];

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
}

export type ComplaintFormData = Omit<Complaint, 'id' | 'status' | 'handleOpinion' | 'replyTime' | 'createdAt' | 'updatedAt'>;

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
  typeRatio: TypeRatioItem[];
  sourceDistribution: SourceDistributionItem[];
  dailyTrend: DailyTrendItem[];
}
