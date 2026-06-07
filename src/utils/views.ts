import type { SavedView, ViewFilter, Complaint } from '@/types/complaint';
import { DEFAULT_FILTER } from '@/types/complaint';
import { generateId } from './helpers';
import type { UserRole } from './permissions';
import { calculateOverdueInfo } from './overdue';

const VIEWS_STORAGE_KEY = 'complaint_saved_views';
const ACTIVE_VIEW_STORAGE_KEY = 'complaint_active_view';

function normalizeFilter(filter: Partial<ViewFilter>): ViewFilter {
  return {
    types: filter.types || [],
    sources: filter.sources || [],
    statuses: filter.statuses || [],
    visitBackStatuses: filter.visitBackStatuses || [],
    escalated: filter.escalated !== undefined ? filter.escalated : null,
    overdue: filter.overdue !== undefined ? filter.overdue : null,
    overdueLevel: filter.overdueLevel !== undefined ? filter.overdueLevel : null,
    escalationMin: filter.escalationMin !== undefined ? filter.escalationMin : null,
    escalationMax: filter.escalationMax !== undefined ? filter.escalationMax : null,
    responseTimeMinHours: filter.responseTimeMinHours !== undefined ? filter.responseTimeMinHours : null,
    responseTimeMaxHours: filter.responseTimeMaxHours !== undefined ? filter.responseTimeMaxHours : null,
    statusFlowFrom: filter.statusFlowFrom !== undefined ? filter.statusFlowFrom : null,
    statusFlowTo: filter.statusFlowTo !== undefined ? filter.statusFlowTo : null,
    receiveTimeStart: filter.receiveTimeStart !== undefined ? filter.receiveTimeStart : null,
    receiveTimeEnd: filter.receiveTimeEnd !== undefined ? filter.receiveTimeEnd : null,
    keyword: filter.keyword || '',
  };
}

export function getSavedViews(role: UserRole): SavedView[] {
  const defaults = getDefaultViews(role);
  const stored = localStorage.getItem(VIEWS_STORAGE_KEY);
  if (!stored) return defaults;
  try {
    const allViews: SavedView[] = JSON.parse(stored);
    const roleViews = allViews
      .filter((v) => v.role === role)
      .map((v) => ({ ...v, filter: normalizeFilter(v.filter) }));
    return [...defaults, ...roleViews];
  } catch {
    return defaults;
  }
}

export function getAllSavedViews(): SavedView[] {
  const stored = localStorage.getItem(VIEWS_STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveView(name: string, filter: ViewFilter, role: UserRole): SavedView {
  const allViews = getAllSavedViews();
  const newView: SavedView = {
    id: generateId(),
    name,
    filter: JSON.parse(JSON.stringify(filter)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    role,
  };
  allViews.push(newView);
  localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(allViews));
  return newView;
}

export function updateView(id: string, name: string, filter: ViewFilter, role: UserRole): SavedView | null {
  const allViews = getAllSavedViews();
  const index = allViews.findIndex((v) => v.id === id && v.role === role);
  if (index === -1) return null;
  allViews[index] = {
    ...allViews[index],
    name,
    filter: JSON.parse(JSON.stringify(filter)),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(allViews));
  return allViews[index];
}

export function deleteView(id: string, role: UserRole): boolean {
  const allViews = getAllSavedViews();
  const filtered = allViews.filter((v) => !(v.id === id && v.role === role));
  if (filtered.length === allViews.length) return false;
  localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

export function getActiveViewId(role: UserRole): string | null {
  const key = `${ACTIVE_VIEW_STORAGE_KEY}_${role}`;
  return localStorage.getItem(key);
}

export function setActiveViewId(role: UserRole, viewId: string | null): void {
  const key = `${ACTIVE_VIEW_STORAGE_KEY}_${role}`;
  if (viewId) {
    localStorage.setItem(key, viewId);
  } else {
    localStorage.removeItem(key);
  }
}

export function getActiveView(role: UserRole): SavedView | null {
  const views = getSavedViews(role);
  const activeId = getActiveViewId(role);
  if (activeId) {
    const view = views.find((v) => v.id === activeId);
    if (view) return view;
  }
  return null;
}

function getDefaultViews(role: UserRole): SavedView[] {
  const now = new Date().toISOString();
  const defaults: SavedView[] = [
    {
      id: 'default_all',
      name: '全部诉求',
      filter: { ...DEFAULT_FILTER },
      createdAt: now,
      updatedAt: now,
      role,
    },
    {
      id: 'default_pending',
      name: '待处理',
      filter: { ...DEFAULT_FILTER, statuses: ['pending'] },
      createdAt: now,
      updatedAt: now,
      role,
    },
    {
      id: 'default_processing',
      name: '处理中',
      filter: { ...DEFAULT_FILTER, statuses: ['processing'] },
      createdAt: now,
      updatedAt: now,
      role,
    },
    {
      id: 'default_replied',
      name: '已回复',
      filter: { ...DEFAULT_FILTER, statuses: ['replied'] },
      createdAt: now,
      updatedAt: now,
      role,
    },
    {
      id: 'default_pending_visitback',
      name: '待回访',
      filter: { ...DEFAULT_FILTER, statuses: ['replied'], visitBackStatuses: ['pending'] },
      createdAt: now,
      updatedAt: now,
      role,
    },
    {
      id: 'default_visited',
      name: '已回访',
      filter: { ...DEFAULT_FILTER, statuses: ['replied'], visitBackStatuses: ['completed'] },
      createdAt: now,
      updatedAt: now,
      role,
    },
    {
      id: 'default_unsatisfied',
      name: '未满意',
      filter: { ...DEFAULT_FILTER, visitBackStatuses: ['unsatisfied'] },
      createdAt: now,
      updatedAt: now,
      role,
    },
    {
      id: 'default_overdue',
      name: '已超期',
      filter: { ...DEFAULT_FILTER, overdue: true },
      createdAt: now,
      updatedAt: now,
      role,
    },
    {
      id: 'default_escalated',
      name: '已升级',
      filter: { ...DEFAULT_FILTER, escalated: true },
      createdAt: now,
      updatedAt: now,
      role,
    },
  ];
  return defaults;
}

export function isDefaultView(viewId: string): boolean {
  return viewId.startsWith('default_');
}

export function applyFilter(
  complaints: Complaint[],
  filter: ViewFilter,
  now?: Date
): Complaint[] {
  return complaints.filter((c) => {
    if (filter.types.length > 0 && !filter.types.includes(c.type)) return false;
    if (filter.sources.length > 0 && !filter.sources.includes(c.source)) return false;
    if (filter.statuses.length > 0 && !filter.statuses.includes(c.status)) return false;
    if (filter.visitBackStatuses.length > 0) {
      const hasOnlyUnsatisfied =
        filter.visitBackStatuses.length === 1 && filter.visitBackStatuses[0] === 'unsatisfied';
      if (hasOnlyUnsatisfied) {
        if (c.visitBackStatus !== 'unsatisfied') return false;
      } else {
        if (c.status !== 'replied') return false;
        if (!filter.visitBackStatuses.includes(c.visitBackStatus)) return false;
      }
    }
    if (filter.escalated !== null) {
      const hasEscalation = c.escalationRecords && c.escalationRecords.length > 0;
      if (filter.escalated && !hasEscalation) return false;
      if (!filter.escalated && hasEscalation) return false;
    }
    if (filter.overdue !== null) {
      const overdueInfo = calculateOverdueInfo(c, now);
      if (filter.overdue && !overdueInfo.isOverdue) return false;
      if (!filter.overdue && overdueInfo.isOverdue) return false;
    }
    if (filter.overdueLevel !== null) {
      const overdueInfo = calculateOverdueInfo(c, now);
      if (overdueInfo.level !== filter.overdueLevel) return false;
    }
    if (filter.escalationMin !== null || filter.escalationMax !== null) {
      const escalationCount = c.escalationRecords?.length || 0;
      if (filter.escalationMin !== null && escalationCount < filter.escalationMin) return false;
      if (filter.escalationMax !== null && escalationCount > filter.escalationMax) return false;
    }
    if (filter.responseTimeMinHours !== null || filter.responseTimeMaxHours !== null) {
      if (c.status !== 'replied' || !c.receiveTime || !c.replyTime) return false;
      const receive = new Date(c.receiveTime).getTime();
      const reply = new Date(c.replyTime).getTime();
      const responseHours = (reply - receive) / (1000 * 60 * 60);
      if (filter.responseTimeMinHours !== null && responseHours < filter.responseTimeMinHours) return false;
      if (filter.responseTimeMaxHours !== null && responseHours >= filter.responseTimeMaxHours) return false;
    }
    if (filter.statusFlowFrom !== null || filter.statusFlowTo !== null) {
      const records = [...(c.handleRecords || [])].sort(
        (a, b) => new Date(a.operatedAt).getTime() - new Date(b.operatedAt).getTime()
      );
      const hasMatchingTransition = records.some((record, index) => {
        if (index === 0) return false;
        const previous = records[index - 1];
        const matchesFrom = filter.statusFlowFrom === null || previous.status === filter.statusFlowFrom;
        const matchesTo = filter.statusFlowTo === null || record.status === filter.statusFlowTo;
        return matchesFrom && matchesTo;
      });
      if (!hasMatchingTransition) return false;
    }
    if (filter.receiveTimeStart) {
      if (new Date(c.receiveTime) < new Date(filter.receiveTimeStart)) return false;
    }
    if (filter.receiveTimeEnd) {
      const endDate = new Date(filter.receiveTimeEnd);
      endDate.setHours(23, 59, 59, 999);
      if (new Date(c.receiveTime) > endDate) return false;
    }
    if (filter.keyword.trim()) {
      const q = filter.keyword.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchContent = c.content.toLowerCase().includes(q);
      const matchPhone = c.phone.includes(q);
      const matchAssignee = c.assigneeName?.toLowerCase().includes(q) ?? false;
      if (!matchName && !matchContent && !matchPhone && !matchAssignee) return false;
    }
    return true;
  });
}

export function isFilterEmpty(filter: ViewFilter): boolean {
  return (
    filter.types.length === 0 &&
    filter.sources.length === 0 &&
    filter.statuses.length === 0 &&
    filter.visitBackStatuses.length === 0 &&
    filter.escalated === null &&
    filter.overdue === null &&
    filter.overdueLevel === null &&
    filter.escalationMin === null &&
    filter.escalationMax === null &&
    filter.responseTimeMinHours === null &&
    filter.responseTimeMaxHours === null &&
    filter.statusFlowFrom === null &&
    filter.statusFlowTo === null &&
    filter.receiveTimeStart === null &&
    filter.receiveTimeEnd === null &&
    !filter.keyword.trim()
  );
}
