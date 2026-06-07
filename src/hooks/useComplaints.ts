import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Complaint,
  ComplaintFormData,
  HandleFormData,
  AssignmentFormData,
  VisitBackFormData,
  BatchStatusData,
} from '@/types/complaint';
import { mockComplaints } from '@/data/mockData';
import { migrateComplaintData } from '@/utils/helpers';
import {
  createComplaint,
  createBatchComplaints,
  handleComplaint,
  escalateComplaint,
  assignComplaint,
  visitBackComplaint,
  updateComplaintById,
  batchHandleComplaints,
  batchEscalateComplaints,
  deleteComplaint,
  batchDeleteComplaints,
  type OperatorContext,
} from '@/utils/complaintMutations';

const STORAGE_KEY = 'complaint_records';

export interface UseComplaintsOptions {
  storageKey?: string;
}

export interface UseComplaintsReturn {
  complaints: Complaint[];
  selectedComplaint: Complaint | null;
  setSelectedComplaint: (complaint: Complaint | null) => void;
  complaintsLoaded: boolean;
  addComplaint: (data: ComplaintFormData) => Complaint;
  batchImport: (rows: ComplaintFormData[]) => Complaint[];
  handleComplaint: (id: string, data: HandleFormData, operator?: OperatorContext) => void;
  escalateComplaint: (id: string, reason: string, escalatedBy: string) => void;
  assignComplaint: (id: string, data: AssignmentFormData, assignor: OperatorContext) => void;
  visitBackComplaint: (id: string, data: VisitBackFormData, operator: OperatorContext) => void;
  deleteComplaint: (id: string) => void;
  batchHandle: (ids: string[], data: BatchStatusData, operator: OperatorContext) => number;
  batchEscalate: (ids: string[], reason: string, escalatedBy: string) => number;
  batchDelete: (ids: string[]) => void;
  replaceComplaints: (newComplaints: Complaint[]) => void;
  refreshFromStorage: () => void;
}

export function useComplaints(options: UseComplaintsOptions = {}): UseComplaintsReturn {
  const { storageKey = STORAGE_KEY } = options;
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [complaintsLoaded, setComplaintsLoaded] = useState(false);
  const storageKeyRef = useRef(storageKey);

  useEffect(() => {
    storageKeyRef.current = storageKey;
  }, [storageKey]);

  useEffect(() => {
    const stored = localStorage.getItem(storageKeyRef.current);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const migrated = migrateComplaintData(parsed);
        setComplaints(migrated);
      } catch {
        setComplaints(mockComplaints);
        localStorage.setItem(storageKeyRef.current, JSON.stringify(mockComplaints));
      }
    } else {
      setComplaints(mockComplaints);
      localStorage.setItem(storageKeyRef.current, JSON.stringify(mockComplaints));
    }
    setComplaintsLoaded(true);
  }, []);

  useEffect(() => {
    if (!complaintsLoaded) return;
    localStorage.setItem(storageKeyRef.current, JSON.stringify(complaints));
  }, [complaints, complaintsLoaded]);

  useEffect(() => {
    if (!selectedComplaint) return;
    const latest = complaints.find((c) => c.id === selectedComplaint.id);
    if (latest && latest !== selectedComplaint) {
      setSelectedComplaint(latest);
    }
  }, [complaints, selectedComplaint]);

  const addComplaint = useCallback((data: ComplaintFormData): Complaint => {
    const now = new Date().toISOString();
    const newComplaint = createComplaint(data, now);
    setComplaints((prev) => [newComplaint, ...prev]);
    return newComplaint;
  }, []);

  const batchImport = useCallback((rows: ComplaintFormData[]): Complaint[] => {
    const now = new Date().toISOString();
    const newComplaints = createBatchComplaints(rows, now);
    setComplaints((prev) => [...newComplaints, ...prev]);
    return newComplaints;
  }, []);

  const handleComplaintAction = useCallback((
    id: string,
    data: HandleFormData,
    operator?: OperatorContext
  ): void => {
    const now = new Date().toISOString();
    setComplaints((prev) =>
      updateComplaintById(prev, id, (c) => handleComplaint(c, data, now, operator))
    );
  }, []);

  const escalateComplaintAction = useCallback((
    id: string,
    reason: string,
    escalatedBy: string
  ): void => {
    const now = new Date().toISOString();
    setComplaints((prev) =>
      updateComplaintById(prev, id, (c) => escalateComplaint(c, reason, now, escalatedBy))
    );
  }, []);

  const assignComplaintAction = useCallback((
    id: string,
    data: AssignmentFormData,
    assignor: OperatorContext
  ): void => {
    const now = new Date().toISOString();
    setComplaints((prev) =>
      updateComplaintById(prev, id, (c) => assignComplaint(c, data, now, assignor))
    );
  }, []);

  const visitBackComplaintAction = useCallback((
    id: string,
    data: VisitBackFormData,
    operator: OperatorContext
  ): void => {
    const now = new Date().toISOString();
    setComplaints((prev) =>
      updateComplaintById(prev, id, (c) => visitBackComplaint(c, data, now, operator))
    );
  }, []);

  const deleteComplaintAction = useCallback((id: string): void => {
    setComplaints((prev) => deleteComplaint(prev, id));
    setSelectedComplaint((prev) => (prev?.id === id ? null : prev));
  }, []);

  const batchHandleAction = useCallback((
    ids: string[],
    data: BatchStatusData,
    operator: OperatorContext
  ): number => {
    const now = new Date().toISOString();
    const operableIds = ids.filter((id) =>
      complaints.some((c) => c.id === id)
    );
    setComplaints((prev) =>
      batchHandleComplaints(prev, ids, data, now, operator)
    );
    return operableIds.length;
  }, [complaints]);

  const batchEscalateAction = useCallback((
    ids: string[],
    reason: string,
    escalatedBy: string
  ): number => {
    const now = new Date().toISOString();
    const operableIds = ids.filter((id) =>
      complaints.some((c) => c.id === id)
    );
    setComplaints((prev) =>
      batchEscalateComplaints(prev, ids, reason, now, escalatedBy)
    );
    return operableIds.length;
  }, [complaints]);

  const batchDeleteAction = useCallback((ids: string[]): void => {
    const idSet = new Set(ids);
    setComplaints((prev) => batchDeleteComplaints(prev, ids));
    setSelectedComplaint((prev) => (prev && idSet.has(prev.id) ? null : prev));
  }, []);

  const replaceComplaints = useCallback((newComplaints: Complaint[]): void => {
    setComplaints(newComplaints);
  }, []);

  const refreshFromStorage = useCallback((): void => {
    const stored = localStorage.getItem(storageKeyRef.current);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const migrated = migrateComplaintData(parsed);
        setComplaints(migrated);
      } catch {
        // ignore
      }
    }
  }, []);

  return {
    complaints,
    selectedComplaint,
    setSelectedComplaint,
    complaintsLoaded,
    addComplaint,
    batchImport,
    handleComplaint: handleComplaintAction,
    escalateComplaint: escalateComplaintAction,
    assignComplaint: assignComplaintAction,
    visitBackComplaint: visitBackComplaintAction,
    deleteComplaint: deleteComplaintAction,
    batchHandle: batchHandleAction,
    batchEscalate: batchEscalateAction,
    batchDelete: batchDeleteAction,
    replaceComplaints,
    refreshFromStorage,
  };
}
