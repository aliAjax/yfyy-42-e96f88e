import type { Complaint, HandleRecord, ComplaintStatus } from '@/types/complaint';

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

type LegacyComplaint = Omit<Complaint, 'handleRecords'> & { handleRecords?: HandleRecord[] };

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

export function migrateComplaintData(complaints: LegacyComplaint[]): Complaint[] {
  return complaints.map((c) => {
    if (!c.handleRecords || !Array.isArray(c.handleRecords) || c.handleRecords.length === 0) {
      return {
        ...c,
        handleRecords: buildFullRecords(c),
      };
    }

    const completedRecords = ensureStatusProgression(c.handleRecords, c);

    return {
      ...c,
      handleRecords: completedRecords,
    };
  });
}
