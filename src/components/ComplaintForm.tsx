import { useState } from 'react';
import { Plus, Lock, AlertCircle } from 'lucide-react';
import { COMPLAINT_TYPES, SOURCE_CHANNELS } from '@/types/complaint';
import type { Complaint, ComplaintFormData } from '@/types/complaint';
import { getCurrentDateTime, formatDateInput } from '@/utils/helpers';
import { findSimilarComplaints } from '@/utils/similarity';
import type { SimilarComplaint } from '@/utils/similarity';
import DuplicateCheckModal from './DuplicateCheckModal';
import type { UserRole } from '@/utils/permissions';
import { hasPermission, getDisabledReason } from '@/utils/permissions';

interface ComplaintFormProps {
  onSubmit: (data: ComplaintFormData) => void;
  existingComplaints: Complaint[];
  onViewDetail: (complaint: Complaint) => void;
  currentRole: UserRole;
}

export default function ComplaintForm({ onSubmit, existingComplaints, onViewDetail, currentRole }: ComplaintFormProps) {
  const canCreate = hasPermission(currentRole, 'create_complaint');
  const disabledReason = getDisabledReason(currentRole, 'create_complaint');

  const [formData, setFormData] = useState<ComplaintFormData>({
    name: '',
    phone: '',
    type: COMPLAINT_TYPES[0],
    content: '',
    source: SOURCE_CHANNELS[0],
    receiveTime: getCurrentDateTime(),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [similarComplaints, setSimilarComplaints] = useState<SimilarComplaint[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<ComplaintFormData | null>(null);

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
    if (!canCreate) return;
    if (!validate()) return;

    const similar = findSimilarComplaints(formData, existingComplaints);
    if (similar.length > 0) {
      setSimilarComplaints(similar);
      setPendingFormData(formData);
      setShowDuplicateModal(true);
    } else {
      doSubmit(formData);
    }
  };

  const doSubmit = (data: ComplaintFormData) => {
    onSubmit(data);
    setFormData({
      name: '',
      phone: '',
      type: COMPLAINT_TYPES[0],
      content: '',
      source: SOURCE_CHANNELS[0],
      receiveTime: getCurrentDateTime(),
    });
    setErrors({});
  };

  const handleContinueSubmit = () => {
    if (pendingFormData) {
      doSubmit(pendingFormData);
    }
    setShowDuplicateModal(false);
    setPendingFormData(null);
    setSimilarComplaints([]);
  };

  const handleViewDetail = (complaint: Complaint) => {
    setShowDuplicateModal(false);
    onViewDetail(complaint);
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              诉求登记
            </h2>
            <p className="text-xs text-slate-500 mt-1">快速录入群众诉求信息</p>
          </div>
          {!canCreate && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-md ring-1 ring-amber-200">
              <Lock className="w-3 h-3" />
              无权限
            </span>
          )}
        </div>
      </div>

      {!canCreate && (
        <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800">
              <p className="font-medium">功能已禁用</p>
              <p className="mt-0.5 opacity-80">{disabledReason}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`p-6 space-y-4 ${!canCreate ? 'opacity-60' : ''}`}>
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
              disabled={!canCreate}
              className={`${inputBaseClass} ${errors.name ? errorClass : 'border-slate-300'} ${!canCreate ? 'cursor-not-allowed bg-slate-50 text-slate-400' : ''}`}
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
              disabled={!canCreate}
              className={`${inputBaseClass} ${errors.phone ? errorClass : 'border-slate-300'} ${!canCreate ? 'cursor-not-allowed bg-slate-50 text-slate-400' : ''}`}
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
              disabled={!canCreate}
              className={`${inputBaseClass} border-slate-300 bg-white ${!canCreate ? 'cursor-not-allowed bg-slate-50 text-slate-400' : ''}`}
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
              disabled={!canCreate}
              className={`${inputBaseClass} border-slate-300 bg-white ${!canCreate ? 'cursor-not-allowed bg-slate-50 text-slate-400' : ''}`}
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
            disabled={!canCreate}
            className={`${inputBaseClass} resize-none ${errors.content ? errorClass : 'border-slate-300'} ${!canCreate ? 'cursor-not-allowed bg-slate-50 text-slate-400' : ''}`}
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
            disabled={!canCreate}
            className={`${inputBaseClass} ${errors.receiveTime ? errorClass : 'border-slate-300'} ${!canCreate ? 'cursor-not-allowed bg-slate-50 text-slate-400' : ''}`}
          />
          {errors.receiveTime && <p className="text-xs text-red-500 mt-1">{errors.receiveTime}</p>}
        </div>

        <button
          type="submit"
          disabled={!canCreate}
          className={`w-full py-2.5 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
            canCreate
              ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98]'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Plus className="w-4 h-4" />
          提交登记
        </button>
      </form>

      {showDuplicateModal && (
        <DuplicateCheckModal
          similarComplaints={similarComplaints}
          onContinue={handleContinueSubmit}
          onViewDetail={handleViewDetail}
          onClose={() => {
            setShowDuplicateModal(false);
            setPendingFormData(null);
            setSimilarComplaints([]);
          }}
        />
      )}
    </div>
  );
}
