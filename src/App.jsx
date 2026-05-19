import React, { useState } from 'react';
import ChatModal from './components/chat/ChatModal';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Timesheet from './pages/Timesheet';
import Login from './pages/Login';
import WeeklyMeeting from './pages/WeeklyMeeting';
import StatusBoard from './components/dashboard/StatusBoard';
import { Trash2 } from 'lucide-react';


function App() {
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '');
    if (['dashboard', 'status', 'weekly', 'timesheet'].includes(hash)) return hash;
    return localStorage.getItem('kh_active_tab') || 'dashboard';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isChatModalOpen, setChatModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // API endpoint
  const API_URL = '/api/users';

  // Global State for User Management
  const [employees, setEmployees] = useState([]);

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('kh_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Fetch Logic
  const fetchEmployees = async () => {
    try {
      const res = await fetch(API_URL);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);

        // Update currentUser if outdated
        if (currentUser) {
          const found = data.find(e => e.id === currentUser.id);
          if (found) {
            // If user details changed, update local persistence
            if (found.name !== currentUser.name || found.department !== currentUser.department) {
              setCurrentUser(found);
            }
          } else {
            // User deleted remotely? Logout or keep as ghost?
            // Let's keep distinct to avoid sudden logout, but maybe warn?
            // For now, simple logic: do nothing, data is source of truth.
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  // Initial Load
  React.useEffect(() => {
    fetchEmployees();
  }, []);

  // Persist Current User
  React.useEffect(() => {
    if (currentUser) {
      localStorage.setItem('kh_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('kh_current_user');
    }
  }, [currentUser]);

  const handleLogin = (user) => setCurrentUser(user);
  const handleLogout = () => setCurrentUser(null);

  const handleLoginAttempt = async (name, password) => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentUser(data.user);
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (err) {
      return { success: false, message: 'Server error' };
    }
  };

  // Add User
  const handleAddEmployee = async (name, department, password) => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, department, password })
      });
      if (res.ok) {
        const { user } = await res.json();
        setEmployees(prev => [...prev, user]);
        setCurrentUser(user); // Auto login
      }
    } catch (err) {
      alert('사용자 추가 실패');
    }
  };

  // Update User
  const handleUpdateEmployee = async (id, name, department, password) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, department, password })
      });
      if (res.ok) {
        fetchEmployees(); // Refresh list to get clean state
        if (currentUser && currentUser.id === id) {
          setCurrentUser(prev => ({ ...prev, name, department }));
        }
      }
    } catch (err) {
      alert('수정 실패');
    }
  };

  // Delete User
  const handleDeleteEmployee = (id) => {
    setUserToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteEmployee = async () => {
    if (!userToDelete) return;
    const id = userToDelete;
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setEmployees(prev => prev.filter(e => e.id !== id));
        if (currentUser && currentUser.id === id) {
          handleLogout(); // Logout if self deleted
        }
      }
    } catch (err) {
      alert('삭제 실패');
    } finally {
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  // Sync hash with activeTab changes
  React.useEffect(() => {
    if (activeTab && activeTab !== 'chatbot') {
      window.location.hash = activeTab;
      localStorage.setItem('kh_active_tab', activeTab);
    }
  }, [activeTab]);

  // Sync activeTab with browser back/forward buttons
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['dashboard', 'status', 'weekly', 'timesheet'].includes(hash) && hash !== activeTab) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

  // Intercept tab changes: chatbot opens modal, others switch page
  const handleTabChange = (tab) => {
    if (tab === 'chatbot') {
      setChatModalOpen(true);
      // Don't change activeTab — keep showing current page behind modal
    } else {
      setChatModalOpen(false);
      setActiveTab(tab);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard currentUser={currentUser} />;
      case 'status':
        return <StatusBoard currentUser={currentUser} isModal={false} />;
      case 'weekly':
        return <WeeklyMeeting currentUser={currentUser} />;
      case 'timesheet':
        return <Timesheet currentUser={currentUser} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
            <div className="text-6xl mb-4">🚧</div>
            <h3 className="text-xl font-medium">Coming Soon</h3>
            <p className="mt-2 text-sm">This module is under development.</p>
          </div>
        );
    }
  };

  if (!currentUser) {
    return (
      <Login
        employees={employees}
        onLoginAttempt={handleLoginAttempt}
        onSignup={handleAddEmployee}
      />
    );
  }

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      currentUser={currentUser}
      employees={employees}
      onLogin={handleLogin}
      onLoginAttempt={handleLoginAttempt}
      onLogout={handleLogout}
      onAddEmployee={handleAddEmployee}
      onUpdateEmployee={handleUpdateEmployee}
      onDeleteEmployee={handleDeleteEmployee}
    >
      {renderContent()}
      <ChatModal
        isOpen={isChatModalOpen}
        onClose={() => setChatModalOpen(false)}
        currentUser={currentUser}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm transform animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">사용자 삭제</h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                정말 이 사용자를 삭제하시겠습니까?<br/>이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button 
                  onClick={confirmDeleteEmployee}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-200"
                >
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default App;
