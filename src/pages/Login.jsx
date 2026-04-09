import React, { useState } from 'react';
import { User, ChevronRight, UserPlus, X, Lock, Building, CheckCircle, ArrowRight, LayoutDashboard, Database, Cpu } from 'lucide-react';

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
        '스마트 기술 개발팀',
        '디지털 기술 연구팀',
        '인프라 BIM팀',
        'AI 응용팀'
    ];

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        const trimmedName = loginName.trim();
        const trimmedPassword = loginPassword.trim();

        if (!trimmedName || !trimmedPassword) {
            setErrorMsg('이름과 비밀번호를 모두 입력해주세요.');
            return;
        }

        if (onLoginAttempt) {
            const result = await onLoginAttempt(trimmedName, trimmedPassword);
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
        <div className="min-h-screen w-full flex overflow-hidden bg-white">
            {/* ─── Left Side: Brand Visual (60%) ─── */}
            <div className="hidden lg:flex lg:w-[60%] relative bg-black overflow-hidden flex-col justify-between p-12 text-white">
                {/* Background Animation Layers */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(0,146,69,0.15),transparent_50%)] animate-pulse-glow" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(140,198,63,0.1),transparent_40%)]" />
                <div className="absolute top-0 right-0 p-20 opacity-20 transform translate-x-1/3 -translate-y-1/3">
                    <div className="w-96 h-96 rounded-full border border-white/10 animate-float" />
                    <div className="absolute inset-0 w-64 h-64 m-auto rounded-full border border-dashed border-white/20 animate-spin-slow" style={{ animationDuration: '20s' }} />
                </div>

                {/* Brand Content */}
                <div className="relative z-10 animate-fade-in slide-in-from-left-8 duration-700">
                    <div className="mb-8">
                        <img src="/KH_RnD_W.png" alt="KH-R&D Platform" className="h-10 md:h-12 w-auto object-contain opacity-90" />
                    </div>
                </div>

                <div className="relative z-10 max-w-2xl animate-fade-in slide-in-from-bottom-8 duration-700 delay-100">
                    <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6 break-keep">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-kh-lime to-kh-green">업무 기록과 주간 회의를</span> <br />
                        <span className="opacity-90">하나의 시스템으로.</span>
                    </h1>
                    <p className="text-lg text-gray-400 leading-relaxed max-w-lg break-keep">
                        부서 내 개인별 업무 기록과 주간공정회의를 통합 관리합니다.<br />
                        업무 현황을 체계적으로 정리하고 원활하게 공유하세요.
                    </p>

                    <div className="flex gap-3 mt-10">
                        <div className="px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm text-sm font-medium text-gray-300">
                            업무 기록 관리
                        </div>
                        <div className="px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm text-sm font-medium text-gray-300">
                            주간공정회의
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-xs text-gray-500 font-mono">
                    © 2026 KUNHWA ENGINEERING & CONSULTING. All rights reserved.
                </div>
            </div>

            {/* ─── Right Side: Login Form (40%) ─── */}
            <div className="w-full lg:w-[40%] flex flex-col justify-center items-center p-8 lg:p-12 relative bg-white">
                <div className="w-full max-w-sm animate-fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-10">
                        <img src="/KH_RnD.png" alt="Kunhwa Logo" className="h-[40px] mb-6 block lg:hidden" />
                        <h2 className="text-3xl font-bold text-kh-text-main mb-2">Welcome back</h2>
                        <p className="text-gray-500">계정에 로그인하여 업무를 시작하세요.</p>
                    </div>

                    <form onSubmit={handleLoginSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="group">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1 group-focus-within:text-kh-green transition-colors">ID (Name)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={loginName}
                                        onChange={(e) => setLoginName(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-kh-text-main focus:bg-white focus:border-kh-green focus:ring-4 focus:ring-kh-green/10 focus:outline-none placeholder:text-gray-300 transition-all pl-11 font-medium"
                                        placeholder="이름을 입력하세요"
                                        autoFocus
                                    />
                                    <User className="absolute left-3.5 top-3.5 text-gray-400 group-focus-within:text-kh-green transition-colors" size={20} />
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1 group-focus-within:text-kh-green transition-colors">Password</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-kh-text-main focus:bg-white focus:border-kh-green focus:ring-4 focus:ring-kh-green/10 focus:outline-none placeholder:text-gray-300 transition-all pl-11 font-medium"
                                        placeholder="비밀번호(사번)를 입력하세요"
                                    />
                                    <Lock className="absolute left-3.5 top-3.5 text-gray-400 group-focus-within:text-kh-green transition-colors" size={20} />
                                </div>
                            </div>
                        </div>

                        {errorMsg && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-2 animate-shake">
                                <span className="text-red-500 mt-0.5"><X size={14} /></span>
                                <p className="text-xs text-red-600 font-medium">{errorMsg}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full py-4 bg-kh-green hover:bg-[#007A3A] text-white rounded-xl font-bold shadow-lg shadow-kh-green/20 transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 group"
                        >
                            <span>로그인</span>
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-400">
                            계정이 없으신가요?{' '}
                            <button
                                onClick={() => setIsSignupModalOpen(true)}
                                className="text-kh-green font-bold hover:underline underline-offset-4 decoration-2 decoration-kh-green/30"
                            >
                                새 계정 만들기
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            {/* ─── Signup Modal ─── */}
            {isSignupModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-0 overflow-hidden animate-in scale-95 duration-300 zoom-in-95">
                        <div className="bg-gray-50 px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-kh-text-main flex items-center gap-2">
                                    <UserPlus className="text-kh-green" size={22} />
                                    회원가입
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">KH-R&D WMS의 새로운 멤버가 되어주세요.</p>
                            </div>
                            <button onClick={() => setIsSignupModalOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8">
                            <form onSubmit={handleSubmitNewUser} className="space-y-5">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">이름</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="이름 (예: 홍길동)"
                                                value={newName}
                                                onChange={e => setNewName(e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-3 py-3 text-sm text-kh-text-main focus:border-kh-green focus:ring-4 focus:ring-kh-green/5 focus:outline-none transition-all placeholder:text-gray-300"
                                                required
                                            />
                                            <User className="absolute left-3 top-3 text-gray-400" size={18} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">소속 팀</label>
                                        <div className="relative">
                                            <select
                                                value={newDept}
                                                onChange={e => setNewDept(e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-3 py-3 text-sm text-kh-text-main focus:border-kh-green focus:ring-4 focus:ring-kh-green/5 focus:outline-none appearance-none cursor-pointer transition-all"
                                                required
                                            >
                                                <option value="" disabled className="text-gray-300">부서 선택</option>
                                                {DEPARTMENTS.map(dept => (
                                                    <option key={dept} value={dept}>
                                                        {dept}
                                                    </option>
                                                ))}
                                            </select>
                                            <Building className="absolute left-3 top-3 text-gray-400" size={18} />
                                            <ChevronRight className="absolute right-3 top-3 text-gray-400 rotate-90" size={16} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">비밀번호 설정</label>
                                        <div className="relative">
                                            <input
                                                type="password"
                                                placeholder="비밀번호를 입력하세요"
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-3 py-3 text-sm text-kh-text-main focus:border-kh-green focus:ring-4 focus:ring-kh-green/5 focus:outline-none transition-all placeholder:text-gray-300"
                                                required
                                            />
                                            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsSignupModalOpen(false)}
                                        className="flex-1 py-3 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-colors font-semibold border border-gray-200"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 text-sm bg-kh-green text-white hover:bg-[#007A3A] rounded-xl transition-colors font-bold shadow-lg shadow-kh-green/20 flex items-center justify-center"
                                    >
                                        <CheckCircle size={18} className="mr-2" />
                                        계정 생성 완료
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
