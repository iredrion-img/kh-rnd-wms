import React, { useState } from 'react';
import { LayoutDashboard, Clock, Users, FileBarChart, CheckSquare, LogOut, UserPlus, ChevronRight, User, Settings, Edit2, Trash2, X, ChevronLeft, LogIn } from 'lucide-react';

const Sidebar = ({ activeTab, onTabChange, currentUser, employees, onLogin, onLoginAttempt, onLogout, onAddEmployee, onUpdateEmployee, onDeleteEmployee }) => {
    // Modal States
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);

    const [editingUser, setEditingUser] = useState(null); // ID of user being edited
    const [editName, setEditName] = useState('');
    const [editDept, setEditDept] = useState('');

    const DEPARTMENTS = [
        'R&D센터',
        '기술연구소',
        '스마트기술개발팀',
        '디지털기술연구팀',
        '인프라BIM팀',
        'AI응용팀'
    ];

    const menuItems = [
        { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
        { id: 'timesheet', label: '업무 기록', icon: Clock },
        // Removed 'team' and 'reports' as requested
    ];



    // Handler to open edit mode for a user
    const startEdit = (user) => {
        setEditingUser(user.id);
        setEditName(user.name);
        setEditDept(user.department);
    };

    // Handler to save edit
    const saveEdit = (user) => {
        if (editName && editDept) {
            onUpdateEmployee(user.id, editName, editDept);
            setEditingUser(null);
        }
    };

    return (
        <div className="w-64 h-screen bg-dark text-white flex flex-col fixed left-0 top-0 border-r border-neutral/20 z-50">
            <div className="p-6 border-b border-neutral/20">
                <h1 className="text-xl font-bold tracking-wider text-white">KH-R&D WMS</h1>
                <p className="text-xs text-neutral-400 mt-1">통합 업무 관리 시스템</p>
            </div>

            <nav className="flex-1 py-6 space-y-2 px-3">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group
                ${isActive
                                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <Icon size={20} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'} />
                            <span className="font-medium text-sm">{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Login / Profile Window */}
            <div className="p-4 border-t border-neutral/20 bg-black/20">
                <div className="flex flex-col space-y-3">
                    <div className="flex items-center space-x-3 px-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-primary/30">
                            {currentUser?.name ? currentUser.name[0] : '?'}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-bold text-white truncate">{currentUser?.name}</p>
                            <p className="text-xs text-gray-400 truncate">{currentUser?.department}</p>
                        </div>
                        {/* Manage Button */}
                        <button
                            onClick={() => setIsManageModalOpen(true)}
                            className="text-gray-500 hover:text-white transition-colors"
                            title="멤버 관리"
                        >
                            <Settings size={16} />
                        </button>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center space-x-2 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10"
                    >
                        <LogOut size={14} />
                        <span>로그아웃</span>
                    </button>
                </div>
            </div>

            {/* Management Modal */}
            {isManageModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200 text-dark">
                        <div className="flex items-center justify-between mb-6 border-b pb-4 border-gray-100">
                            <div>
                                <h3 className="text-xl font-bold text-dark flex items-center">
                                    <Settings className="mr-2 text-primary" size={24} />
                                    멤버 관리
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">직원 정보를 수정하거나 삭제합니다.</p>
                            </div>
                            <button onClick={() => setIsManageModalOpen(false)} className="text-gray-400 hover:text-dark transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                            {employees.map(emp => (
                                <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                                    {editingUser === emp.id ? (
                                        // Edit Mode
                                        <div className="flex items-center w-full space-x-2">
                                            <div className="flex-1 space-y-2">
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    className="w-full px-2 py-1 text-sm border rounded"
                                                    placeholder="이름"
                                                    autoFocus
                                                />
                                                <select
                                                    value={editDept}
                                                    onChange={e => setEditDept(e.target.value)}
                                                    className="w-full px-2 py-1 text-sm border rounded"
                                                >
                                                    <option value="" disabled>부서 선택</option>
                                                    {DEPARTMENTS.map(dept => (
                                                        <option key={dept} value={dept}>
                                                            {dept}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex flex-col space-y-1">
                                                <button
                                                    onClick={() => saveEdit(emp)}
                                                    className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
                                                    title="저장"
                                                >
                                                    <CheckSquare size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setEditingUser(null)}
                                                    className="p-2 bg-gray-300 text-gray-600 rounded hover:bg-gray-400"
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
                                                <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-primary">
                                                    {emp.name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-dark">{emp.name}</p>
                                                    <p className="text-xs text-gray-500">{emp.department}</p>
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
                                <p className="text-center text-gray-400 py-8">등록된 직원이 없습니다.</p>
                            )}

                            {/* Add User inside Modal */}
                            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                                <p className="text-xs text-gray-400">새 직원은 회원가입 기능을 통해 추가해주세요.</p>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setIsManageModalOpen(false)}
                                className="px-4 py-2 bg-dark text-white rounded-lg hover:bg-black transition-colors text-sm font-medium"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )
            }


        </div>
    );
};

export default Sidebar;
