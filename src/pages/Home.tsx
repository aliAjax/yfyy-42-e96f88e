import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ComplaintForm from '@/components/ComplaintForm';
import ComplaintList from '@/components/ComplaintList';
import DetailModal from '@/components/DetailModal';
import { mockComplaints } from '@/data/mockData';
import { generateId } from '@/utils/helpers';
import type { Complaint, ComplaintFormData, HandleFormData, ComplaintStatus } from '@/types/complaint';

const STORAGE_KEY = 'complaint_records';

export default function Home() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setComplaints(JSON.parse(stored));
      } catch {
        setComplaints(mockComplaints);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockComplaints));
      }
    } else {
      setComplaints(mockComplaints);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockComplaints));
    }
  }, []);

  useEffect(() => {
    if (complaints.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
    }
  }, [complaints]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 2500);
  };

  const handleAddComplaint = (data: ComplaintFormData) => {
    const now = new Date().toISOString();
    const newComplaint: Complaint = {
      id: generateId(),
      ...data,
      status: 'pending',
      handleOpinion: '',
      replyTime: '',
      createdAt: now,
      updatedAt: now,
    };
    setComplaints((prev) => [newComplaint, ...prev]);
    showToast('诉求登记成功！');
  };

  const handleComplaint = (id: string, data: HandleFormData) => {
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: data.status,
              handleOpinion: data.handleOpinion,
              replyTime: data.replyTime,
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
    setSelectedComplaint(null);
    showToast('处理记录已保存！');
  };

  const counts: Record<ComplaintStatus, number> = {
    pending: complaints.filter((c) => c.status === 'pending').length,
    processing: complaints.filter((c) => c.status === 'processing').length,
    replied: complaints.filter((c) => c.status === 'replied').length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header counts={counts} />

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <ComplaintForm onSubmit={handleAddComplaint} />
          </div>

          <div className="lg:col-span-8">
            <div className="h-[calc(100vh-180px)]">
              <ComplaintList
                complaints={complaints}
                onCardClick={setSelectedComplaint}
              />
            </div>
          </div>
        </div>
      </main>

      {selectedComplaint && (
        <DetailModal
          complaint={selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          onHandle={handleComplaint}
        />
      )}

      {toast.show && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300">
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
  );
}
