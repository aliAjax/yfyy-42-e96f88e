import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  Save,
  Trash2,
  ChevronDown,
  X,
  Calendar,
  Layers,
  Zap,
  AlertTriangle,
  TrendingUp,
  Tag,
  Radio,
} from 'lucide-react';
import { COMPLAINT_TYPES, SOURCE_CHANNELS, STATUS_OPTIONS, DEFAULT_FILTER } from '@/types/complaint';
import type { ViewFilter, SavedView } from '@/types/complaint';
import type { UserRole } from '@/utils/permissions';
import {
  getSavedViews,
  saveView,
  deleteView,
  setActiveViewId,
  getActiveViewId,
  isDefaultView,
  isFilterEmpty,
} from '@/utils/views';

interface ViewFilterPanelProps {
  filter: ViewFilter;
  onFilterChange: (filter: ViewFilter) => void;
  currentRole: UserRole;
  totalCount: number;
  filteredCount: number;
}

export default function ViewFilterPanel({
  filter,
  onFilterChange,
  currentRole,
  totalCount,
  filteredCount,
}: ViewFilterPanelProps) {
  const [views, setViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewIdState] = useState<string | null>(null);
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [viewName, setViewName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const saveModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedViews = getSavedViews(currentRole);
    setViews(savedViews);
    const activeId = getActiveViewId(currentRole);
    if (activeId && savedViews.some((v) => v.id === activeId)) {
      setActiveViewIdState(activeId);
      const view = savedViews.find((v) => v.id === activeId);
      if (view) {
        onFilterChange({ ...view.filter });
      }
    } else if (savedViews.length > 0) {
      setActiveViewIdState(savedViews[0].id);
    }
  }, [currentRole]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowViewDropdown(false);
      }
      if (saveModalRef.current && !saveModalRef.current.contains(e.target as Node)) {
        setShowSaveModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeView = views.find((v) => v.id === activeViewId);

  const handleViewSelect = (view: SavedView) => {
    setActiveViewIdState(view.id);
    setActiveViewId(currentRole, view.id);
    onFilterChange({ ...view.filter });
    setShowViewDropdown(false);
  };

  const handleSaveView = () => {
    if (!viewName.trim()) return;
    const newView = saveView(viewName.trim(), filter, currentRole);
    setViews(getSavedViews(currentRole));
    setActiveViewIdState(newView.id);
    setActiveViewId(currentRole, newView.id);
    setShowSaveModal(false);
    setViewName('');
  };

  const handleDeleteView = (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDefaultView(viewId)) return;
    if (deleteView(viewId, currentRole)) {
      const newViews = getSavedViews(currentRole);
      setViews(newViews);
      if (activeViewId === viewId && newViews.length > 0) {
        setActiveViewIdState(newViews[0].id);
        setActiveViewId(currentRole, newViews[0].id);
        onFilterChange({ ...newViews[0].filter });
      }
    }
  };

  const handleFilterChange = (key: keyof ViewFilter, value: any) => {
    const newFilter = { ...filter, [key]: value };
    onFilterChange(newFilter);
    setActiveViewIdState(null);
    setActiveViewId(currentRole, null);
  };

  const handleReset = () => {
    onFilterChange({ ...DEFAULT_FILTER });
    setActiveViewIdState(null);
    setActiveViewId(currentRole, null);
  };

  const toggleArrayItem = (key: 'types' | 'sources' | 'statuses', value: string) => {
    const current = filter[key] as string[];
    const newArr = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    handleFilterChange(key, newArr);
  };

  const toggleTriState = (key: 'escalated' | 'overdue') => {
    const current = filter[key];
    let next: boolean | null;
    if (current === null) next = true;
    else if (current === true) next = false;
    else next = null;
    handleFilterChange(key, next);
  };

  const getTriStateLabel = (value: boolean | null, label: string) => {
    if (value === null) return label;
    return value ? `是${label}` : `否${label}`;
  };

  const getTriStateClass = (value: boolean | null) => {
    if (value === null) return 'bg-white text-slate-600 border-slate-300 hover:border-slate-400';
    if (value) return 'bg-blue-50 text-blue-600 border-blue-400';
    return 'bg-slate-100 text-slate-500 border-slate-300';
  };

  const activeFilterCount = (
    (filter.types.length > 0 ? 1 : 0) +
    (filter.sources.length > 0 ? 1 : 0) +
    (filter.statuses.length > 0 ? 1 : 0) +
    (filter.escalated !== null ? 1 : 0) +
    (filter.overdue !== null ? 1 : 0) +
    (filter.receiveTimeStart ? 1 : 0) +
    (filter.receiveTimeEnd ? 1 : 0)
  );

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setShowViewDropdown(!showViewDropdown)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors max-w-[140px] sm:max-w-[180px]"
            >
              <Layers className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{activeView?.name || '自定义筛选'}</span>
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            </button>

            {showViewDropdown && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-200 z-20 py-1 max-h-80 overflow-y-auto">
                {views.map((view) => (
                  <div
                    key={view.id}
                    className={`group flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-50 ${
                      view.id === activeViewId ? 'bg-blue-50 text-blue-600' : 'text-slate-700'
                    }`}
                    onClick={() => handleViewSelect(view)}
                  >
                    <span className="text-sm truncate flex-1">{view.name}</span>
                    {!isDefaultView(view.id) && (
                      <button
                        onClick={(e) => handleDeleteView(view.id, e)}
                        className="ml-2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        title="删除视图"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative flex-1 min-w-[160px] sm:min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索姓名、内容、电话..."
              value={filter.keyword}
              onChange={(e) => handleFilterChange('keyword', e.target.value)}
              className="w-full pl-8 sm:pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              showFilterPanel || activeFilterCount > 0
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">高级筛选</span>
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 text-sm font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">保存视图</span>
          </button>

          {!isFilterEmpty(filter) && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="重置筛选"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showFilterPanel && (
        <div className="px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <label className="text-sm font-medium text-slate-700">诉求类型</label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COMPLAINT_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleArrayItem('types', type)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                      filter.types.includes(type)
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <Radio className="w-3.5 h-3.5 text-slate-500" />
                <label className="text-sm font-medium text-slate-700">来源渠道</label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SOURCE_CHANNELS.map((source) => (
                  <button
                    key={source}
                    onClick={() => toggleArrayItem('sources', source)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                      filter.sources.includes(source)
                        ? 'bg-purple-500 text-white border-purple-500'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-purple-400'
                    }`}
                  >
                    {source}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3.5 h-3.5 text-slate-500" />
                <label className="text-sm font-medium text-slate-700">处理状态</label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => toggleArrayItem('statuses', status.value)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                      filter.statuses.includes(status.value)
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-green-400'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                <label className="text-sm font-medium text-slate-700">是否升级</label>
              </div>
              <button
                onClick={() => toggleTriState('escalated')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors w-full sm:w-auto ${getTriStateClass(filter.escalated)}`}
              >
                {getTriStateLabel(filter.escalated, '升级')}
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                <label className="text-sm font-medium text-slate-700">是否超期</label>
              </div>
              <button
                onClick={() => toggleTriState('overdue')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors w-full sm:w-auto ${getTriStateClass(filter.overdue)}`}
              >
                {getTriStateLabel(filter.overdue, '超期')}
              </button>
            </div>

            <div className="col-span-2 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <label className="text-sm font-medium text-slate-700">受理时间范围</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filter.receiveTimeStart || ''}
                  onChange={(e) => handleFilterChange('receiveTimeStart', e.target.value || null)}
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-slate-400 text-xs flex-shrink-0">至</span>
                <input
                  type="date"
                  value={filter.receiveTimeEnd || ''}
                  onChange={(e) => handleFilterChange('receiveTimeEnd', e.target.value || null)}
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              当前筛选结果：<span className="font-medium text-slate-700">{filteredCount}</span> / 总计 {totalCount} 条
            </span>
            <button
              onClick={handleReset}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              清空所有筛选条件
            </button>
          </div>
        </div>
      )}

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowSaveModal(false)} />
          <div
            ref={saveModalRef}
            className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm"
          >
            <h3 className="text-lg font-semibold text-slate-800 mb-4">保存视图</h3>
            <input
              type="text"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="请输入视图名称"
              autoFocus
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveView()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveView}
                disabled={!viewName.trim()}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
