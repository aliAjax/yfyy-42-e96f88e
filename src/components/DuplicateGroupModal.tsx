import { useState } from 'react';
import { X, Copy, Users, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import type { Complaint } from '@/types/complaint';
import StatusBadge from './StatusBadge';
import { findSimilarComplaints } from '@/utils/similarity';
import type { UserRole } from '@/utils/permissions';
import { hasPermission } from '@/utils/permissions';

interface DuplicateGroupModalProps {
  targetComplaint: Complaint | null;
  allComplaints: Complaint[];
  onClose: () => void;
  onViewDetail: (complaint: Complaint) => void;
  onMerge: (masterId: string, mergedIds: string[], reason?: string) => void;
  currentRole: UserRole;
}

export default function DuplicateGroupModal({
  targetComplaint,
  allComplaints,
  onClose,
  onViewDetail,
  onMerge,
  currentRole,
}: DuplicateGroupModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mergeReason, setMergeReason] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const canMerge = hasPermission(currentRole, 'merge_complaint');

  if (!targetComplaint) return null;

  const similarComplaints = findSimilarComplaints(
    {
      name: targetComplaint.name,
      phone: targetComplaint.phone,
      type: targetComplaint.type,
      content: targetComplaint.content,
      source: targetComplaint.source,
      receiveTime: targetComplaint.receiveTime,
    },
    allComplaints.filter(
      (c) =>
        c.id !== targetComplaint.id &&
        c.mergeStatus === 'active'
    ),
    0.3
  );

  const allGroupComplaints = [
    { complaint: targetComplaint, similarity: 100, matchReasons: ['主诉求'] },
    ...similarComplaints,
  ];

  const handleSelect = (id: string, selected: boolean) => {
    if (id === targetComplaint.id) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === similarComplaints.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(similarComplaints.map((s) => s.complaint.id)));
    }
  };

  const handleMergeConfirm = () => {
    if (selectedIds.size === 0) return;
    onMerge(targetComplaint.id, Array.from(selectedIds), mergeReason || undefined);
    setShowConfirm(false);
    setSelectedIds(new Set());
    setMergeReason('');
    onClose();
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 70) return 'text-red-600 bg-red-50';
    if (similarity >= 50) return 'text-orange-600 bg-orange-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const truncateContent = (content: string, maxLength: number = 80) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden transition-all duration-200">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Copy className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">疑似重复诉求</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  检测到 {similarComplaints.length} 条可能重复的记录
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-200px)]">
          <div className="p-6 space-y-3">
            {similarComplaints.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">未发现疑似重复的诉求</p>
              </div>
            ) : (
              <>
                {canMerge && (
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === similarComplaints.length && similarComplaints.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">全选</span>
                    </label>
                    <span className="text-xs text-slate-500">
                      已选 {selectedIds.size} 条
                    </span>
                  </div>
                )}

                {allGroupComplaints.map((item) => {
                  const isTarget = item.complaint.id === targetComplaint.id;
                  const isSelected = selectedIds.has(item.complaint.id);
                  const isMerged = item.complaint.mergeStatus === 'merged';

                  return (
                    <div
                      key={item.complaint.id}
                      className={`rounded-xl p-4 border transition-colors ${
                        isTarget
                          ? 'bg-blue-50 border-blue-200'
                          : isSelected
                          ? 'bg-green-50 border-green-300'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {canMerge && !isTarget && !isMerged && (
                          <div className="pt-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) =>
                                handleSelect(item.complaint.id, e.target.checked)
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                            />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {isTarget && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-600 text-white">
                                主诉求
                              </span>
                            )}
                            {isMerged && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-200 text-slate-600">
                                已合并
                              </span>
                            )}
                            {!isTarget && !isMerged && (
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-md ${getSimilarityColor(
                                  item.similarity
                                )}`}
                              >
                                {item.similarity}% 相似
                              </span>
                            )}
                            <StatusBadge status={item.complaint.status} />
                          </div>

                          <div className="space-y-1.5 text-sm">
                            <div className="flex items-center gap-4">
                              <span className="text-slate-900 font-medium">
                                {item.complaint.name}
                              </span>
                              <span className="text-slate-500">
                                {item.complaint.phone}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-blue-600 font-medium text-xs bg-blue-50 px-2 py-0.5 rounded">
                                {item.complaint.type}
                              </span>
                              <span className="text-slate-400 text-xs">·</span>
                              <span className="text-slate-500 text-xs">
                                {item.complaint.source}
                              </span>
                              <span className="text-slate-400 text-xs">·</span>
                              <span className="text-slate-500 text-xs">
                                {item.complaint.receiveTime}
                              </span>
                            </div>
                            <p className="text-slate-700 text-sm leading-relaxed">
                              {truncateContent(item.complaint.content)}
                            </p>
                            {!isTarget && item.matchReasons.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {item.matchReasons.map((reason, idx) => (
                                  <span
                                    key={idx}
                                    className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded"
                                  >
                                    {reason}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            onViewDetail(item.complaint);
                            onClose();
                          }}
                          className="flex-shrink-0 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4">
          {canMerge && similarComplaints.length > 0 ? (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                disabled={selectedIds.size === 0}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  selectedIds.size > 0
                    ? 'text-white bg-blue-600 hover:bg-blue-700'
                    : 'text-slate-400 bg-slate-200 cursor-not-allowed'
                }`}
              >
                <Copy className="w-4 h-4" />
                合并选中的 {selectedIds.size} 条
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              关闭
            </button>
          )}
        </div>

        {showConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowConfirm(false)}
            ></div>

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  确认合并
                </h3>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-700">
                    将选中的 <strong>{selectedIds.size}</strong> 条诉求合并到当前主诉求中。
                    合并后：
                  </p>
                  <ul className="text-xs text-amber-600 mt-2 space-y-1 list-disc list-inside">
                    <li>保留所有处理记录、升级历史和来源信息</li>
                    <li>被合并的记录将标记为"已合并"状态</li>
                    <li>统计数据将不再重复计数</li>
                    <li>此操作不可撤销</li>
                  </ul>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    合并原因（可选）
                  </label>
                  <textarea
                    value={mergeReason}
                    onChange={(e) => setMergeReason(e.target.value)}
                    placeholder="请输入合并原因..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleMergeConfirm}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    确认合并
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
