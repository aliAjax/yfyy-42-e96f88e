import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Edit2, Trash2, Save, FileText } from 'lucide-react';
import { getTemplates, addTemplate, updateTemplate, deleteTemplate } from '@/utils/replyTemplate';
import type { ReplyTemplate, ReplyTemplateFormData } from '@/types/replyTemplate';
import { COMPLAINT_TYPES } from '@/types/complaint';
import { logOperation } from '@/utils/operationLog';

interface ReplyTemplateManageModalProps {
  onClose: () => void;
}

export default function ReplyTemplateManageModal({ onClose }: ReplyTemplateManageModalProps) {
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<ReplyTemplate | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<ReplyTemplateFormData>({
    title: '',
    type: COMPLAINT_TYPES[0],
    content: '',
  });
  const [activeType, setActiveType] = useState<string>('all');

  useEffect(() => {
    setTemplates(getTemplates());
  }, []);

  const groupedTemplates = useMemo(() => {
    const groups: Record<string, ReplyTemplate[]> = {};
    const filtered = activeType === 'all' ? templates : templates.filter((t) => t.type === activeType);
    filtered.forEach((t) => {
      if (!groups[t.type]) groups[t.type] = [];
      groups[t.type].push(t);
    });
    return groups;
  }, [templates, activeType]);

  const handleAdd = () => {
    setIsAdding(true);
    setEditingTemplate(null);
    setFormData({
      title: '',
      type: activeType === 'all' ? COMPLAINT_TYPES[0] : activeType,
      content: '',
    });
  };

  const handleEdit = (template: ReplyTemplate) => {
    setEditingTemplate(template);
    setIsAdding(false);
    setFormData({
      title: template.title,
      type: template.type,
      content: template.content,
    });
  };

  const handleDelete = (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (!confirm('确定要删除这个模板吗？')) return;
    deleteTemplate(id);
    setTemplates(getTemplates());
    if (template) {
      logOperation({
        operationType: 'manage_template',
        targetType: 'template',
        targetId: id,
        targetName: template.title,
        summary: `删除模板：${template.title}`,
        details: { type: template.type },
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    if (isAdding) {
      const newTemplate = addTemplate(formData);
      logOperation({
        operationType: 'manage_template',
        targetType: 'template',
        targetId: newTemplate.id,
        targetName: formData.title,
        summary: `新增模板：${formData.title}`,
        details: { type: formData.type },
      });
    } else if (editingTemplate) {
      updateTemplate(editingTemplate.id, formData);
      logOperation({
        operationType: 'manage_template',
        targetType: 'template',
        targetId: editingTemplate.id,
        targetName: formData.title,
        summary: `更新模板：${formData.title}`,
        details: { type: formData.type },
      });
    }
    setTemplates(getTemplates());
    setIsAdding(false);
    setEditingTemplate(null);
    setFormData({ title: '', type: COMPLAINT_TYPES[0], content: '' });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingTemplate(null);
    setFormData({ title: '', type: COMPLAINT_TYPES[0], content: '' });
  };

  const showForm = isAdding || editingTemplate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">回复模板管理</h3>
              <p className="text-sm text-slate-500">管理常用回复模板，提高处理效率</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          <div className="w-40 border-r border-slate-200 bg-slate-50 flex-shrink-0 py-3 overflow-y-auto">
            <button
              onClick={() => setActiveType('all')}
              className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                activeType === 'all'
                  ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              全部
              <span className="text-xs text-slate-400 ml-2">{templates.length}</span>
            </button>
            {COMPLAINT_TYPES.map((type) => {
              const count = templates.filter((t) => t.type === type).length;
              return (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                    activeType === type
                      ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {type}
                  <span className="text-xs text-slate-400 ml-2">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {showForm ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  {isAdding ? <Plus className="w-4 h-4 text-blue-600" /> : <Edit2 className="w-4 h-4 text-blue-600" />}
                  {isAdding ? '新增模板' : '编辑模板'}
                </h4>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">模板标题</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="请输入模板标题"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">诉求类型</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    {COMPLAINT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">模板内容</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                    placeholder="请输入模板内容"
                    rows={6}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.title.trim() || !formData.content.trim()}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    保存
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-slate-700">模板列表</h4>
                  <button
                    onClick={handleAdd}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    新增模板
                  </button>
                </div>

                {Object.keys(groupedTemplates).length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">暂无模板，点击"新增模板"添加</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedTemplates).map(([type, list]) => (
                      <div key={type}>
                        <h5 className="text-xs font-medium text-slate-500 mb-2 px-1">{type}</h5>
                        <div className="space-y-2">
                          {list.map((template) => (
                            <div
                              key={template.id}
                              className="bg-white border border-slate-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h6 className="text-sm font-medium text-slate-800 truncate">
                                    {template.title}
                                  </h6>
                                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                    {template.content}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => handleEdit(template)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                    title="编辑"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(template.id)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="删除"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
