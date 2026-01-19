import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children, activeTab, onTabChange, currentUser, employees, onLogin, onLogout, onAddEmployee, onUpdateEmployee, onDeleteEmployee }) => {
    return (
        <div className="min-h-screen bg-background text-dark font-sans flex text-base">
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
            <main className="flex-1 ml-64 p-4 md:p-8 overflow-y-auto h-screen bg-background min-w-0">
                <div className="max-w-7xl mx-auto slide-in-bottom">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
