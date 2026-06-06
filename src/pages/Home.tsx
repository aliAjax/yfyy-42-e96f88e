import { useState, useEffect, useMemo } from 'react';
import { BarChart3, X, Upload } from 'lucide-react';
import Header from '@/components/Header';
import ComplaintForm from '@/components/ComplaintForm';
import ComplaintList from '@/components/ComplaintList';
import DetailModal from '@/components/DetailModal';
import Dashboard from '@/components/Dashboard';
import ImportModal from '@/components/ImportModal';
import { mockComplaints } from '@/data/mockData';
import { generateId } from '@/utils/helpers';
import { calculateDashboardStats } from '@/utils/stats';
import { exportComplaintsToCSV } from '@/utils/csvExport';
import type { Complaint, ComplaintFormData, HandleFormData, ComplaintStatus } from '@/types/complaint';

const STORAGE_KEY = 'complaint_records';

export default function Home() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const dashboardStats = useMemo(() => calculateDashboardStats(complaints), [complaints]);

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

  const handleBatchImport = (rows: ComplaintFormData[]) => {
    const now = new Date().toISOString();
    const newComplaints: Complaint[] = rows.map((data) => ({
      id: generateId(),
      ...data,
      status: 'pending',
      handleOpinion: '',
      replyTime: '',
      createdAt: now,
      updatedAt: now,
    }));
    setComplaints((prev) => [...newComplaints, ...prev]);
    setShowImportModal(false);
    showToast(`成功导入 ${rows.length} 条诉求！`);
  };

  const handleExport = (filteredComplaints: Complaint[]) => {
    const result = exportComplaintsToCSV(filteredComplaints);
    showToast(result.message, result.success ? 'success' : 'error');
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">诉求管理</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  批量导入
                </button>
                <button
                  onClick={() => setShowDashboard(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                >
                  <BarChart3 className="w-4 h-4" />
                  数据看板
                </button>
              </div>
            </div>
            <div className="h-[calc(100vh-220px)]">
              <ComplaintList
                complaints={complaints}
                onCardClick={setSelectedComplaint}
                onExport={handleExport}
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

      {showDashboard && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowDashboard(false)}
          ></div>
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-slate-50 shadow-2xl overflow-y-auto transition-transform">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-800">数据看板</h3>
              </div>
              <button
                onClick={() => setShowDashboard(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <Dashboard stats={dashboardStats} />
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleBatchImport}
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
