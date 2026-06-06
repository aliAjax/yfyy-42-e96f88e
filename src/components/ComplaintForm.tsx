import { useState } from 'react';
import { Plus } from 'lucide-react';
import { COMPLAINT_TYPES, SOURCE_CHANNELS } from '@/types/complaint';
import type { ComplaintFormData } from '@/types/complaint';
import { getCurrentDateTime, formatDateInput } from '@/utils/helpers';

interface ComplaintFormProps {
  onSubmit: (data: ComplaintFormData) => void;
}

export default function ComplaintForm({ onSubmit }: ComplaintFormProps) {
  const [formData, setFormData] = useState<ComplaintFormData>({
    name: '',
    phone: '',
    type: COMPLAINT_TYPES[0],
    content: '',
    source: SOURCE_CHANNELS[0],
    receiveTime: getCurrentDateTime(),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '请输入姓名';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = '请输入联系方式';
    } else if (!/^1[3-9]\d{9}$/.test(formData.phone) && !/^\d{7,8}$/.test(formData.phone)) {
      newErrors.phone = '请输入正确的手机号或电话';
    }
    if (!formData.content.trim()) {
      newErrors.content = '请输入具体内容';
    }
    if (!formData.receiveTime.trim()) {
      newErrors.receiveTime = '请选择受理时间';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
      setFormData({
        name: '',
        phone: '',
        type: COMPLAINT_TYPES[0],
        content: '',
        source: SOURCE_CHANNELS[0],
        receiveTime: getCurrentDateTime(),
      });
      setErrors({});
    }
  };

  const handleChange = (field: keyof ComplaintFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const inputBaseClass =
    'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors';
  const errorClass = 'border-red-400 focus:ring-red-500 focus:border-red-500';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-600" />
          诉求登记
        </h2>
        <p className="text-xs text-slate-500 mt-1">快速录入群众诉求信息</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="请输入姓名"
              className={`${inputBaseClass} ${errors.name ? errorClass : 'border-slate-300'}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              联系方式 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="请输入手机号"
              className={`${inputBaseClass} ${errors.phone ? errorClass : 'border-slate-300'}`}
            />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">诉求类型</label>
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              className={`${inputBaseClass} border-slate-300 bg-white`}
            >
              {COMPLAINT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">来源渠道</label>
            <select
              value={formData.source}
              onChange={(e) => handleChange('source', e.target.value)}
              className={`${inputBaseClass} border-slate-300 bg-white`}
            >
              {SOURCE_CHANNELS.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            具体内容 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => handleChange('content', e.target.value)}
            placeholder="请详细描述诉求内容..."
            rows={4}
            className={`${inputBaseClass} resize-none ${errors.content ? errorClass : 'border-slate-300'}`}
          />
          {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            受理时间 <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={formatDateInput(new Date(formData.receiveTime.replace(' ', 'T')))}
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                const formatted = val.replace('T', ' ');
                handleChange('receiveTime', formatted);
              }
            }}
            className={`${inputBaseClass} ${errors.receiveTime ? errorClass : 'border-slate-300'}`}
          />
          {errors.receiveTime && <p className="text-xs text-red-500 mt-1">{errors.receiveTime}</p>}
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          提交登记
        </button>
      </form>
    </div>
  );
}
