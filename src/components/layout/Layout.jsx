import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children, activeTab, onTabChange, currentUser, employees, onLogin, onLogout, onAddEmployee, onUpdateEmployee, onDeleteEmployee }) => {
    return (
        // [변경 핵심]: 전체 화면 고정, 스크롤 금지, Flex 배열
        <div className="flex h-screen w-screen overflow-hidden bg-[#121415] text-dark font-sans text-base">

            {/* 1. 사이드바 영역 */}
            <Sidebar
                activeTab={activeTab}
                onTabChange={onTabChange}
                currentUser={currentUser}
                employees={employees}
                onLogin={onLogin}
                onLogout={onLogout}
                onAddEmployee={onAddEmployee}
                onUpdateEmployee={onUpdateEmployee}
                onDeleteEmployee={onDeleteEmployee}
            />

            {/* 2. 메인 콘텐츠 영역 (Dashboard 렌더링) */}
            {/* [변경 핵심]: flex-1로 남은 공간 모두 차지, min-w-0으로 내부 요소 삐져나옴 방지 */}
            <main className="flex-1 min-w-0 h-full overflow-hidden relative">
                <div className="h-full w-full">
                    {children}
                </div>
            </main>

        </div>
    );
};

export default Layout;
