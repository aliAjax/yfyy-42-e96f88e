import { useState, useRef, useMemo } from 'react';
import {
  X,
  Download,
  Upload,
  FileJson,
  AlertTriangle,
  CheckCircle,
  Info,
  ArrowRight,
  Database,
  FileText,
  RefreshCw,
  Shield,
} from 'lucide-react';
import type {
  ImportPreviewResult,
  ConflictItem,
  ImportMode,
  ConflictResolution,
} from '@/types/backup';
import { BACKUP_VERSION } from '@/types/backup';
import {
  exportBackupToFile,
  readBackupFile,
  generateImportPreview,
  applyImport,
} from '@/utils/backup';
import type { Complaint } from '@/types/complaint';
import type { ReplyTemplate } from '@/types/replyTemplate';

interface BackupRestoreModalProps {
  onClose: () => void;
  onRestoreComplete: () => void;
}

type TabType = 'export' | 'import';

export default function BackupRestoreModal({
  onClose,
  onRestoreComplete,
}: BackupRestoreModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('export');
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge_skip');
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 2500);
  };

  const handleExport = () => {
    try {
      exportBackupToFile();
      showToast('备份文件已导出！');
    } catch {
      showToast('导出失败，请重试', 'error');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setPreviewResult(null);
    setConflicts([]);

    try {
      const content = await readBackupFile(file);
      setFileContent(content);

      const preview = generateImportPreview(content);
      setPreviewResult(preview);
      setConflicts(preview.conflicts);
    } catch (err) {
      showToast('文件读取失败', 'error');
    }
  };

  const handleConflictResolution = (
    type: 'complaint' | 'template',
    id: string,
    resolution: ConflictResolution
  ) => {
    setConflicts((prev) =>
      prev.map((c) =>
        c.type === type && c.id === id ? { ...c, resolution } : c
      )
    );
  };

  const handleResolveAll = (resolution: ConflictResolution) => {
    setConflicts((prev) => prev.map((c) => ({ ...c, resolution })));
  };

  const canRestore = useMemo(() => {
    if (!previewResult) return false;
    if (!previewResult.validation.valid && previewResult.validation.errors.length > 0) {
      return false;
    }
    return true;
  }, [previewResult]);

  const handleRestore = () => {
    if (!previewResult || !canRestore) return;

    setIsProcessing(true);
    try {
      const result = applyImport(previewResult.backupData, importMode, conflicts);
      if (result.success) {
        showToast(result.message);
        setTimeout(() => {
          onRestoreComplete();
          onClose();
        }, 1000);
      } else {
        showToast(result.message, 'error');
      }
    } catch {
      showToast('恢复失败，请重试', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const complaintConflicts = conflicts.filter((c) => c.type === 'complaint');
  const templateConflicts = conflicts.filter((c) => c.type === 'template');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">数据备份与恢复</h3>
              <p className="text-sm text-slate-500">导出或导入系统数据备份</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'export'
                ? 'text-purple-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              导出备份
            </div>
            {activeTab === 'export' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'import'
                ? 'text-purple-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" />
              恢复备份
            </div>
            {activeTab === 'import' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"></div>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'export' && (
            <ExportPanel onExport={handleExport} />
          )}

          {activeTab === 'import' && (
            <ImportPanel
              fileInputRef={fileInputRef}
              fileName={fileName}
              onFileSelect={handleFileSelect}
              previewResult={previewResult}
              importMode={importMode}
              onImportModeChange={setImportMode}
              complaintConflicts={complaintConflicts}
              templateConflicts={templateConflicts}
              onConflictResolution={handleConflictResolution}
              onResolveAll={handleResolveAll}
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            关闭
          </button>
          {activeTab === 'export' && (
            <button
              onClick={handleExport}
              className="px-5 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出备份
            </button>
          )}
          {activeTab === 'import' && (
            <button
              onClick={handleRestore}
              disabled={!canRestore || isProcessing}
              className="px-5 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              确认恢复
            </button>
          )}
        </div>

        {toast.show && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 transition-all duration-300">
            <div
              className={`px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
                toast.type === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white'
              }`}
            >
              {toast.type === 'success' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {toast.message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExportPanel({ onExport }: { onExport: () => void }) {
  const currentBackup = useMemo(() => {
    try {
      const complaintsStr = localStorage.getItem('complaint_records');
      const templatesStr = localStorage.getItem('reply_templates');
      const complaints = complaintsStr ? JSON.parse(complaintsStr) : [];
      const templates = templatesStr ? JSON.parse(templatesStr) : [];

      const totalHandleRecords = complaints.reduce(
        (sum: number, c: Complaint) => sum + (c.handleRecords?.length || 0),
        0
      );
      const totalEscalationRecords = complaints.reduce(
        (sum: number, c: Complaint) => sum + (c.escalationRecords?.length || 0),
        0
      );

      return {
        complaintCount: complaints.length,
        templateCount: templates.length,
        totalHandleRecords,
        totalEscalationRecords,
      };
    } catch {
      return { complaintCount: 0, templateCount: 0, totalHandleRecords: 0, totalEscalationRecords: 0 };
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileJson className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-slate-800 mb-1">导出数据备份</h4>
            <p className="text-sm text-slate-600">
              将当前系统中的所有诉求数据、回复模板、处理记录和升级记录导出为 JSON 格式的备份文件，
              可用于数据迁移或存档。
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{currentBackup.complaintCount}</div>
          <div className="text-xs text-slate-500 mt-1">诉求记录</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{currentBackup.templateCount}</div>
          <div className="text-xs text-slate-500 mt-1">回复模板</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{currentBackup.totalHandleRecords}</div>
          <div className="text-xs text-slate-500 mt-1">处理记录</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{currentBackup.totalEscalationRecords}</div>
          <div className="text-xs text-slate-500 mt-1">升级记录</div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">备份说明</p>
            <ul className="text-xs text-amber-700 mt-1 space-y-1">
              <li>• 备份文件包含所有诉求及相关处理记录、升级记录</li>
              <li>• 备份文件包含所有回复模板</li>
              <li>• 备份版本号：v{BACKUP_VERSION}</li>
              <li>• 请妥善保管备份文件，包含用户隐私信息</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        onClick={onExport}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Download className="w-5 h-5" />
        导出 JSON 备份文件
      </button>
    </div>
  );
}

interface ImportPanelProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  fileName: string;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  previewResult: ImportPreviewResult | null;
  importMode: ImportMode;
  onImportModeChange: (mode: ImportMode) => void;
  complaintConflicts: ConflictItem[];
  templateConflicts: ConflictItem[];
  onConflictResolution: (
    type: 'complaint' | 'template',
    id: string,
    resolution: ConflictResolution
  ) => void;
  onResolveAll: (resolution: ConflictResolution) => void;
}

function ImportPanel({
  fileInputRef,
  fileName,
  onFileSelect,
  previewResult,
  importMode,
  onImportModeChange,
  complaintConflicts,
  templateConflicts,
  onConflictResolution,
  onResolveAll,
}: ImportPanelProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <FileJson className="w-4 h-4" />
          选择备份文件
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-purple-400 rounded-xl p-8 text-center cursor-pointer transition-colors"
        >
          <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          {fileName ? (
            <div>
              <p className="text-sm font-medium text-slate-700">{fileName}</p>
              <p className="text-xs text-slate-500 mt-1">点击重新选择</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-600">点击选择或拖拽 JSON 备份文件</p>
              <p className="text-xs text-slate-400 mt-1">支持 .json 格式的备份文件</p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={onFileSelect}
          className="hidden"
        />
      </div>

      {previewResult && (
        <>
          <ValidationSummary validation={previewResult.validation} />

          <DiffSummary diff={previewResult.diff} />

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              恢复模式
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ModeCard
                title="合并（保留当前）"
                description="新增备份中有但当前没有的数据，冲突时保留当前数据"
                selected={importMode === 'merge_skip'}
                onClick={() => onImportModeChange('merge_skip')}
              />
              <ModeCard
                title="合并（覆盖冲突）"
                description="新增备份中有但当前没有的数据，冲突时使用备份数据"
                selected={importMode === 'merge_overwrite'}
                onClick={() => onImportModeChange('merge_overwrite')}
              />
              <ModeCard
                title="全部覆盖"
                description="完全替换当前数据为备份数据（将删除当前所有数据）"
                selected={importMode === 'overwrite_all'}
                onClick={() => onImportModeChange('overwrite_all')}
              />
            </div>
          </div>

          {(complaintConflicts.length > 0 || templateConflicts.length > 0) && (
            <ConflictList
              complaintConflicts={complaintConflicts}
              templateConflicts={templateConflicts}
              onResolve={onConflictResolution}
              onResolveAll={onResolveAll}
            />
          )}
        </>
      )}

      {!previewResult && fileName && (
        <div className="text-center py-8 text-slate-400">
          <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
          <p className="text-sm">正在解析备份文件...</p>
        </div>
      )}

      {!previewResult && !fileName && (
        <div className="text-center py-8 text-slate-400">
          <FileJson className="w-12 h-12 mx-auto mb-3" />
          <p className="text-sm">选择备份文件后查看预览结果</p>
        </div>
      )}
    </div>
  );
}

function ValidationSummary({ validation }: { validation: ImportPreviewResult['validation'] }) {
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  return (
    <div
      className={`rounded-xl p-4 border ${
        hasErrors
          ? 'bg-red-50 border-red-200'
          : hasWarnings
          ? 'bg-amber-50 border-amber-200'
          : 'bg-green-50 border-green-200'
      }`}
    >
      <div className="flex items-start gap-3">
        {hasErrors ? (
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        ) : hasWarnings ? (
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        ) : (
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p
              className={`text-sm font-medium ${
                hasErrors ? 'text-red-800' : hasWarnings ? 'text-amber-800' : 'text-green-800'
              }`}
            >
              {hasErrors ? '校验未通过' : hasWarnings ? '校验通过（有警告）' : '校验通过'}
            </p>
            {validation.version && (
              <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded">
                v{validation.version}
              </span>
            )}
          </div>

          {validation.errors.length > 0 && (
            <ul className="text-xs text-red-700 mt-2 space-y-1">
              {validation.errors.slice(0, 5).map((err, i) => (
                <li key={i}>• {err}</li>
              ))}
              {validation.errors.length > 5 && (
                <li>• 还有 {validation.errors.length - 5} 条错误...</li>
              )}
            </ul>
          )}

          {validation.warnings.length > 0 && (
            <ul className="text-xs text-amber-700 mt-2 space-y-1">
              {validation.warnings.slice(0, 5).map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
              {validation.warnings.length > 5 && (
                <li>• 还有 {validation.warnings.length - 5} 条警告...</li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function DiffSummary({ diff }: { diff: ImportPreviewResult['diff'] }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        数据差异预览
      </h4>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4" />
            诉求数据
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <div className="font-bold text-green-600">+{diff.complaints.added}</div>
              <div className="text-xs text-green-600">新增</div>
            </div>
            <div className="text-center p-2 bg-red-50 rounded-lg">
              <div className="font-bold text-red-600">-{diff.complaints.removed}</div>
              <div className="text-xs text-red-600">删除</div>
            </div>
            <div className="text-center p-2 bg-amber-50 rounded-lg">
              <div className="font-bold text-amber-600">{diff.complaints.modified}</div>
              <div className="text-xs text-amber-600">修改</div>
            </div>
            <div className="text-center p-2 bg-slate-100 rounded-lg">
              <div className="font-bold text-slate-600">{diff.complaints.unchanged}</div>
              <div className="text-xs text-slate-600">不变</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4">
          <div className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            回复模板
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <div className="font-bold text-green-600">+{diff.templates.added}</div>
              <div className="text-xs text-green-600">新增</div>
            </div>
            <div className="text-center p-2 bg-red-50 rounded-lg">
              <div className="font-bold text-red-600">-{diff.templates.removed}</div>
              <div className="text-xs text-red-600">删除</div>
            </div>
            <div className="text-center p-2 bg-amber-50 rounded-lg">
              <div className="font-bold text-amber-600">{diff.templates.modified}</div>
              <div className="text-xs text-amber-600">修改</div>
            </div>
            <div className="text-center p-2 bg-slate-100 rounded-lg">
              <div className="font-bold text-slate-600">{diff.templates.unchanged}</div>
              <div className="text-xs text-slate-600">不变</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-xl border-2 transition-all ${
        selected
          ? 'border-purple-500 bg-purple-50'
          : 'border-slate-200 hover:border-slate-300 bg-white'
      }`}
    >
      <div className={`text-sm font-semibold mb-1 ${selected ? 'text-purple-700' : 'text-slate-700'}`}>
        {title}
      </div>
      <p className={`text-xs ${selected ? 'text-purple-600' : 'text-slate-500'}`}>
        {description}
      </p>
    </button>
  );
}

interface ConflictListProps {
  complaintConflicts: ConflictItem[];
  templateConflicts: ConflictItem[];
  onResolve: (
    type: 'complaint' | 'template',
    id: string,
    resolution: ConflictResolution
  ) => void;
  onResolveAll: (resolution: ConflictResolution) => void;
}

function ConflictList({
  complaintConflicts,
  templateConflicts,
  onResolve,
  onResolveAll,
}: ConflictListProps) {
  const totalConflicts = complaintConflicts.length + templateConflicts.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          冲突项 ({totalConflicts})
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">批量处理：</span>
          <button
            onClick={() => onResolveAll('keep_current')}
            className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors"
          >
            全部保留当前
          </button>
          <button
            onClick={() => onResolveAll('overwrite')}
            className="text-xs px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded transition-colors"
          >
            全部使用备份
          </button>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="max-h-64 overflow-y-auto">
          {complaintConflicts.length > 0 && (
            <div className="divide-y divide-slate-100">
              <div className="px-4 py-2 bg-slate-50 text-xs font-medium text-slate-600">
                诉求冲突 ({complaintConflicts.length})
              </div>
              {complaintConflicts.slice(0, 10).map((conflict) => (
                <ConflictItemRow
                  key={conflict.id}
                  conflict={conflict}
                  onResolve={onResolve}
                  typeName="诉求"
                />
              ))}
              {complaintConflicts.length > 10 && (
                <div className="px-4 py-2 text-xs text-slate-500 text-center bg-slate-50">
                  还有 {complaintConflicts.length - 10} 条冲突...
                </div>
              )}
            </div>
          )}

          {templateConflicts.length > 0 && (
            <div className="divide-y divide-slate-100">
              <div className="px-4 py-2 bg-slate-50 text-xs font-medium text-slate-600">
                模板冲突 ({templateConflicts.length})
              </div>
              {templateConflicts.slice(0, 10).map((conflict) => (
                <ConflictItemRow
                  key={conflict.id}
                  conflict={conflict}
                  onResolve={onResolve}
                  typeName="模板"
                />
              ))}
              {templateConflicts.length > 10 && (
                <div className="px-4 py-2 text-xs text-slate-500 text-center bg-slate-50">
                  还有 {templateConflicts.length - 10} 条冲突...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConflictItemRow({
  conflict,
  onResolve,
  typeName,
}: {
  conflict: ConflictItem;
  onResolve: (
    type: 'complaint' | 'template',
    id: string,
    resolution: ConflictResolution
  ) => void;
  typeName: string;
}) {
  const current = conflict.current as Complaint | ReplyTemplate;
  const backup = conflict.backup as Complaint | ReplyTemplate;

  const title = conflict.type === 'complaint'
    ? (current as Complaint).name || (current as Complaint).id
    : (current as ReplyTemplate).title || (current as ReplyTemplate).id;

  const backupTitle = conflict.type === 'complaint'
    ? (backup as Complaint).name || (backup as Complaint).id
    : (backup as ReplyTemplate).title || (backup as ReplyTemplate).id;

  return (
    <div className="px-4 py-3 hover:bg-slate-50 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-700 truncate">
            {title || `${typeName} ID: ${conflict.id}`}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            ID: {conflict.id}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onResolve(conflict.type, conflict.id, 'keep_current')}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              conflict.resolution === 'keep_current'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            保留当前
          </button>
          <button
            onClick={() => onResolve(conflict.type, conflict.id, 'overwrite')}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              conflict.resolution === 'overwrite'
                ? 'bg-purple-100 text-purple-700 font-medium'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            使用备份
          </button>
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
        <span className="text-blue-600">当前: {title}</span>
        <ArrowRight className="w-3 h-3" />
        <span className="text-purple-600">备份: {backupTitle}</span>
      </div>
    </div>
  );
}
