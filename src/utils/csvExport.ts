import { STATUS_OPTIONS } from '@/types/complaint';
import type { Complaint } from '@/types/complaint';

const EXPORT_HEADERS = [
  '编号',
  '姓名',
  '联系方式',
  '诉求类型',
  '来源渠道',
  '受理时间',
  '状态',
  '处理意见',
  '回复时间',
] as const;

function escapeCSVValue(value: string): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function getStatusLabel(status: string): string {
  const option = STATUS_OPTIONS.find((opt) => opt.value === status);
  return option ? option.label : status;
}

function formatExportRow(complaint: Complaint): string[] {
  return [
    complaint.id,
    complaint.name,
    complaint.phone,
    complaint.type,
    complaint.source,
    complaint.receiveTime,
    getStatusLabel(complaint.status),
    complaint.handleOpinion || '',
    complaint.replyTime || '',
  ];
}

export function generateCSV(complaints: Complaint[]): string {
  const headerRow = EXPORT_HEADERS.map(escapeCSVValue).join(',');
  const dataRows = complaints.map((c) =>
    formatExportRow(c).map(escapeCSVValue).join(',')
  );
  const rows = [headerRow, ...dataRows];
  return '\uFEFF' + rows.join('\r\n');
}

export function generateExportFileName(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `诉求记录_${year}${month}${day}_${hours}${minutes}${seconds}.csv`;
}

export function downloadCSV(csvContent: string, fileName: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportComplaintsToCSV(complaints: Complaint[]): { success: boolean; message: string } {
  if (complaints.length === 0) {
    return { success: false, message: '当前筛选结果为空，无可导出数据' };
  }

  try {
    const csvContent = generateCSV(complaints);
    const fileName = generateExportFileName();
    downloadCSV(csvContent, fileName);
    return { success: true, message: `成功导出 ${complaints.length} 条诉求记录` };
  } catch {
    return { success: false, message: '导出失败，请稍后重试' };
  }
}
