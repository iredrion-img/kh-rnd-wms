import React, { useState } from 'react';
import { User, ChevronLeft, UserPlus, X, Lock, Building, CheckCircle } from 'lucide-react';

const Login = ({ employees = [], onLoginAttempt, onSignup }) => {
    const [loginName, setLoginName] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Signup States
    const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDept, setNewDept] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const DEPARTMENTS = [
        'R&D센터',
        '기술연구소',
        '스마트기술개발팀',
        '디지털기술연구팀',
        '인프라BIM팀',
        'AI응용팀'
    ];

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        if (!loginName || !loginPassword) return;

        // Trim input
        const cleanName = loginName.trim();

        // Find user by name
        const user = employees.find(e => e.name === cleanName);

        if (!user) {
            // Try lenient check (ignore spaces entirely)
            const lenientUser = employees.find(e => e.name.replace(/\s+/g, '') === cleanName.replace(/\s+/g, ''));
            if (lenientUser) {
                // Found matches strictly ignoring spaces, but maybe exact match failed?
                // Suggest this user?
                // For now, let's just use it to be user-friendly
                // const result = await onLoginAttempt(lenientUser.id, loginPassword);
                // ... better to stick to strict but trimmed
            }

            setErrorMsg('존재하지 않는 사용자입니다. (오타 또는 띄어쓰기를 확인하세요)');
            return;
        }

        if (onLoginAttempt) {
            const result = await onLoginAttempt(user.id, loginPassword);
            if (!result.success) {
                setErrorMsg(result.message);
                setLoginPassword('');
            }
        }
    };

    const handleSubmitNewUser = async (e) => {
        e.preventDefault();
        if (newName && newDept && newPassword) {
            await onSignup(newName.trim(), newDept, newPassword);
            setNewName('');
            setNewDept('');
            setNewPassword('');
            setIsSignupModalOpen(false);
            alert('계정이 생성되었습니다. 로그인해주세요.');
        } else {
            alert('모든 정보를 입력해주세요.');
        }
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo / Header */}
                <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
                    <img src="/KH_RnD_W.png" alt="Kunhwa Logo" className="h-[60px] mx-auto mb-6 drop-shadow-2xl" />
                    <h1 className="text-3xl font-bold text-white tracking-wide mb-2">통합 업무 관리 시스템</h1>
                </div>

                {/* Login Card */}
                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-300">
                    <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">ID (이름)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={loginName}
                                        onChange={(e) => setLoginName(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-gray-600 transition-all pl-10"
                                        placeholder="이름을 입력하세요"
                                        autoFocus
                                    />
                                    <User className="absolute left-3 top-3.5 text-gray-600" size={18} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">비밀번호 (사번)</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-gray-600 transition-all pl-10"
                                        placeholder="비밀번호를 입력하세요"
                                    />
                                    <Lock className="absolute left-3 top-3.5 text-gray-600" size={18} />
                                </div>
                                {errorMsg && (
                                    <p className="text-red-400 text-xs mt-2 ml-1 animate-in slide-in-from-top-1">{errorMsg}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                로그인
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 pt-6 border-t border-white/10">
                        <button
                            onClick={() => setIsSignupModalOpen(true)}
                            className="w-full py-3 flex items-center justify-center space-x-2 bg-primary/20 hover:bg-primary/30 text-primary hover:text-white rounded-xl transition-all border border-primary/20 hover:border-primary/40 font-medium"
                        >
                            <UserPlus size={18} />
                            <span>새 계정 만들기</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Signup Modal */}
            {isSignupModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200 text-dark">
                        <div className="flex items-center justify-between mb-6 border-b pb-4 border-gray-100">
                            <div>
                                <h3 className="text-xl font-bold text-dark flex items-center">
                                    <UserPlus className="mr-2 text-primary" size={24} />
                                    회원가입
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">새로운 계정을 생성합니다.</p>
                            </div>
                            <button onClick={() => setIsSignupModalOpen(false)} className="text-gray-400 hover:text-dark transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitNewUser} className="space-y-4">
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">이름</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="이름 (예: 홍길동)"
                                            value={newName}
                                            onChange={e => setNewName(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-3 py-2.5 text-sm text-dark focus:border-primary focus:outline-none placeholder:text-gray-400 transition-colors"
                                            required
                                        />
                                        <User className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">비밀번호</label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            placeholder="비밀번호"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-3 py-2.5 text-sm text-dark focus:border-primary focus:outline-none placeholder:text-gray-400 transition-colors"
                                            required
                                        />
                                        <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">소속 팀</label>
                                    <div className="relative">
                                        <select
                                            value={newDept}
                                            onChange={e => setNewDept(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-3 py-2.5 text-sm text-dark focus:border-primary focus:outline-none appearance-none cursor-pointer transition-colors"
                                            required
                                        >
                                            <option value="" disabled className="text-gray-400">부서 선택</option>
                                            {DEPARTMENTS.map(dept => (
                                                <option key={dept} value={dept}>
                                                    {dept}
                                                </option>
                                            ))}
                                        </select>
                                        <Building className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsSignupModalOpen(false)}
                                    className="flex-1 py-3 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium border border-transparent"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 text-sm bg-primary text-white hover:bg-primary-dark rounded-xl transition-colors font-bold shadow-lg shadow-primary/20 flex items-center justify-center"
                                >
                                    <CheckCircle size={18} className="mr-2" />
                                    계정 생성
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
