import { useState, useMemo } from 'react';
import { X, Upload, AlertTriangle, CheckCircle, FileText, Copy, ArrowRight, ArrowLeft, Map, Table2 } from 'lucide-react';
import { parseCSVText, parseCSVHeaders, autoDetectFieldMapping, parseCSVLine } from '@/utils/csvImport';
import type {
  ImportPreviewResult,
  ParsedImportRow,
  ComplaintFormData,
  Complaint,
  ImportStep,
  ImportMode,
  FieldMapping,
  ImportFieldKey,
} from '@/types/complaint';
import { getDuplicateRiskInfo } from '@/utils/merge';

interface ImportModalProps {
  onClose: () => void;
  onImport: (rows: ComplaintFormData[]) => void;
  existingComplaints?: Complaint[];
}

const FIELD_KEYS: ImportFieldKey[] = ['name', 'phone', 'type', 'source', 'receiveTime', 'content'];

const FIELD_LABELS: Record<ImportFieldKey, string> = {
  name: '姓名',
  phone: '电话',
  type: '诉求类型',
  source: '来源',
  receiveTime: '受理时间',
  content: '内容',
};

const FIELD_REQUIRED: Record<ImportFieldKey, boolean> = {
  name: true,
  phone: true,
  type: false,
  source: false,
  receiveTime: true,
  content: true,
};

export default function ImportModal({ onClose, onImport, existingComplaints = [] }: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>('paste');
  const [csvText, setCsvText] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({
    name: null,
    phone: null,
    type: null,
    source: null,
    receiveTime: null,
    content: null,
  });
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('skipInvalidAndDuplicates');
  const [checkDuplicates, setCheckDuplicates] = useState(true);

  const sampleCSV = `姓名,电话,诉求类型,来源渠道,受理时间,具体内容
张三,13812345678,投诉,来电,2024-01-15 09:30,小区垃圾桶清运不及时
李四,13987654321,建议,网上留言,2024-01-16 14:20,建议增加社区健身器材
王五,13111112222,咨询,微信公众号,2024-01-17 10:00,咨询社保办理流程`;

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

  const nonDuplicateValidRows = useMemo(() => {
    if (!previewResult) return [];
    return previewResult.rows.filter(
      (row) => row.isValid && !row.duplicateRisk?.hasRisk
    );
  }, [previewResult]);

  const rowsToImportCount = useMemo(() => {
    if (!previewResult) return 0;
    switch (importMode) {
      case 'all':
        return validRows.length;
      case 'skipInvalid':
        return validRows.length;
      case 'skipInvalidAndDuplicates':
        return nonDuplicateValidRows.length;
    }
  }, [previewResult, importMode, validRows.length, nonDuplicateValidRows.length]);

  const canProceedFromMapping = useMemo(() => {
    return (
      fieldMapping.name !== null &&
      fieldMapping.phone !== null &&
      fieldMapping.content !== null &&
      fieldMapping.receiveTime !== null
    );
  }, [fieldMapping]);

  const canImport = useMemo(() => {
    if (!previewResult || previewResult.total === 0) return false;
    return rowsToImportCount > 0;
  }, [previewResult, rowsToImportCount]);

  const handleParseHeaders = () => {
    if (!csvText.trim()) return;
    const parsedHeaders = parseCSVHeaders(csvText);
    setHeaders(parsedHeaders);
    setFieldMapping(autoDetectFieldMapping(parsedHeaders));
    setStep('mapping');
  };

  const handleBackToPaste = () => {
    setStep('paste');
    setPreviewResult(null);
  };

  const handlePreview = () => {
    if (!csvText.trim()) return;
    const result = parseCSVText(csvText, fieldMapping);

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
    setStep('preview');
  };

  const handleBackToMapping = () => {
    setStep('mapping');
  };

  const handleConfirmImport = () => {
    if (!previewResult) return;

    let rowsToImport: ComplaintFormData[] = [];

    switch (importMode) {
      case 'all':
      case 'skipInvalid':
        rowsToImport = validRows.map((row) => row.data);
        break;
      case 'skipInvalidAndDuplicates':
        rowsToImport = nonDuplicateValidRows.map((row) => row.data);
        break;
    }

    if (rowsToImport.length > 0) {
      onImport(rowsToImport);
    }
  };

  const fillSample = () => {
    setCsvText(sampleCSV);
    setPreviewResult(null);
    setHeaders([]);
    setFieldMapping({
      name: null,
      phone: null,
      type: null,
      source: null,
      receiveTime: null,
      content: null,
    });
    setStep('paste');
  };

  const handleMappingChange = (field: ImportFieldKey, headerIndex: number | null) => {
    setFieldMapping((prev) => {
      const next = { ...prev };

      if (headerIndex !== null) {
        for (const key of FIELD_KEYS) {
          if (next[key] === headerIndex) {
            next[key] = null;
          }
        }
      }

      next[field] = headerIndex;
      return next;
    });
  };

  const steps = [
    { key: 'paste', label: '粘贴数据', icon: FileText },
    { key: 'mapping', label: '字段映射', icon: Map },
    { key: 'preview', label: '确认导入', icon: CheckCircle },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">批量导入诉求</h3>
              <p className="text-sm text-slate-500">三步完成数据导入：粘贴 → 映射 → 确认</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="flex items-center justify-center gap-2">
            {steps.map((s, index) => {
              const StepIcon = s.icon;
              const isActive = s.key === step;
              const isPast = index < currentStepIndex;
              return (
                <div key={s.key} className="flex items-center">
                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : isPast
                        ? 'text-green-600 bg-green-50'
                        : 'text-slate-400'
                    }`}
                  >
                    <StepIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">{s.label}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-12 h-0.5 mx-1 ${
                        isPast ? 'bg-green-400' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 'paste' && (
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
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="请粘贴CSV格式数据，第一行为表头&#10;系统会自动识别字段，您也可以手动调整映射关系"
                className="w-full h-80 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
              <div className="text-xs text-slate-500 space-y-1">
                <p>• 支持的字段：姓名、电话、诉求类型、来源、受理时间、内容</p>
                <p>• 第一行为表头，后续行为数据，字段顺序不限</p>
                <p>• 必填字段：姓名、电话、受理时间、内容</p>
              </div>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
                <Map className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">
                    字段映射
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    请将 CSV 列映射到对应的目标字段，带 <span className="text-red-500">*</span> 的为必填项
                  </p>
                </div>
                <div className="text-xs text-blue-600 font-medium">
                  共 {headers.length} 列
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 w-32">目标字段</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">CSV 列</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 w-24">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {FIELD_KEYS.map((field) => (
                      <tr key={field} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-700">
                              {FIELD_LABELS[field]}
                            </span>
                            {FIELD_REQUIRED[field] && (
                              <span className="text-red-500 text-xs">*</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={fieldMapping[field] ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleMappingChange(
                                field,
                                val === '' ? null : Number(val)
                              );
                            }}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          >
                            <option value="">-- 不映射 --</option>
                            {headers.map((header, index) => (
                              <option key={index} value={index}>
                                第{index + 1}列：{header || '(空)'}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          {fieldMapping[field] !== null ? (
                            <div className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                              <CheckCircle className="w-4 h-4" />
                              已映射
                            </div>
                          ) : FIELD_REQUIRED[field] ? (
                            <div className="inline-flex items-center gap-1 text-red-500 text-xs font-medium">
                              <AlertTriangle className="w-4 h-4" />
                              未映射
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 text-slate-400 text-xs">
                              可选
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Table2 className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">数据预览（前3行）</span>
                </div>
                <div className="max-h-48 overflow-auto border border-slate-200 rounded-lg bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium text-slate-500 w-12">行号</th>
                        {headers.map((h, i) => {
                          const mappedField = FIELD_KEYS.find((f) => fieldMapping[f] === i);
                          return (
                            <th
                              key={i}
                              className={`px-2 py-2 text-left font-medium whitespace-nowrap ${
                                mappedField ? 'text-blue-600 bg-blue-50' : 'text-slate-500'
                              }`}
                            >
                              {h || '(空)'}
                              {mappedField && (
                                <div className="text-[10px] font-normal text-blue-500">
                                  → {FIELD_LABELS[mappedField]}
                                </div>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {csvText
                        .split(/\r?\n/)
                        .map((l) => l.trim())
                        .filter((l) => l.length > 0)
                        .slice(1, 4)
                        .map((line, rowIdx) => {
                          const values = parseCSVLine(line);
                          return (
                            <tr key={rowIdx} className="hover:bg-slate-50">
                              <td className="px-2 py-1.5 text-slate-400 font-mono">{rowIdx + 1}</td>
                              {headers.map((_, colIdx) => (
                                <td
                                  key={colIdx}
                                  className={`px-2 py-1.5 truncate max-w-[150px] ${
                                    FIELD_KEYS.some((f) => fieldMapping[f] === colIdx)
                                      ? 'text-slate-700'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {values[colIdx] || ''}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                  {csvText.split(/\r?\n/).filter((l) => l.trim().length > 0).length <= 1 && (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      无数据行
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && previewResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-3">
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
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{rowsToImportCount}</div>
                  <div className="text-xs text-blue-600 mt-1">将导入</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium text-slate-700">导入方式</div>
                <div className="grid grid-cols-3 gap-3">
                  <label
                    className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      importMode === 'all'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="all"
                      checked={importMode === 'all'}
                      onChange={() => setImportMode('all')}
                      className="sr-only"
                    />
                    <div className="text-sm font-medium text-slate-800">导入所有合法数据</div>
                    <div className="text-xs text-slate-500 mt-1">
                      共 {validRows.length} 条（含疑似重复）
                    </div>
                  </label>

                  <label
                    className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      importMode === 'skipInvalid'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="skipInvalid"
                      checked={importMode === 'skipInvalid'}
                      onChange={() => setImportMode('skipInvalid')}
                      className="sr-only"
                    />
                    <div className="text-sm font-medium text-slate-800">跳过错误行</div>
                    <div className="text-xs text-slate-500 mt-1">
                      跳过 {previewResult.invalidCount} 条异常数据
                    </div>
                  </label>

                  <label
                    className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      importMode === 'skipInvalidAndDuplicates'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="skipInvalidAndDuplicates"
                      checked={importMode === 'skipInvalidAndDuplicates'}
                      onChange={() => setImportMode('skipInvalidAndDuplicates')}
                      className="sr-only"
                    />
                    <div className="text-sm font-medium text-slate-800">跳过错误和重复</div>
                    <div className="text-xs text-slate-500 mt-1">
                      导入 {nonDuplicateValidRows.length} 条安全数据
                    </div>
                  </label>
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
                      请查看下方标红的行，或选择跳过错误行
                    </p>
                  </div>
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
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 flex-shrink-0 bg-white">
          <div>
            {step === 'paste' && (
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                取消
              </button>
            )}
            {step === 'mapping' && (
              <button
                onClick={handleBackToPaste}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                上一步
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={handleBackToMapping}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                返回修改映射
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step === 'paste' && (
              <button
                onClick={handleParseHeaders}
                disabled={!csvText.trim()}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
              >
                下一步：字段映射
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {step === 'mapping' && (
              <button
                onClick={handlePreview}
                disabled={!canProceedFromMapping}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
              >
                下一步：预览确认
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={handleConfirmImport}
                disabled={!canImport}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                确认导入 {rowsToImportCount} 条
              </button>
            )}
          </div>
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
            title={`疑似重复：与 ${row.duplicateRisk.similarCount} 条现有诉求相似，最高相似度 ${row.duplicateRisk.topSimilarity}%`}
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
