import { COMPLAINT_TYPES, SOURCE_CHANNELS } from '@/types/complaint';
import type { ComplaintFormData, ParsedImportRow, ImportPreviewResult, ImportRowError } from '@/types/complaint';

const FIELD_MAPPINGS: Record<string, keyof ComplaintFormData> = {
  '姓名': 'name',
  'name': 'name',
  '电话': 'phone',
  '联系方式': 'phone',
  'phone': 'phone',
  '诉求类型': 'type',
  '类型': 'type',
  'type': 'type',
  '来源渠道': 'source',
  '来源': 'source',
  'source': 'source',
  '受理时间': 'receiveTime',
  '时间': 'receiveTime',
  'receiveTime': 'receiveTime',
  '具体内容': 'content',
  '内容': 'content',
  'content': 'content',
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

function validatePhone(phone: string): boolean {
  if (!phone.trim()) return false;
  return /^1[3-9]\d{9}$/.test(phone) || /^\d{7,8}$/.test(phone);
}

function normalizeType(type: string): string {
  const trimmed = type.trim();
  if (COMPLAINT_TYPES.includes(trimmed as typeof COMPLAINT_TYPES[number])) {
    return trimmed;
  }
  return trimmed || COMPLAINT_TYPES[0];
}

function normalizeSource(source: string): string {
  const trimmed = source.trim();
  if (SOURCE_CHANNELS.includes(trimmed as typeof SOURCE_CHANNELS[number])) {
    return trimmed;
  }
  return trimmed || SOURCE_CHANNELS[0];
}

function normalizeReceiveTime(time: string): string {
  const trimmed = time.trim();
  if (!trimmed) return '';

  const normalized = trimmed.replace(/\//g, '-').replace(/T/g, ' ');

  const patterns = [
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
    /^\d{4}-\d{2}-\d{2}$/,
  ];

  for (const pattern of patterns) {
    if (pattern.test(normalized)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return `${normalized} 00:00`;
      }
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
        return normalized.substring(0, 16);
      }
      return normalized;
    }
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  return trimmed;
}

function validateRowData(data: ComplaintFormData): ImportRowError[] {
  const errors: ImportRowError[] = [];

  if (!data.name.trim()) {
    errors.push({ field: 'name', message: '缺少姓名' });
  }

  if (!data.phone.trim()) {
    errors.push({ field: 'phone', message: '缺少电话' });
  } else if (!validatePhone(data.phone)) {
    errors.push({ field: 'phone', message: '电话格式错误' });
  }

  if (!data.content.trim()) {
    errors.push({ field: 'content', message: '缺少具体内容' });
  }

  if (!data.receiveTime.trim()) {
    errors.push({ field: 'receiveTime', message: '缺少受理时间' });
  }

  return errors;
}

export function parseCSVText(text: string): ImportPreviewResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { total: 0, validCount: 0, invalidCount: 0, rows: [] };
  }

  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);

  const fieldIndices: Partial<Record<keyof ComplaintFormData, number>> = {};
  headers.forEach((header, index) => {
    const normalizedHeader = header.trim().toLowerCase();
    for (const [key, field] of Object.entries(FIELD_MAPPINGS)) {
      if (key.toLowerCase() === normalizedHeader || header.trim() === key) {
        fieldIndices[field] = index;
        break;
      }
    }
  });

  const dataRows = lines.slice(1);
  const parsedRows: ParsedImportRow[] = [];

  dataRows.forEach((line, rowIndex) => {
    const values = parseCSVLine(line);
    const data: ComplaintFormData = {
      name: '',
      phone: '',
      type: COMPLAINT_TYPES[0],
      content: '',
      source: SOURCE_CHANNELS[0],
      receiveTime: '',
    };

    for (const [field, index] of Object.entries(fieldIndices)) {
      if (index !== undefined && values[index] !== undefined) {
        const value = values[index];
        switch (field as keyof ComplaintFormData) {
          case 'name':
            data.name = value;
            break;
          case 'phone':
            data.phone = value;
            break;
          case 'type':
            data.type = normalizeType(value);
            break;
          case 'source':
            data.source = normalizeSource(value);
            break;
          case 'content':
            data.content = value;
            break;
          case 'receiveTime':
            data.receiveTime = normalizeReceiveTime(value);
            break;
        }
      }
    }

    const errors = validateRowData(data);
    parsedRows.push({
      index: rowIndex + 1,
      data,
      errors,
      isValid: errors.length === 0,
    });
  });

  const validCount = parsedRows.filter((row) => row.isValid).length;
  const invalidCount = parsedRows.filter((row) => !row.isValid).length;

  return {
    total: parsedRows.length,
    validCount,
    invalidCount,
    rows: parsedRows,
  };
}
