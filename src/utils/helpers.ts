import type { Complaint, HandleRecord, ComplaintStatus, EscalationRecord, AssignmentRecord, VisitBackStatus, VisitBackRecord, MergeStatus } from '@/types/complaint';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function getCurrentDateTime(): string {
  return formatDateTime(new Date());
}

export function getCurrentDateTimeInput(): string {
  return formatDateInput(new Date());
}

export function formatDateShort(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLast7Days(): { date: string; dateLabel: string }[] {
  const days: { date: string; dateLabel: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: formatDateKey(d),
      dateLabel: formatDateShort(d),
    });
  }
  return days;
}

type LegacyComplaint = Omit<Complaint, 'handleRecords' | 'escalationRecords' | 'assignmentRecords' | 'visitBackStatus' | 'visitBackRecords' | 'mergeStatus' | 'mergedRecords' | 'sources'> & {
  handleRecords?: HandleRecord[];
  escalationRecords?: EscalationRecord[];
  assigneeId?: string;
  assigneeName?: string;
  assignmentRecords?: AssignmentRecord[];
  visitBackStatus?: VisitBackStatus;
  visitBackRecords?: VisitBackRecord[];
  mergeStatus?: string;
  mergedRecords?: unknown[];
  sources?: string[];
};

function getInitialTime(c: LegacyComplaint): string {
  if (c.createdAt) return c.createdAt;
  if (c.receiveTime) {
    const t = new Date(c.receiveTime.replace(' ', 'T'));
    if (!isNaN(t.getTime())) return t.toISOString();
  }
  return new Date().toISOString();
}

function getUpdateTime(c: LegacyComplaint): string {
  return c.updatedAt || c.createdAt || new Date().toISOString();
}

function getMidTime(start: string, end: string): string {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return new Date(s + (e - s) / 2).toISOString();
}

function sortRecordsByTime(records: HandleRecord[]): HandleRecord[] {
  return [...records].sort(
    (a, b) => new Date(a.operatedAt).getTime() - new Date(b.operatedAt).getTime()
  );
}

function buildFullRecords(c: LegacyComplaint): HandleRecord[] {
  const handleRecords: HandleRecord[] = [];
  const initialTime = getInitialTime(c);
  const updateTime = getUpdateTime(c);
  const status = c.status as ComplaintStatus;

  handleRecords.push({
    id: generateId(),
    status: 'pending',
    handleOpinion: '',
    replyTime: '',
    operatedAt: initialTime,
  });

  if (status === 'processing') {
    handleRecords.push({
      id: generateId(),
      status: 'processing',
      handleOpinion: c.handleOpinion || '',
      replyTime: '',
      operatedAt: updateTime,
    });
  }

  if (status === 'replied') {
    const midTime = getMidTime(initialTime, updateTime);
    handleRecords.push({
      id: generateId(),
      status: 'processing',
      handleOpinion: '',
      replyTime: '',
      operatedAt: midTime,
    });
    handleRecords.push({
      id: generateId(),
      status: 'replied',
      handleOpinion: c.handleOpinion || '',
      replyTime: c.replyTime || '',
      operatedAt: updateTime,
    });
  }

  return handleRecords;
}

function ensureInitialPendingRecord(
  records: HandleRecord[],
  c: LegacyComplaint
): HandleRecord[] {
  const sorted = sortRecordsByTime(records);

  if (sorted.length > 0 && sorted[0].status === 'pending') {
    return sorted;
  }

  const firstTime = sorted.length > 0 ? sorted[0].operatedAt : getUpdateTime(c);
  const initialTime = getInitialTime(c);
  const pendingTime = initialTime < firstTime ? initialTime : firstTime;

  const pendingRecord: HandleRecord = {
    id: generateId(),
    status: 'pending',
    handleOpinion: '',
    replyTime: '',
    operatedAt: pendingTime,
  };

  return [pendingRecord, ...sorted];
}

function hasStatus(records: HandleRecord[], status: ComplaintStatus): boolean {
  return records.some((record) => record.status === status);
}

function createProcessingRecord(
  c: LegacyComplaint,
  operatedAt: string,
  handleOpinion = ''
): HandleRecord {
  return {
    id: generateId(),
    status: 'processing',
    handleOpinion,
    replyTime: '',
    operatedAt,
  };
}

function createRepliedRecord(c: LegacyComplaint, operatedAt: string): HandleRecord {
  return {
    id: generateId(),
    status: 'replied',
    handleOpinion: c.handleOpinion || '',
    replyTime: c.replyTime || '',
    operatedAt,
  };
}

function ensureStatusProgression(records: HandleRecord[], c: LegacyComplaint): HandleRecord[] {
  const status = c.status as ComplaintStatus;
  let completedRecords = ensureInitialPendingRecord(records, c);

  if (status === 'pending') {
    return completedRecords;
  }

  if (status === 'processing' && !hasStatus(completedRecords, 'processing')) {
    completedRecords = [
      ...completedRecords,
      createProcessingRecord(c, getUpdateTime(c), c.handleOpinion || ''),
    ];
  }

  if (status === 'replied') {
    const earliestReplied = sortRecordsByTime(completedRecords).find(
      (record) => record.status === 'replied'
    );
    const pendingTime = completedRecords[0]?.operatedAt || getInitialTime(c);
    const replyTime = earliestReplied?.operatedAt || getUpdateTime(c);

    if (!hasStatus(completedRecords, 'processing')) {
      completedRecords = [
        ...completedRecords,
        createProcessingRecord(c, getMidTime(pendingTime, replyTime)),
      ];
    }

    if (!hasStatus(completedRecords, 'replied')) {
      completedRecords = [...completedRecords, createRepliedRecord(c, getUpdateTime(c))];
    }
  }

  return sortRecordsByTime(completedRecords);
}

function getDefaultVisitBackStatus(c: LegacyComplaint): VisitBackStatus {
  if (c.visitBackStatus) return c.visitBackStatus;
  if (c.status === 'replied') return 'pending';
  return 'pending';
}

export function migrateComplaintData(complaints: LegacyComplaint[]): Complaint[] {
  return complaints.map((c) => {
    let handleRecords: HandleRecord[];
    if (!c.handleRecords || !Array.isArray(c.handleRecords) || c.handleRecords.length === 0) {
      handleRecords = buildFullRecords(c);
    } else {
      handleRecords = ensureStatusProgression(c.handleRecords, c);
    }

    const escalationRecords: EscalationRecord[] =
      c.escalationRecords && Array.isArray(c.escalationRecords) ? c.escalationRecords : [];

    const assignmentRecords: AssignmentRecord[] =
      c.assignmentRecords && Array.isArray(c.assignmentRecords) ? c.assignmentRecords : [];

    const visitBackRecords: VisitBackRecord[] =
      c.visitBackRecords && Array.isArray(c.visitBackRecords) ? c.visitBackRecords : [];

    const visitBackStatus = getDefaultVisitBackStatus(c);

    const validMergeStatuses = ['active', 'merged', 'master'] as const;
    const mergeStatus =
      c.mergeStatus && validMergeStatuses.includes(c.mergeStatus as typeof validMergeStatuses[number])
        ? (c.mergeStatus as MergeStatus)
        : 'active';
    const mergedRecords = c.mergedRecords && Array.isArray(c.mergedRecords) ? c.mergedRecords : [];
    const sources = c.sources && Array.isArray(c.sources) && c.sources.length > 0 ? c.sources : [c.source || ''];

    return {
      ...c,
      handleRecords,
      escalationRecords,
      assignmentRecords,
      assigneeId: c.assigneeId,
      assigneeName: c.assigneeName,
      visitBackStatus,
      visitBackRecords,
      mergeStatus,
      mergedRecords,
      sources,
    } as Complaint;
  });
}
