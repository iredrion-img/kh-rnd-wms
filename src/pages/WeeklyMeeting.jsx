import React, { useState, useEffect } from 'react';
import TaskTable from '../components/weeklyMeeting/TaskTable';
import TaskFormModal from '../components/weeklyMeeting/TaskFormModal';
import WeekNavigator from '../components/weeklyMeeting/WeekNavigator';
import { Settings, Plus, FileSpreadsheet } from 'lucide-react';

const TEAM_TABS = [
  '공지사항',
  '공통업무&행정',
  '스마트 기술 개발팀',
  '디지털 기술 연구팀',
  '인프라 BIM팀',
  'AI 응용팀',
  '연구과제',
  '프로젝트 추진 및 수행 현황',
  '주간일정'
];

// 이번 주 월요일 구하기
const getThisMonday = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
};

const WeeklyMeeting = ({ currentUser }) => {
  const [activeTeam, setActiveTeam] = useState(TEAM_TABS[0]);
  const [tasks, setTasks] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(getThisMonday());
  const [availableWeeks, setAvailableWeeks] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    fetchAvailableWeeks();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [activeTeam, currentWeek]);

  const fetchAvailableWeeks = async () => {
    try {
      const res = await fetch('/api/weekly-tasks/weeks');
      const weeks = await res.json();
      setAvailableWeeks(weeks);
    } catch (e) {
      console.error('Failed to fetch weeks:', e);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let url = '';
      if (activeTeam === '프로젝트 추진 및 수행 현황') {
        url = `/api/projects`;
      } else if (activeTeam === '주간일정') {
        url = `/api/weekly-schedule?week=${currentWeek}`;
      } else {
        url = `/api/weekly-tasks?week=${currentWeek}&team=${encodeURIComponent(activeTeam)}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch tasks:', e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (task = null) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (taskData) => {
    try {
      const isProject = activeTeam === '프로젝트 추진 및 수행 현황';
      const isSchedule = activeTeam === '주간일정';
      
      let url = '/api/weekly-tasks';
      if (isProject) url = '/api/projects';
      else if (isSchedule) url = '/api/weekly-schedule';

      if (editingTask) url += `/${editingTask.id}`;

      const res = await fetch(url, {
        method: editingTask ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...taskData, team: activeTeam })
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchTasks();
        if (!editingTask && !isProject && !isSchedule) fetchAvailableWeeks();
      } else {
        alert('저장에 실패했습니다.');
      }
    } catch (e) {
      console.error(e);
      alert('오류가 발생했습니다.');
    }
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      const isProject = activeTeam === '프로젝트 추진 및 수행 현황';
      const isSchedule = activeTeam === '주간일정';
      
      let url = `/api/weekly-tasks/${task.id}`;
      if (isProject) url = `/api/projects/${task.id}`;
      else if (isSchedule) url = `/api/weekly-schedule/${task.id}`;

      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        fetchTasks();
      } else {
        alert('삭제에 실패했습니다.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col bg-gray-50/50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <FileSpreadsheet className="w-8 h-8 text-primary" />
            주간공정회의록
          </h1>
          <p className="text-sm text-gray-500 mt-1 ml-10">팀별 주간 업무 현황을 관리하고 공유합니다.</p>
        </div>
        
        <WeekNavigator 
          currentWeek={currentWeek} 
          onWeekChange={setCurrentWeek} 
          availableWeeks={availableWeeks}
          isAdmin={isAdmin}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
        {TEAM_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTeam(tab)}
            className={`px-5 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all duration-200 border
              ${activeTeam === tab 
                ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 hover:bg-primary-dark cursor-default' 
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col overflow-hidden">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">{activeTeam} 상세 현황</h2>
          
          <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary to-primary-light text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              업무 추가
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              <Settings className="w-8 h-8 animate-spin mr-2" /> 로딩 중...
            </div>
          ) : (
            <TaskTable 
              tasks={tasks} 
              team={activeTeam} 
              onEdit={handleOpenModal} 
              onDelete={handleDeleteTask}
              currentUser={currentUser}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </div>

      {isModalOpen && (
        <TaskFormModal
          team={activeTeam}
          task={editingTask}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTask}
          currentWeek={currentWeek}
        />
      )}
    </div>
  );
};

export default WeeklyMeeting;
