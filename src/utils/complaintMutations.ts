import type {
  Complaint,
  ComplaintFormData,
  HandleFormData,
  AssignmentFormData,
  VisitBackFormData,
  HandleRecord,
  EscalationRecord,
  AssignmentRecord,
  VisitBackRecord,
  VisitBackStatus,
  BatchStatusData,
  ComplaintStatus,
} from '@/types/complaint';
import { generateId, formatDateTime } from './helpers';

export interface OperatorContext {
  operatorName: string;
  operatorId: string;
}

export function createComplaint(data: ComplaintFormData, now: string): Complaint {
  return {
    id: generateId(),
    ...data,
    status: 'pending',
    handleOpinion: '',
    replyTime: '',
    createdAt: now,
    updatedAt: now,
    handleRecords: [],
    escalationRecords: [],
    assignmentRecords: [],
    visitBackStatus: 'pending',
    visitBackRecords: [],
    mergeStatus: 'active',
    masterComplaintId: '',
    masterComplaintName: '',
    mergedRecords: [],
    duplicateGroupId: '',
    sources: data.source ? [data.source] : [''],
  };
}

export function createBatchComplaints(rows: ComplaintFormData[], now: string): Complaint[] {
  return rows.map((data) => createComplaint(data, now));
}

export function handleComplaint(
  complaint: Complaint,
  data: HandleFormData,
  now: string,
  operator?: OperatorContext
): Complaint {
  const lastRecord = complaint.handleRecords.length > 0
    ? complaint.handleRecords[complaint.handleRecords.length - 1]
    : null;

  const hasChanged = !lastRecord
    || lastRecord.status !== data.status
    || lastRecord.handleOpinion !== data.handleOpinion
    || lastRecord.replyTime !== data.replyTime;

  const newRecords = hasChanged
    ? [
        ...complaint.handleRecords,
        {
          id: generateId(),
          status: data.status,
          handleOpinion: data.handleOpinion,
          replyTime: data.replyTime,
          operatedAt: now,
          ...operator,
        } as HandleRecord,
      ]
    : complaint.handleRecords;

  return {
    ...complaint,
    status: data.status,
    handleOpinion: data.handleOpinion,
    replyTime: data.replyTime,
    updatedAt: now,
    handleRecords: newRecords,
  };
}

export function escalateComplaint(
  complaint: Complaint,
  reason: string,
  now: string,
  escalatedBy: string
): Complaint {
  const escalationRecord: EscalationRecord = {
    id: generateId(),
    reason,
    escalatedAt: formatDateTime(new Date(now)),
    escalatedBy,
  };

  const existingRecords = complaint.escalationRecords || [];

  return {
    ...complaint,
    updatedAt: now,
    escalationRecords: [...existingRecords, escalationRecord],
  };
}

export function assignComplaint(
  complaint: Complaint,
  data: AssignmentFormData,
  now: string,
  assignor: OperatorContext
): Complaint {
  const assignmentRecord: AssignmentRecord = {
    id: generateId(),
    assigneeId: data.assigneeId,
    assigneeName: data.assigneeName,
    assignorId: assignor.operatorId,
    assignorName: assignor.operatorName,
    remark: data.remark,
    assignedAt: now,
  };

  const existingRecords = complaint.assignmentRecords || [];

  return {
    ...complaint,
    assigneeId: data.assigneeId,
    assigneeName: data.assigneeName,
    updatedAt: now,
    assignmentRecords: [...existingRecords, assignmentRecord],
  };
}

export function visitBackComplaint(
  complaint: Complaint,
  data: VisitBackFormData,
  now: string,
  operator: OperatorContext
): Complaint {
  const isDissatisfied = data.satisfaction === 'dissatisfied' || data.satisfaction === 'very_dissatisfied';
  const newVisitBackStatus: VisitBackStatus = data.reopenCase
    ? 'unsatisfied'
    : isDissatisfied
    ? 'unsatisfied'
    : 'completed';

  const visitBackRecord: VisitBackRecord = {
    id: generateId(),
    visitBackTime: data.visitBackTime,
    visitBackResult: data.visitBackResult,
    satisfaction: data.satisfaction,
    unsatisfiedReason: data.unsatisfiedReason,
    secondaryHandleNote: data.secondaryHandleNote,
    isReopened: data.reopenCase,
    operatedAt: now,
    operatorId: operator.operatorId,
    operatorName: operator.operatorName,
  };

  const existingRecords = complaint.visitBackRecords || [];
  const updatedVisitBackRecords = [...existingRecords, visitBackRecord];

  let updatedStatus = complaint.status;
  let updatedHandleRecords = complaint.handleRecords;
  let updatedHandleOpinion = complaint.handleOpinion;

  if (data.reopenCase) {
    updatedStatus = 'processing';
    const reopenRecord: HandleRecord = {
      id: generateId(),
      status: 'processing' as ComplaintStatus,
      handleOpinion: data.secondaryHandleNote || '因群众不满意，重新进入处理流程',
      replyTime: '',
      operatedAt: now,
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
    };
    updatedHandleRecords = [...complaint.handleRecords, reopenRecord];
    updatedHandleOpinion = data.secondaryHandleNote || complaint.handleOpinion;
  }

  return {
    ...complaint,
    status: updatedStatus,
    handleOpinion: updatedHandleOpinion,
    updatedAt: now,
    handleRecords: updatedHandleRecords,
    visitBackStatus: data.reopenCase ? 'unsatisfied' : newVisitBackStatus,
    visitBackRecords: updatedVisitBackRecords,
  };
}

export function updateComplaintById(
  complaints: Complaint[],
  id: string,
  updater: (complaint: Complaint) => Complaint
): Complaint[] {
  return complaints.map((c) => (c.id === id ? updater(c) : c));
}

export function batchUpdateComplaints(
  complaints: Complaint[],
  ids: string[],
  updater: (complaint: Complaint) => Complaint
): Complaint[] {
  const idSet = new Set(ids);
  return complaints.map((c) => (idSet.has(c.id) ? updater(c) : c));
}

export function batchHandleComplaints(
  complaints: Complaint[],
  ids: string[],
  data: BatchStatusData,
  now: string,
  operator: OperatorContext
): Complaint[] {
  return batchUpdateComplaints(complaints, ids, (c) =>
    handleComplaint(c, data, now, operator)
  );
}

export function batchEscalateComplaints(
  complaints: Complaint[],
  ids: string[],
  reason: string,
  now: string,
  escalatedBy: string
): Complaint[] {
  return batchUpdateComplaints(complaints, ids, (c) =>
    escalateComplaint(c, reason, now, escalatedBy)
  );
}

export function deleteComplaint(complaints: Complaint[], id: string): Complaint[] {
  return complaints.filter((c) => c.id !== id);
}

export function batchDeleteComplaints(complaints: Complaint[], ids: string[]): Complaint[] {
  const idSet = new Set(ids);
  return complaints.filter((c) => !idSet.has(c.id));
}
