import React, { useState } from 'react';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Timesheet from './pages/Timesheet';
import Login from './pages/Login';
import WeeklyMeeting from './pages/WeeklyMeeting';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Check URL API endpoint
  // Check URL API endpoint
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
  const handleUpdateEmployee = async (id, name, department) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, department })
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
  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
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
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'weekly-meeting':
        return <WeeklyMeeting />;
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
      onTabChange={setActiveTab}
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
    </Layout>
  );
}

export default App;
