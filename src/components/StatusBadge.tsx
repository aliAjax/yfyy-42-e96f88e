import type { ComplaintStatus } from '@/types/complaint';

interface StatusBadgeProps {
  status: ComplaintStatus;
}

const statusConfig: Record<ComplaintStatus, { label: string; className: string }> = {
  pending: {
    label: '待处理',
    className: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  },
  processing: {
    label: '处理中',
    className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  },
  replied: {
    label: '已回复',
    className: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${config.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        status === 'pending' ? 'bg-red-500' : status === 'processing' ? 'bg-blue-500' : 'bg-green-500'
      }`}></span>
      {config.label}
    </span>
  );
}
