import type { Complaint, MergeRecord, DuplicateGroup } from '@/types/complaint';
import { findSimilarComplaints } from './similarity';
import { generateId, formatDateTime } from './helpers';

export function detectDuplicateGroups(
  complaints: Complaint[],
  threshold: number = 0.5
): DuplicateGroup[] {
  const activeComplaints = complaints.filter((c) => c.mergeStatus === 'active');
  const groups: DuplicateGroup[] = [];
  const processedIds = new Set<string>();

  for (const complaint of activeComplaints) {
    if (processedIds.has(complaint.id)) continue;

    const similar = findSimilarComplaints(
      {
        name: complaint.name,
        phone: complaint.phone,
        type: complaint.type,
        content: complaint.content,
        source: complaint.source,
        receiveTime: complaint.receiveTime,
      },
      activeComplaints.filter((c) => c.id !== complaint.id && !processedIds.has(c.id)),
      threshold
    );

    if (similar.length > 0) {
      const groupIds = [complaint.id, ...similar.map((s) => s.complaint.id)];
      groupIds.forEach((id) => processedIds.add(id));

      const topSimilar = similar[0];

      groups.push({
        groupId: generateId(),
        mainComplaintId: complaint.id,
        complaintIds: groupIds,
        createdAt: new Date().toISOString(),
        similarity: topSimilar.similarity,
        matchReasons: topSimilar.matchReasons,
      });
    }
  }

  return groups;
}

export function getDuplicateGroupById(
  complaints: Complaint[],
  groupId: string
): Complaint[] {
  return complaints.filter((c) => c.duplicateGroupId === groupId);
}

export function getSimilarComplaintsForOne(
  targetComplaint: Complaint,
  allComplaints: Complaint[],
  threshold: number = 0.3
): Complaint[] {
  const similar = findSimilarComplaints(
    {
      name: targetComplaint.name,
      phone: targetComplaint.phone,
      type: targetComplaint.type,
      content: targetComplaint.content,
      source: targetComplaint.source,
      receiveTime: targetComplaint.receiveTime,
    },
    allComplaints.filter(
      (c) => c.id !== targetComplaint.id && c.mergeStatus === 'active'
    ),
    threshold
  );
  return similar.map((s) => s.complaint);
}

export function mergeComplaints(
  masterComplaint: Complaint,
  complaintsToMerge: Complaint[],
  mergedBy: string,
  mergeReason?: string
): Complaint[] {
  const now = new Date().toISOString();
  const nowFormatted = formatDateTime(new Date(now));

  const updatedComplaints: Complaint[] = [];

  const allHandleRecords = [
    ...masterComplaint.handleRecords,
    ...complaintsToMerge.flatMap((c) => c.handleRecords),
  ].sort(
    (a, b) =>
      new Date(a.operatedAt).getTime() - new Date(b.operatedAt).getTime()
  );

  const allEscalationRecords = [
    ...masterComplaint.escalationRecords,
    ...complaintsToMerge.flatMap((c) => c.escalationRecords),
  ].sort(
    (a, b) =>
      new Date(a.escalatedAt).getTime() - new Date(b.escalatedAt).getTime()
  );

  const allAssignmentRecords = [
    ...masterComplaint.assignmentRecords,
    ...complaintsToMerge.flatMap((c) => c.assignmentRecords),
  ].sort(
    (a, b) =>
      new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime()
  );

  const allVisitBackRecords = [
    ...masterComplaint.visitBackRecords,
    ...complaintsToMerge.flatMap((c) => c.visitBackRecords),
  ].sort(
    (a, b) =>
      new Date(a.operatedAt).getTime() - new Date(b.operatedAt).getTime()
  );

  const allSources = [
    ...new Set([
      ...masterComplaint.sources,
      ...complaintsToMerge.flatMap((c) => c.sources),
    ]),
  ];

  const mergedRecords: MergeRecord[] = complaintsToMerge.map((c) => ({
    id: generateId(),
    mergedComplaintId: c.id,
    mergedComplaintName: c.name,
    mergedAt: nowFormatted,
    mergedBy,
    mergeReason,
  }));

  const updatedMaster: Complaint = {
    ...masterComplaint,
    mergeStatus: 'master',
    handleRecords: allHandleRecords,
    escalationRecords: allEscalationRecords,
    assignmentRecords: allAssignmentRecords,
    visitBackRecords: allVisitBackRecords,
    sources: allSources,
    mergedRecords: [...masterComplaint.mergedRecords, ...mergedRecords],
    updatedAt: now,
  };

  updatedComplaints.push(updatedMaster);

  for (const c of complaintsToMerge) {
    const merged: Complaint = {
      ...c,
      mergeStatus: 'merged',
      masterComplaintId: masterComplaint.id,
      masterComplaintName: masterComplaint.name,
      updatedAt: now,
    };
    updatedComplaints.push(merged);
  }

  return updatedComplaints;
}

export function getActiveComplaints(complaints: Complaint[]): Complaint[] {
  return complaints.filter(
    (c) => c.mergeStatus === 'active' || c.mergeStatus === 'master'
  );
}

export function getMergedComplaints(complaints: Complaint[]): Complaint[] {
  return complaints.filter((c) => c.mergeStatus === 'merged');
}

export function getMasterComplaint(
  complaints: Complaint[],
  mergedComplaintId: string
): Complaint | undefined {
  const merged = complaints.find((c) => c.id === mergedComplaintId);
  if (!merged || !merged.masterComplaintId) return undefined;
  return complaints.find((c) => c.id === merged.masterComplaintId);
}

export function getMergedComplaintsForMaster(
  complaints: Complaint[],
  masterId: string
): Complaint[] {
  return complaints.filter((c) => c.masterComplaintId === masterId);
}

export function hasDuplicateRisk(
  complaintData: { phone: string; content: string; type: string },
  existingComplaints: Complaint[],
  threshold: number = 0.5
): boolean {
  const activeComplaints = getActiveComplaints(existingComplaints);
  const similar = findSimilarComplaints(
    {
      name: '',
      phone: complaintData.phone,
      type: complaintData.type,
      content: complaintData.content,
      source: '',
      receiveTime: '',
    },
    activeComplaints,
    threshold
  );
  return similar.length > 0;
}

export function getDuplicateRiskInfo(
  complaintData: { phone: string; content: string; type: string },
  existingComplaints: Complaint[],
  threshold: number = 0.5
): { hasRisk: boolean; similarCount: number; topSimilarity: number } {
  const activeComplaints = getActiveComplaints(existingComplaints);
  const similar = findSimilarComplaints(
    {
      name: '',
      phone: complaintData.phone,
      type: complaintData.type,
      content: complaintData.content,
      source: '',
      receiveTime: '',
    },
    activeComplaints,
    threshold
  );

  return {
    hasRisk: similar.length > 0,
    similarCount: similar.length,
    topSimilarity: similar.length > 0 ? similar[0].similarity : 0,
  };
}
