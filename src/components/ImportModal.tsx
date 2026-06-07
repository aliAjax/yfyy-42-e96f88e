import { useState, useMemo } from 'react';
import { X, Upload, AlertTriangle, CheckCircle, FileText, Copy } from 'lucide-react';
import { parseCSVText } from '@/utils/csvImport';
import type { ImportPreviewResult, ParsedImportRow, ComplaintFormData, Complaint } from '@/types/complaint';
import { getDuplicateRiskInfo } from '@/utils/merge';

interface ImportModalProps {
  onClose: () => void;
  onImport: (rows: ComplaintFormData[]) => void;
  existingComplaints?: Complaint[];
}

export default function ImportModal({ onClose, onImport, existingComplaints = [] }: ImportModalProps) {
  const [csvText, setCsvText] = useState('');
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [skipInvalid, setSkipInvalid] = useState(false);
  const [hasParsed, setHasParsed] = useState(false);
  const [checkDuplicates, setCheckDuplicates] = useState(true);

  const sampleCSV = `姓名,电话,诉求类型,来源渠道,受理时间,具体内容
张三,13812345678,投诉,来电,2024-01-15 09:30,小区垃圾桶清运不及时
李四,13987654321,建议,网上留言,2024-01-16 14:20,建议增加社区健身器材
王五,13111112222,咨询,微信公众号,2024-01-17 10:00,咨询社保办理流程`;

  const handleParse = () => {
    if (!csvText.trim()) return;
    const result = parseCSVText(csvText);

    if (checkDuplicates && existingComplaints.length > 0) {
      result.rows = result.rows.map((row) => {
        if (!row.isValid) return row;
        const riskInfo = getDuplicateRiskInfo(
          {
            phone: row.data.phone,
            content: row.data.content,
            type: row.data.type,
          },
          existingComplaints,
          0.5
        );
        return {
          ...row,
          duplicateRisk: riskInfo,
        };
      });
    }

    setPreviewResult(result);
    setHasParsed(true);
  };

  const validRows = useMemo(() => {
    if (!previewResult) return [];
    return previewResult.rows.filter((row) => row.isValid);
  }, [previewResult]);

  const duplicateRiskCount = useMemo(() => {
    if (!previewResult) return 0;
    return previewResult.rows.filter(
      (row) => row.isValid && row.duplicateRisk?.hasRisk
    ).length;
  }, [previewResult]);

  const handleConfirmImport = () => {
    if (!previewResult) return;
    const rowsToImport = skipInvalid
      ? validRows.map((row) => row.data)
      : previewResult.rows.filter((row) => row.isValid).map((row) => row.data);

    if (rowsToImport.length > 0) {
      onImport(rowsToImport);
    }
  };

  const canImport = useMemo(() => {
    if (!previewResult || previewResult.total === 0) return false;
    if (previewResult.invalidCount === 0) return true;
    return skipInvalid && validRows.length > 0;
  }, [previewResult, skipInvalid, validRows]);

  const fillSample = () => {
    setCsvText(sampleCSV);
    setHasParsed(false);
    setPreviewResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">批量导入诉求</h3>
              <p className="text-sm text-slate-500">粘贴CSV格式数据，预览后批量导入</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                CSV 数据
              </label>
              <button
                onClick={fillSample}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                填入示例数据
              </button>
            </div>
            <textarea
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setHasParsed(false);
                setPreviewResult(null);
              }}
              placeholder="请粘贴CSV格式数据，第一行为表头&#10;支持的字段：姓名、电话、诉求类型、来源渠道、受理时间、具体内容"
              className="w-full h-40 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <button
              onClick={handleParse}
              disabled={!csvText.trim()}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              解析预览
            </button>
          </div>

          {hasParsed && previewResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-slate-800">{previewResult.total}</div>
                  <div className="text-xs text-slate-500 mt-1">总记录数</div>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{previewResult.validCount}</div>
                  <div className="text-xs text-green-600 mt-1">合法记录</div>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{previewResult.invalidCount}</div>
                  <div className="text-xs text-red-600 mt-1">异常记录</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{duplicateRiskCount}</div>
                  <div className="text-xs text-amber-600 mt-1">疑似重复</div>
                </div>
              </div>

              {previewResult.invalidCount > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">
                      发现 {previewResult.invalidCount} 条数据存在问题
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      请检查标红的行，修正后重新导入，或选择跳过错误行
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={skipInvalid}
                      onChange={(e) => setSkipInvalid(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">跳过错误行</span>
                  </label>
                </div>
              )}

              {duplicateRiskCount > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl">
                  <Copy className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-800">
                      发现 {duplicateRiskCount} 条数据疑似与现有诉求重复
                    </p>
                    <p className="text-xs text-orange-600 mt-0.5">
                      请仔细核对，避免重复登记
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={checkDuplicates}
                      onChange={(e) => setCheckDuplicates(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">重复检测</span>
                  </label>
                </div>
              )}

              {previewResult.total > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2.5 text-left font-medium text-slate-600 w-12">行号</th>
                          <th className="px-3 py-2.5 text-left font-medium text-slate-600">姓名</th>
                          <th className="px-3 py-2.5 text-left font-medium text-slate-600">电话</th>
                          <th className="px-3 py-2.5 text-left font-medium text-slate-600">诉求类型</th>
                          <th className="px-3 py-2.5 text-left font-medium text-slate-600">来源渠道</th>
                          <th className="px-3 py-2.5 text-left font-medium text-slate-600">受理时间</th>
                          <th className="px-3 py-2.5 text-left font-medium text-slate-600">具体内容</th>
                          <th className="px-3 py-2.5 text-center font-medium text-slate-600 w-20">状态</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewResult.rows.map((row) => (
                          <TableRow key={row.index} row={row} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {previewResult.total === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">未解析到有效数据</p>
                </div>
              )}
            </div>
          )}

          {!hasParsed && (
            <div className="text-center py-8 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3" />
              <p className="text-sm">粘贴CSV数据后点击"解析预览"查看结果</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={!canImport}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {skipInvalid && previewResult?.invalidCount
              ? `导入 ${validRows.length} 条合法数据`
              : '确认导入'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TableRow({ row }: { row: ParsedImportRow }) {
  const baseClass = 'px-3 py-2';
  const errorClass = row.isValid ? '' : 'bg-red-50';
  const duplicateClass = row.isValid && row.duplicateRisk?.hasRisk ? 'bg-orange-50' : '';
  const rowClass = errorClass || duplicateClass;

  return (
    <tr className={`${rowClass} hover:bg-slate-50`}>
      <td className={`${baseClass} text-slate-500 font-mono text-xs`}>{row.index}</td>
      <td className={`${baseClass} ${!row.data.name ? 'text-red-500' : 'text-slate-700'}`}>
        {row.data.name || <span className="text-red-400">-</span>}
      </td>
      <td className={`${baseClass} ${row.errors.some((e) => e.field === 'phone') ? 'text-red-500' : 'text-slate-700'}`}>
        {row.data.phone || <span className="text-red-400">-</span>}
      </td>
      <td className={`${baseClass} text-slate-700`}>{row.data.type}</td>
      <td className={`${baseClass} text-slate-700`}>{row.data.source}</td>
      <td className={`${baseClass} ${!row.data.receiveTime ? 'text-red-500' : 'text-slate-700'}`}>
        {row.data.receiveTime || <span className="text-red-400">-</span>}
      </td>
      <td className={`${baseClass} max-w-[200px] truncate ${!row.data.content ? 'text-red-500' : 'text-slate-700'}`}>
        {row.data.content || <span className="text-red-400">-</span>}
      </td>
      <td className={`${baseClass} text-center`}>
        {!row.isValid ? (
          <div
            className="inline-flex items-center gap-1 text-red-500 cursor-help"
            title={row.errors.map((e) => e.message).join('；')}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
        ) : row.duplicateRisk?.hasRisk ? (
          <div
            className="inline-flex items-center gap-1 text-orange-500 cursor-help"
            title={`疑似重复：与 ${row.duplicateRisk.similarCount} 条现有诉求相似，最高相似度 ${Math.round(row.duplicateRisk.topSimilarity * 100)}%`}
          >
            <Copy className="w-4 h-4" />
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 text-green-600" title="合法">
            <CheckCircle className="w-4 h-4" />
          </div>
        )}
      </td>
    </tr>
  );
}
