import { useState, useRef, useEffect } from 'react';
import { ClipboardList, AlertTriangle, AlertCircle, User, ChevronDown, Shield } from 'lucide-react';
import type { ComplaintStatus, OverdueCount } from '@/types/complaint';
import type { UserRole } from '@/utils/permissions';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, getRolePermissions, getPermissionLabel } from '@/utils/permissions';

interface HeaderProps {
  counts: Record<ComplaintStatus, number>;
  overdueCount: OverdueCount;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export default function Header({ counts, overdueCount, currentRole, onRoleChange }: HeaderProps) {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const total = counts.pending + counts.processing + counts.replied;

  const statItems = [
    { label: '全部', value: total, className: 'bg-slate-50 text-slate-700 ring-slate-200' },
    { label: '待处理', value: counts.pending, className: 'bg-red-50 text-red-700 ring-red-200' },
    { label: '处理中', value: counts.processing, className: 'bg-blue-50 text-blue-700 ring-blue-200' },
    { label: '已回复', value: counts.replied, className: 'bg-green-50 text-green-700 ring-green-200' },
  ];

  const roles: UserRole[] = ['registrar', 'handler', 'admin'];

  const getRoleColorClass = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'text-purple-600 bg-purple-50 ring-purple-200';
      case 'handler':
        return 'text-blue-600 bg-blue-50 ring-blue-200';
      case 'registrar':
        return 'text-emerald-600 bg-emerald-50 ring-emerald-200';
    }
  };

  const getRoleIconBg = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-600';
      case 'handler':
        return 'bg-blue-100 text-blue-600';
      case 'registrar':
        return 'bg-emerald-100 text-emerald-600';
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setShowRoleMenu(false);
      }
    };
    if (showRoleMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRoleMenu]);

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">投诉建议登记系统</h1>
              <p className="text-sm text-slate-500">高效管理群众诉求，提升服务质量</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {statItems.map((item) => (
              <div
                key={item.label}
                className={`px-4 py-2 rounded-lg ring-1 ${item.className}`}
              >
                <div className="text-xs opacity-80">{item.label}</div>
                <div className="text-lg font-bold">{item.value}</div>
              </div>
            ))}
            <div className="h-8 w-px bg-slate-200 mx-1"></div>
            <div className="px-4 py-2 rounded-lg ring-1 bg-red-50 text-red-700 ring-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <div>
                <div className="text-xs opacity-80">已超期</div>
                <div className="text-lg font-bold">{overdueCount.overdue}</div>
              </div>
            </div>
            <div className="px-4 py-2 rounded-lg ring-1 bg-amber-50 text-amber-700 ring-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <div>
                <div className="text-xs opacity-80">即将超期</div>
                <div className="text-lg font-bold">{overdueCount.warning}</div>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 mx-1"></div>

            <div className="relative" ref={roleMenuRef}>
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ring-1 transition-colors ${getRoleColorClass(currentRole)}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getRoleIconBg(currentRole)}`}>
                  {currentRole === 'admin' ? (
                    <Shield className="w-3.5 h-3.5" />
                  ) : (
                    <User className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="text-left">
                  <div className="text-xs opacity-80">当前角色</div>
                  <div className="text-sm font-bold">{ROLE_LABELS[currentRole]}</div>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showRoleMenu ? 'rotate-180' : ''}`} />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl ring-1 ring-slate-200 z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <div className="text-sm font-semibold text-slate-700">切换角色</div>
                    <div className="text-xs text-slate-500 mt-0.5">选择不同角色体验不同权限</div>
                  </div>
                  <div className="p-2">
                    {roles.map((role) => (
                      <button
                        key={role}
                        onClick={() => {
                          onRoleChange(role);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          currentRole === role
                            ? 'bg-blue-50 ring-1 ring-blue-200'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${getRoleIconBg(role)}`}>
                            {role === 'admin' ? (
                              <Shield className="w-4.5 h-4.5" />
                            ) : (
                              <User className="w-4.5 h-4.5" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-slate-800">
                              {ROLE_LABELS[role]}
                              {currentRole === role && (
                                <span className="ml-2 text-xs text-blue-600">当前</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {ROLE_DESCRIPTIONS[role]}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 pl-12">
                          <div className="text-xs text-slate-400 mb-1">可用权限：</div>
                          <div className="flex flex-wrap gap-1">
                            {getRolePermissions(role).slice(0, 4).map((perm) => (
                              <span
                                key={perm}
                                className="inline-block px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded"
                              >
                                {getPermissionLabel(perm)}
                              </span>
                            ))}
                            {getRolePermissions(role).length > 4 && (
                              <span className="inline-block px-1.5 py-0.5 text-[10px] text-slate-400">
                                +{getRolePermissions(role).length - 4} 项
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
