import type { ReplyTemplate, ReplyTemplateFormData } from '@/types/replyTemplate';

const STORAGE_KEY = 'reply_templates';

const defaultTemplates: ReplyTemplate[] = [
  {
    id: 'tpl-1',
    title: '已受理并转交相关部门',
    type: '投诉',
    content: '您好，您反映的问题我们已经受理，已转交给相关部门处理，我们会尽快给您回复，请您耐心等待。',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'tpl-2',
    title: '问题已处理完成',
    type: '投诉',
    content: '您好，您反映的问题已经处理完毕，感谢您的监督和反馈，如有其他问题欢迎随时联系我们。',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'tpl-3',
    title: '建议已收悉，正在研究',
    type: '建议',
    content: '您好，感谢您的宝贵建议，我们已经收悉并正在研究可行性，后续如有进展会及时向您反馈。',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'tpl-4',
    title: '建议已采纳并落实',
    type: '建议',
    content: '您好，您提出的建议非常有价值，我们已经采纳并落实到工作中，感谢您对我们工作的支持！',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'tpl-5',
    title: '咨询问题解答',
    type: '咨询',
    content: '您好，关于您咨询的问题，答复如下：请携带本人身份证和相关证明材料到社区服务中心办理，工作时间为周一至周五 9:00-17:00。',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'tpl-6',
    title: '已安排工作人员处理',
    type: '求助',
    content: '您好，您的求助我们已经收到，已安排工作人员与您联系，请保持电话畅通，我们会尽快为您解决问题。',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'tpl-7',
    title: '求助已解决',
    type: '求助',
    content: '您好，您反映的问题已经得到解决，如后续还有其他需要帮助的地方，请随时与我们联系。',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'tpl-8',
    title: '已收悉，正在处理中',
    type: '其他',
    content: '您好，您的诉求我们已经收悉，正在处理中，请您耐心等待，我们会尽快给您回复。',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
];

function generateId(): string {
  return `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function getTemplates(): ReplyTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load templates from localStorage:', e);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultTemplates));
  return defaultTemplates;
}

export function saveTemplates(templates: ReplyTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error('Failed to save templates to localStorage:', e);
  }
}

export function addTemplate(data: ReplyTemplateFormData): ReplyTemplate {
  const templates = getTemplates();
  const now = new Date().toISOString();
  const newTemplate: ReplyTemplate = {
    id: generateId(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  templates.push(newTemplate);
  saveTemplates(templates);
  return newTemplate;
}

export function updateTemplate(id: string, data: ReplyTemplateFormData): ReplyTemplate | null {
  const templates = getTemplates();
  const index = templates.findIndex((t) => t.id === id);
  if (index === -1) return null;
  const updated: ReplyTemplate = {
    ...templates[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  templates[index] = updated;
  saveTemplates(templates);
  return updated;
}

export function deleteTemplate(id: string): boolean {
  const templates = getTemplates();
  const filtered = templates.filter((t) => t.id !== id);
  if (filtered.length === templates.length) return false;
  saveTemplates(filtered);
  return true;
}

export function getTemplatesByType(type: string): ReplyTemplate[] {
  const templates = getTemplates();
  return templates.filter((t) => t.type === type);
}

export function getTemplateTypes(): string[] {
  const templates = getTemplates();
  return Array.from(new Set(templates.map((t) => t.type)));
}
