export interface ReplyTemplate {
  id: string;
  title: string;
  type: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export type ReplyTemplateFormData = Omit<ReplyTemplate, 'id' | 'createdAt' | 'updatedAt'>;
