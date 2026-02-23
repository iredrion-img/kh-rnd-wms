import React, { useState } from 'react';
import { LayoutDashboard, Clock, Users, FileBarChart, CheckSquare, LogOut, UserPlus, ChevronRight, User, Settings, Edit2, Trash2, X, ChevronLeft, LogIn, MoreHorizontal } from 'lucide-react';

const Sidebar = ({ activeTab, onTabChange, currentUser, employees, onLogin, onLoginAttempt, onLogout, onAddEmployee, onUpdateEmployee, onDeleteEmployee }) => {
    // Modal States
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    const [editingUser, setEditingUser] = useState(null); // ID of user being edited
    const [editName, setEditName] = useState('');
    const [editDept, setEditDept] = useState('');
    const [editPassword, setEditPassword] = useState('');

    const DEPARTMENTS = [
        'R&D센터',
        '기술연구소',
        '스마트기술개발팀',
        '디지털기술연구팀',
        '인프라BIM팀',
        'AI응용팀'
    ];

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', subLabel: '대시보드', icon: LayoutDashboard },
        { id: 'weekly-meeting', label: 'Weekly Meeting', subLabel: '주간공정회의', icon: Users },
        { id: 'timesheet', label: 'Timesheet', subLabel: '업무 기록', icon: Clock },
    ];

    // Handler to open edit mode for a user
    const startEdit = (user) => {
        setEditingUser(user.id);
        setEditName(user.name);
        setEditDept(user.department);
        setEditPassword('');
    };

    // Handler to save edit
    const saveEdit = (user) => {
        if (editName && editDept) {
            onUpdateEmployee(user.id, editName, editDept, editPassword);
            setEditingUser(null);
        }
    };

    return (
        <>
            <div className="w-64 h-full bg-[#1A1D21] text-white flex flex-col fixed left-0 top-0 border-r border-white/5 z-50 shadow-2xl">
                {/* ─── Logo Section ─── */}
                <div className="h-20 flex items-center px-6 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent">
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold tracking-wider text-white flex items-center gap-2">
                            <span className="w-2 h-6 bg-kh-lime rounded-full shadow-[0_0_10px_rgba(140,198,63,0.5)]"></span>
                            KH-R&D WMS
                        </h1>
                        <p className="text-[10px] text-gray-500 ml-4 tracking-widest uppercase mt-0.5">Workforce Management</p>
                    </div>
                </div>

                {/* ─── Navigation ─── */}
                <nav className="flex-1 py-8 px-4 space-y-2">
                    <p className="px-4 text-xs font-bold text-gray-600 uppercase tracking-widest mb-4">Menu</p>
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={`w-full flex items-center group relative px-4 py-3.5 rounded-xl transition-all duration-300 overflow-hidden
                                    ${isActive
                                        ? 'bg-gradient-to-r from-kh-green/20 to-transparent text-white shadow-lg shadow-kh-green/5 ring-1 ring-white/5'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-kh-lime shadow-[0_0_15px_#8CC63F]" />
                                )}
                                <Icon size={20} className={`mr-3 transition-colors ${isActive ? 'text-kh-lime' : 'text-gray-500 group-hover:text-white'}`} />
                                <div className="text-left">
                                    <span className={`block text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                                        {item.label}
                                    </span>
                                    <span className="block text-[10px] text-gray-600 font-medium group-hover:text-gray-500">
                                        {item.subLabel}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </nav>

                {/* ─── User Profile ─── */}
                <div className="p-4 bg-gradient-to-t from-black/40 to-transparent border-t border-white/5">
                    <div className="relative group">
                        <button
                            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left"
                        >
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-kh-green to-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-black/50">
                                {currentUser?.name ? currentUser.name[0] : '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{currentUser?.name}</p>
                                <p className="text-xs text-gray-400 truncate">{currentUser?.department}</p>
                            </div>
                            <MoreHorizontal size={16} className="text-gray-500" />
                        </button>

                        {/* Dropdown Menu (Simple implementation) */}
                        {isProfileMenuOpen && (
                            <div className="absolute bottom-full left-0 w-full mb-2 bg-[#25282B] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
                                <button
                                    onClick={() => { setIsManageModalOpen(true); setIsProfileMenuOpen(false); }}
                                    className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                                >
                                    <Settings size={14} />
                                    <span>멤버 관리</span>
                                </button>
                                <div className="h-px bg-white/5 my-0"></div>
                                <button
                                    onClick={onLogout}
                                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2"
                                >
                                    <LogOut size={14} />
                                    <span>로그아웃</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Management Modal */}
                {isManageModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 text-dark animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-6 border-b pb-4 border-gray-100">
                                <div>
                                    <h3 className="text-xl font-bold text-kh-text-main flex items-center">
                                        <Settings className="mr-2 text-kh-green" size={24} />
                                        멤버 관리
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">직원 정보를 수정하거나 삭제합니다.</p>
                                </div>
                                <button onClick={() => setIsManageModalOpen(false)} className="text-gray-400 hover:text-dark transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {employees.map(emp => (
                                    <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md hover:border-gray-200 border border-transparent transition-all group">
                                        {editingUser === emp.id ? (
                                            // Edit Mode
                                            <div className="flex items-center w-full space-x-2">
                                                <div className="flex-1 space-y-2">
                                                    <input
                                                        type="text"
                                                        value={editName}
                                                        onChange={e => setEditName(e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-kh-green focus:ring-1 focus:ring-kh-green focus:outline-none"
                                                        placeholder="이름"
                                                        autoFocus
                                                    />
                                                    <select
                                                        value={editDept}
                                                        onChange={e => setEditDept(e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-kh-green focus:ring-1 focus:ring-kh-green focus:outline-none"
                                                    >
                                                        <option value="" disabled>부서 선택</option>
                                                        {DEPARTMENTS.map(dept => (
                                                            <option key={dept} value={dept}>
                                                                {dept}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <button
                                                        onClick={() => saveEdit(emp)}
                                                        className="p-2 bg-kh-green text-white rounded-lg hover:bg-green-600 shadow-sm transition-colors"
                                                        title="저장"
                                                    >
                                                        <CheckSquare size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingUser(null)}
                                                        className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
                                                        title="취소"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            // View Mode
                                            <>
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-kh-lime shadow-sm">
                                                        {emp.name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-kh-text-main">{emp.name}</p>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-kh-green"></span>
                                                            <p className="text-xs text-gray-500">{emp.department}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => startEdit(emp)}
                                                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="수정"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => onDeleteEmployee(emp.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="삭제"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                                {employees.length === 0 && (
                                    <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <Users className="mx-auto text-gray-300 mb-2" size={32} />
                                        <p className="text-gray-400 text-sm">등록된 직원이 없습니다.</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                                <button
                                    onClick={() => setIsManageModalOpen(false)}
                                    className="px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black transition-all shadow-lg shadow-black/10 text-sm font-bold"
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default Sidebar;
