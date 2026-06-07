import type { HandlerUser } from '@/types/complaint';
import { generateId } from './helpers';

const STORAGE_KEY = 'handler_users';
const CURRENT_HANDLER_KEY = 'current_handler_id';

export const mockHandlers: HandlerUser[] = [
  {
    id: 'h1',
    name: '李处理',
    phone: '13800000001',
    department: '社区服务科',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'h2',
    name: '王干事',
    phone: '13800000002',
    department: '物业管理科',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'h3',
    name: '张专员',
    phone: '13800000003',
    department: '民政事务科',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export function getHandlers(): HandlerUser[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mockHandlers));
  return mockHandlers;
}

export function saveHandlers(handlers: HandlerUser[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(handlers));
}

export function addHandler(data: Omit<HandlerUser, 'id' | 'createdAt'>): HandlerUser {
  const handlers = getHandlers();
  const newHandler: HandlerUser = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  const updated = [...handlers, newHandler];
  saveHandlers(updated);
  return newHandler;
}

export function updateHandler(id: string, data: Partial<Omit<HandlerUser, 'id' | 'createdAt'>>): HandlerUser | null {
  const handlers = getHandlers();
  const index = handlers.findIndex((h) => h.id === id);
  if (index === -1) return null;
  const updated = [...handlers];
  updated[index] = { ...updated[index], ...data };
  saveHandlers(updated);
  return updated[index];
}

export function deleteHandler(id: string): boolean {
  const handlers = getHandlers();
  const filtered = handlers.filter((h) => h.id !== id);
  if (filtered.length === handlers.length) return false;
  saveHandlers(filtered);
  const currentId = getCurrentHandlerId();
  if (currentId === id) {
    const firstHandler = filtered[0];
    setCurrentHandlerId(firstHandler?.id || '');
  }
  return true;
}

export function getHandlerById(id: string): HandlerUser | undefined {
  const handlers = getHandlers();
  return handlers.find((h) => h.id === id);
}

export function getCurrentHandlerId(): string {
  try {
    return localStorage.getItem(CURRENT_HANDLER_KEY) || '';
  } catch {
    return '';
  }
}

export function setCurrentHandlerId(id: string): void {
  localStorage.setItem(CURRENT_HANDLER_KEY, id);
}

export function getCurrentHandler(): HandlerUser | null {
  const id = getCurrentHandlerId();
  if (!id) {
    const handlers = getHandlers();
    if (handlers.length > 0) {
      setCurrentHandlerId(handlers[0].id);
      return handlers[0];
    }
    return null;
  }
  return getHandlerById(id) || null;
}
