import React, { useState, useEffect, useRef } from 'react';
import TaskTable from '../components/weeklyMeeting/TaskTable';
import TaskFormModal from '../components/weeklyMeeting/TaskFormModal';
import WeekNavigator from '../components/weeklyMeeting/WeekNavigator';
import MeetingOverviewPanel from '../components/weeklyMeeting/MeetingOverviewPanel';
import CirculationBoard from '../components/weeklyMeeting/CirculationBoard';
import PrintableReport from '../components/weeklyMeeting/PrintableReport';
import { useReactToPrint } from 'react-to-print';
import {
  FileSpreadsheet, Plus, Settings, Trash2,
  ChevronDown, ChevronRight,
  LayoutDashboard, Briefcase, Users, FlaskConical, FolderKanban, CalendarRange,
  PanelLeftClose, PanelLeftOpen, Printer, Maximize2, X, ClipboardList
} from 'lucide-react';

// 이번 주 월요일
const getThisMonday = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 트리 메뉴 정의
const TEAM_TABS_FOR_MODAL = [
  '공지사항', '공통업무&행정', '스마트 기술 개발팀', '디지털 기술 연구팀',
  '인프라 BIM팀', 'AI 응용팀', '연구과제', '프로젝트 추진 및 수행 현황', '주간일정'
];

const TREE_MENU = [
  { id: '회의 개요', label: '회의 개요', icon: LayoutDashboard, type: 'overview' },
  { id: '공통업무&행정', label: '공통업무 & 행정', icon: Briefcase, type: 'team' },
  {
    id: '팀별 현황',
    label: '팀별 현황',
    icon: Users,
    type: 'group',
    children: [
      { id: '스마트 기술 개발팀', label: '스마트 기술 개발팀', type: 'team' },
      { id: '디지털 기술 연구팀', label: '디지털 기술 연구팀', type: 'team' },
      { id: '인프라 BIM팀', label: '인프라 BIM팀', type: 'team' },
      { id: 'AI 응용팀', label: 'AI 응용팀', type: 'team' },
    ],
  },
  { id: '연구과제', label: '연구과제', icon: FlaskConical, type: 'team' },
  { id: '프로젝트 추진 및 수행 현황', label: '프로젝트 추진 및 수행 현황', icon: FolderKanban, type: 'team' },
  { id: '주간일정', label: '주간일정', icon: CalendarRange, type: 'team' },
  { id: '회람', label: '회람', icon: ClipboardList, type: 'circulation' },
];

const WeeklyMeeting = ({ currentUser }) => {
  const [activeMenu, setActiveMenu] = useState('회의 개요');
  const [expandedGroups, setExpandedGroups] = useState({ '팀별 현황': true });
  const [tasks, setTasks] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(getThisMonday());
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [modalTeamOverride, setModalTeamOverride] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // PDF 출력 관련 상태
  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState(null);
  const printRef = useRef(null);

  const isAdmin = currentUser?.role === 'admin';
  const isOverview = activeMenu === '회의 개요';
  const isCirculation = activeMenu === '회람';
  const isProject = activeMenu === '프로젝트 추진 및 수행 현황';
  const isSchedule = activeMenu === '주간일정';

  useEffect(() => { fetchAvailableWeeks(); }, []);

  useEffect(() => {
    if (!isOverview && !isCirculation) fetchTasks();
  }, [activeMenu, currentWeek]);

  const fetchAvailableWeeks = async () => {
    try {
      const res = await fetch('/api/weekly-tasks/weeks');
      setAvailableWeeks(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchTasks = async () => {
    setLoading(true);
    setRefreshTrigger(p => p + 1);
    try {
      let url = '';
      if (isProject) url = `/api/projects`;
      else if (isSchedule) url = `/api/weekly-schedule?week=${currentWeek}`;
      else url = `/api/weekly-tasks?week=${currentWeek}&team=${encodeURIComponent(activeMenu)}`;
      const res = await fetch(url);
      const data = await res.json();
      
      let finalData = Array.isArray(data) ? data : [];
      
      // 주간공정회의의 주간일정 탭에서는 '합사', '외출' 일정 자동 숨김 및 정렬
      if (isSchedule) {
        finalData = finalData.filter(s => {
          const type = s.schedule_type || '';
          const cnt = s.content || '';
          return !cnt.includes('외출') && type !== '합사';
        });

        const orderMap = {
          '업무협의': 1, '프로젝트': 2, '부서지원': 3, 'TFT': 4, '대외활동': 5,
          '세미나': 6, '교육': 7, '연구과제': 8, '매뉴얼작성': 9, '행정': 10,
          '기타': 11, '휴가': 12
        };
        finalData.sort((a, b) => {
          const valA = orderMap[a.schedule_type || '기타'] || 99;
          const valB = orderMap[b.schedule_type || '기타'] || 99;
          if (valA !== valB) return valA - valB;
          return (a.start_date || '').localeCompare(b.start_date || '');
        });
      } else if (isProject) {
        const catOrder = { 'AI': 1, 'BIM': 2, 'R&D': 3 };
        finalData.forEach(t => {
          if (t.project_code) t.project_code = t.project_code.replace(/\s*-\s*/g, '-');
        });
        finalData.sort((a, b) => {
          const catA = catOrder[a.category || '기타'] || 99;
          const catB = catOrder[b.category || '기타'] || 99;
          if (catA !== catB) return catA - catB;
          const codeA = a.project_code || a.sub_no || '';
          const codeB = b.project_code || b.sub_no || '';
          return codeA.localeCompare(codeB, 'ko', { numeric: true });
        });
      } else {
        // 일반 팀별 업무 정렬: 1순위 업무코드 오름차순, 2순위 진행 상태 (진행 중 우선)
        const statusOrder = { '진행 중': 1, '완료': 2, '보류': 3 };
        finalData.sort((a, b) => {
          const codeA = a.task_code || 'ZZZ';
          const codeB = b.task_code || 'ZZZ';
          if (codeA !== codeB) {
            return codeA.localeCompare(codeB, 'ko', { numeric: true });
          }
          const stA = statusOrder[a.status] || 99;
          const stB = statusOrder[b.status] || 99;
          if (stA !== stB) return stA - stB;
          return (a.start_date || '').localeCompare(b.start_date || '');
        });
      }
      
      setTasks(finalData);
    } catch (e) { console.error(e); setTasks([]); }
    finally { setLoading(false); }
  };

  const handleMenuClick = (id, type) => {
    if (type === 'group') {
      setExpandedGroups(prev => ({ ...prev, [id]: true }));
      const menuItem = TREE_MENU.find(m => m.id === id);
      if (menuItem?.children?.length > 0) {
        const firstChild = menuItem.children[0];
        if (activeMenu !== firstChild.id) {
          setActiveMenu(firstChild.id);
          setTasks([]);
        }
      }
      return;
    }
    
    if (activeMenu !== id) {
      setActiveMenu(id);
      setTasks([]);
    }
  };

  const handleOpenModal = (task = null) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (taskData) => {
    try {
      const targetTeam = taskData.team || activeMenu;
      const tIsProject = targetTeam === '프로젝트 추진 및 수행 현황';
      const tIsSchedule = targetTeam === '주간일정';
      let url = '/api/weekly-tasks';
      if (tIsProject) url = '/api/projects';
      else if (tIsSchedule) url = '/api/weekly-schedule';
      if (editingTask) url += `/${editingTask.id}`;
      const res = await fetch(url, {
        method: editingTask ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...taskData, team: targetTeam }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchTasks();
        if (!editingTask && !tIsProject && !tIsSchedule) fetchAvailableWeeks();
      } else alert('저장에 실패했습니다.');
    } catch (e) { console.error(e); alert('오류가 발생했습니다.'); }
  };

  const handleDeleteTask = (task) => { setTaskToDelete(task); setShowDeleteConfirm(true); };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      let url = `/api/weekly-tasks/${taskToDelete.id}`;
      if (isProject) url = `/api/projects/${taskToDelete.id}`;
      else if (isSchedule) url = `/api/weekly-schedule/${taskToDelete.id}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) fetchTasks();
      else alert('삭제에 실패했습니다.');
    } catch (e) { alert('오류가 발생했습니다.'); }
    finally { setShowDeleteConfirm(false); setTaskToDelete(null); }
  };

  // ── PDF 인쇄 로직 ──
  const generatePdf = useReactToPrint({
    contentRef: printRef,
    documentTitle: `주간공정회의록_${currentWeek}`,
    onAfterPrint: () => setPrintData(null),
  });

  const handlePrintClick = async () => {
    setIsPrinting(true);
    try {
      const [tasksRes, projRes, scRes, usersRes] = await Promise.all([
        fetch(`/api/weekly-tasks?week=${currentWeek}`),
        fetch(`/api/projects`),
        fetch(`/api/weekly-schedule?week=${currentWeek}`),
        fetch(`/api/users`)
      ]);
      const allTasks = await tasksRes.json();
      const projects = await projRes.json();
      const schedules = await scRes.json();
      const usersList = await usersRes.json();

      const storedMeetingDate = localStorage.getItem(`kh_meeting_date_${currentWeek}`);
      let finalMeetingDate = currentWeek;
      if (storedMeetingDate) {
        finalMeetingDate = storedMeetingDate;
      } else if (currentWeek) {
        const d = new Date(currentWeek);
        d.setDate(d.getDate() + 1);
        finalMeetingDate = d.toISOString().slice(0, 10);
      }

      const storedAbsStr = localStorage.getItem(`kh_attendance_${currentWeek}`);
      let absentees = new Set();
      if (storedAbsStr) {
        try { absentees = new Set(JSON.parse(storedAbsStr)); } catch {}
      }

      const normalizeKey = (str) => (str || '').replace(/\s+/g, '');
      const allUsers = Array.isArray(usersList) ? usersList : [];

      const calcAttending = (keys) => {
        const normKeys = keys.map(normalizeKey);
        const members = allUsers.filter(u => normKeys.includes(normalizeKey(u.department || u.team || '')));
        return members.filter(u => !absentees.has(u.name)).length;
      };

      const rndCnt = calcAttending(['R&D센터', '기술연구소']);
      const smartCnt = calcAttending(['스마트기술개발팀', '스마트 기술 개발팀']);
      const digitalCnt = calcAttending(['디지털기술연구팀', '디지털 기술 연구팀']);
      const infraCnt = calcAttending(['인프라BIM팀', '인프라 BIM팀']);
      const aiCnt = calcAttending(['AI응용팀', 'AI 응용팀']);
      const totalCnt = rndCnt + smartCnt + digitalCnt + infraCnt + aiCnt;

      setPrintData({
        weekLabel: currentWeek,
        meetingDate: finalMeetingDate,
        attendanceCounts: { total: totalCnt, rnd: rndCnt, smart: smartCnt, digital: digitalCnt, infra: infraCnt, ai: aiCnt },
        tasks: Array.isArray(allTasks) ? allTasks : [],
        projects: Array.isArray(projects) ? projects : [],
        schedules: Array.isArray(schedules) ? schedules : []
      });

      setTimeout(() => {
        generatePdf();
        setIsPrinting(false);
      }, 500);
    } catch (e) {
      console.error(e);
      alert('출력 데이터를 불러오는 데 실패했습니다.');
      setIsPrinting(false);
    }
  };

  // ── Tree Item Renderer ──────────────────────────────────────────
  const renderTreeItem = (item, depth = 0) => {
    const isActive = activeMenu === item.id;
    const isExpanded = expandedGroups[item.id];
    const Icon = item.icon;
    const hasChildren = item.children?.length > 0;
    const isGroup = item.type === 'group';
    const isChildActive = isGroup && item.children?.some(c => c.id === activeMenu);

    if (isTreeCollapsed) {
      if (depth > 0) {
        return (
          <div key={item.id} className="w-full flex justify-center py-1">
            <button
              onClick={() => handleMenuClick(item.id, item.type)}
              title={item.label}
              className={`w-10 h-10 rounded-full flex flex-col items-center justify-center text-[11px] font-black transition-all duration-150
                ${isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-primary'}`}
            >
              {item.label.substring(0, 1)}
            </button>
          </div>
        );
      }

      return (
        <div key={item.id} className="flex flex-col items-center w-full mb-2">
          <button
            onClick={() => {
              if (hasChildren) {
                setExpandedGroups(prev => ({ ...prev, [item.id]: !prev[item.id] }));
              }
              handleMenuClick(item.id, item.type);
            }}
            title={item.label}
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-150 cursor-pointer relative
              ${isActive || isChildActive
                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                : 'text-gray-400 hover:bg-gray-100/80 hover:text-primary'}`}
          >
            {Icon ? (
              <Icon size={20} className="flex-none" />
            ) : (
              <span className="text-sm font-bold">{item.label.charAt(0)}</span>
            )}
            {hasChildren && isChildActive && !isActive && (
              <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full border-2 border-primary"></div>
            )}
          </button>
          {hasChildren && isExpanded && (
            <div className="flex flex-col w-full mt-1 space-y-1">
              {item.children.map(child => renderTreeItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const getExpandedButtonStyle = () => {
      if (depth > 0) {
        return isActive
          ? 'bg-primary/10 text-primary font-bold'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900';
      }
      return isActive || isChildActive
        ? 'bg-primary text-white shadow-md shadow-primary/20'
        : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900';
    };

    return (
      <div key={item.id}>
        <button
          onClick={() => handleMenuClick(item.id, item.type)}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group
            ${depth > 0 ? 'pl-8' : ''}
            ${getExpandedButtonStyle()}`}
        >
          {Icon && (
            <Icon
              size={15}
              className={`flex-none transition-colors ${isActive || isChildActive ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`}
            />
          )}
          <span className={`flex-1 text-[13px] leading-snug ${depth > 0 ? 'text-xs' : 'font-medium'}`}>
            {item.label}
          </span>
          {hasChildren && (
            isExpanded
              ? <ChevronDown size={13} className={isActive || isChildActive ? 'text-white/70' : 'text-gray-400'} />
              : <ChevronRight size={13} className={isActive || isChildActive ? 'text-white/70' : 'text-gray-400'} />
          )}
        </button>

        {hasChildren && isExpanded && (
          <div className="mt-1 ml-3 border-l-2 border-gray-100 pl-1 py-1 space-y-0.5 mb-2">
            {item.children.map(child => renderTreeItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // ── Main ────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Top bar */}
      <header className="flex-none flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">주간공정회의록</h1>
            <p className="text-xs text-gray-400">팀별 주간 업무 현황을 관리하고 공유합니다.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsFullscreenMode(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition-all shadow-md"
          >
            <Maximize2 size={16} />
            전체 화면
          </button>
          <button
            onClick={handlePrintClick}
            disabled={isPrinting}
            className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium transition-colors
              ${isPrinting ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-gray-700 bg-white hover:bg-gray-50'}`}
          >
            <Printer size={16} />
            {isPrinting ? '준비 중...' : 'PDF 다운로드 / 인쇄'}
          </button>
          <WeekNavigator
            currentWeek={currentWeek}
            onWeekChange={setCurrentWeek}
            availableWeeks={availableWeeks}
            isAdmin={isAdmin}
          />
        </div>
      </header>

      {/* Body: tree + content */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left Tree Navigation ── */}
        <aside className={`flex-none bg-white border-r border-gray-200 flex flex-col transition-all duration-300
          ${isTreeCollapsed ? 'w-[64px] py-4 px-2 gap-2 overflow-visible' : 'w-60 py-4 px-3 gap-0.5 overflow-y-auto'}`}>
          <button
            onClick={() => setIsTreeCollapsed(v => !v)}
            title={isTreeCollapsed ? '메뉴 펼치기' : '메뉴 접기'}
            className={`flex-none flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors border border-gray-100 shadow-sm
              ${isTreeCollapsed ? 'mx-auto mb-4' : 'ml-auto mb-2'}`}
          >
            {isTreeCollapsed
              ? <PanelLeftOpen size={16} />
              : <PanelLeftClose size={16} />}
          </button>
          {TREE_MENU.map(item => renderTreeItem(item))}
        </aside>

        {/* ── Right Content ── */}
        <main className="flex-1 flex flex-col overflow-hidden p-6 bg-gray-50">

          {isOverview ? (
            <div className="flex-1 overflow-y-auto pr-2 pb-4">
              <MeetingOverviewPanel
                currentWeek={currentWeek}
                currentUser={currentUser}
                isAdmin={isAdmin}
                onAddNotice={() => {
                  setModalTeamOverride('공지사항');
                  setIsModalOpen(true);
                  setEditingTask(null);
                }}
                onEditNotice={(task) => {
                  setModalTeamOverride('공지사항');
                  setEditingTask(task);
                  setIsModalOpen(true);
                }}
                onDeleteNotice={(task) => {
                  handleDeleteTask(task);
                }}
                refreshTrigger={refreshTrigger}
              />
            </div>
          ) : isCirculation ? (
            <div className="flex-1 overflow-auto"><CirculationBoard currentWeek={currentWeek} currentUser={currentUser} isFullscreenMode={false} /></div>
          ) : (
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-800">
                  {activeMenu}
                </h2>
                <button
                  onClick={() => handleOpenModal()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-kh-green to-kh-green/80 text-white rounded-lg hover:shadow-lg transition-all text-sm font-bold"
                >
                  <Plus className="w-4 h-4 text-white" />
                  업무 추가
                </button>
              </div>

              <div className="flex-1 overflow-auto px-1 pb-1 pt-0">
                {loading ? (
                  <div className="h-full flex items-center justify-center text-gray-400 gap-2">
                    <Settings className="w-6 h-6 animate-spin" /> 로딩 중...
                  </div>
                ) : (
                  <TaskTable
                    tasks={tasks}
                    team={activeMenu}
                    onEdit={handleOpenModal}
                    onDelete={handleDeleteTask}
                    currentUser={currentUser}
                    isAdmin={isAdmin}
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals & Overlays */}
      {isFullscreenMode && (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col is-fullscreen-mode overflow-hidden">
          {/* Fullscreen Header */}
          <header className="flex-none flex justify-between items-center px-10 py-6 border-b-2 border-gray-100 bg-white shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <FileSpreadsheet className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 leading-tight">주간공정회의</h1>
                <p className="text-sm text-gray-400 font-bold tracking-wide uppercase mt-0.5">Kunhwa R&D Center Weekly Meeting</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-6">
                  <WeekNavigator
                    currentWeek={currentWeek}
                    onWeekChange={setCurrentWeek}
                    availableWeeks={availableWeeks}
                    isAdmin={isAdmin}
                  />
              </div>
              <button 
                onClick={() => setIsFullscreenMode(false)}
                className="p-4 bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all border border-gray-200 shadow-sm"
              >
                <X size={32} />
              </button>
            </div>
          </header>

          <div className="flex-1 flex overflow-hidden">
            {/* Tree Sidebar (Larger) */}
            <aside className={`flex-none bg-white border-r-2 border-gray-100 flex flex-col transition-all duration-300
              ${isTreeCollapsed ? 'w-24 py-8 px-3 gap-4 overflow-visible' : 'w-80 py-8 px-6 gap-2 overflow-y-auto'}`}>
               <button 
                onClick={() => setIsTreeCollapsed(!isTreeCollapsed)}
                className={`flex-none flex items-center justify-center w-12 h-12 rounded-xl text-gray-400 hover:bg-gray-100 transition-all border border-gray-100 shadow-sm
                  ${isTreeCollapsed ? 'mx-auto mb-6' : 'ml-auto mb-4'}`}
                title={isTreeCollapsed ? '메뉴 확장' : '메뉴 축소'}
               >
                {isTreeCollapsed ? <PanelLeftOpen size={24} /> : <PanelLeftClose size={24} />}
               </button>
               {TREE_MENU.map(item => renderTreeItem(item))}
            </aside>

            {/* Content Area (Larger) */}
            <main className="flex-1 flex flex-col overflow-hidden p-10 bg-gray-50/50">
               {isOverview ? (
                  <div className="flex-1 overflow-y-auto pr-4 pb-8">
                    <MeetingOverviewPanel
                      currentWeek={currentWeek}
                      currentUser={currentUser}
                      isAdmin={isAdmin}
                      onAddNotice={() => {
                        setModalTeamOverride('공지사항');
                        setIsModalOpen(true);
                        setEditingTask(null);
                      }}
                      onEditNotice={(task) => {
                        setModalTeamOverride('공지사항');
                        setEditingTask(task);
                        setIsModalOpen(true);
                      }}
                      onDeleteNotice={handleDeleteTask}
                      refreshTrigger={refreshTrigger}
                      hideNoticeActions={isFullscreenMode}
                      hideOverviewActions={false}
                    />
                  </div>
               ) : isCirculation ? (
                  <div className="flex-1 overflow-auto"><CirculationBoard currentWeek={currentWeek} currentUser={currentUser} isFullscreenMode={true} /></div>
               ) : (
                  <div className="flex-1 bg-white rounded-3xl shadow-xl border border-gray-200 flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center px-10 py-6 border-b border-gray-100">
                      <h2 className="text-2xl font-black text-gray-800">
                        {activeMenu}
                      </h2>
                      {!isFullscreenMode && (
                        <button
                          onClick={() => handleOpenModal()}
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-kh-green to-kh-green/80 text-white rounded-xl hover:shadow-lg transition-all text-lg font-bold"
                        >
                          <Plus size={24} />
                          업무 추가
                        </button>
                      )}
                    </div>
                    <div className="flex-1 overflow-auto px-4 pb-4">
                      {loading ? (
                        <div className="h-full flex items-center justify-center text-gray-400 gap-3 text-xl">
                          <Settings className="w-10 h-10 animate-spin text-primary" /> 로딩 중...
                        </div>
                      ) : (
                        <TaskTable
                          tasks={tasks}
                          team={activeMenu}
                          onEdit={handleOpenModal}
                          onDelete={handleDeleteTask}
                          currentUser={currentUser}
                          isAdmin={isAdmin}
                          hideActions={isFullscreenMode}
                        />
                      )}
                    </div>
                  </div>
               )}
            </main>
          </div>
          
          <style dangerouslySetInnerHTML={{ __html: `
            .is-fullscreen-mode {
              font-size: 1.25rem;
              color: #000000 !important;
            }
            .is-fullscreen-mode * {
              border-color: #e5e7eb !important;
            }
            .is-fullscreen-mode h2 { font-size: 1.5rem !important; font-weight: 900 !important; color: #000 !important; }
            .is-fullscreen-mode h3:not(.text-white) { font-size: 1.25rem !important; font-weight: 800 !important; color: #000 !important; }
            .is-fullscreen-mode p, .is-fullscreen-mode span, .is-fullscreen-mode td, .is-fullscreen-mode th { 
              font-size: 1.25rem !important; 
              font-weight: 700 !important; 
              color: #000 !important; 
            }
            .is-fullscreen-mode .text-primary { color: #00b050 !important; }
            .is-fullscreen-mode table th, .is-fullscreen-mode table td { 
              padding: 1.25rem 0.75rem !important; 
              line-height: 2 !important;
            }
            .is-fullscreen-mode .overview-table th, .is-fullscreen-mode .overview-table td,
            .is-fullscreen-mode .overview-nested-table th, .is-fullscreen-mode .overview-nested-table td {
              padding: 0.5rem 0.75rem !important;
              line-height: 1.4 !important;
            }
            .is-fullscreen-mode .w-32 { width: 10rem !important; }
            .is-fullscreen-mode .w-40 { width: 12rem !important; }
            .is-fullscreen-mode .w-28 { width: 8rem !important; }
            .is-fullscreen-mode .w-24 { width: 8rem !important; }
            
            /* Table Column Widths (Fixed for balanced layout) */
            .is-fullscreen-mode .weekly-tasks-table { table-layout: fixed !important; width: 100% !important; }
            .is-fullscreen-mode .weekly-tasks-table th:nth-child(1), .is-fullscreen-mode .weekly-tasks-table td:nth-child(1) { width: 8rem !important; } /* 업무코드 */
            .is-fullscreen-mode .weekly-tasks-table th:nth-child(2), .is-fullscreen-mode .weekly-tasks-table td:nth-child(2) { width: 10rem !important; } /* 수행인원 */
            .is-fullscreen-mode .weekly-tasks-table th:nth-child(3), .is-fullscreen-mode .weekly-tasks-table td:nth-child(3) { width: 8rem !important; } /* 진행상태 */
            .is-fullscreen-mode .weekly-tasks-table th:nth-child(4), .is-fullscreen-mode .weekly-tasks-table td:nth-child(4) { width: 8rem !important; } /* 시작일 */
            .is-fullscreen-mode .weekly-tasks-table th:nth-child(5), .is-fullscreen-mode .weekly-tasks-table td:nth-child(5) { width: 8rem !important; } /* 마감일 */
            .is-fullscreen-mode .weekly-tasks-table:not(.has-no-meeting-result) th:nth-child(6), .is-fullscreen-mode .weekly-tasks-table:not(.has-no-meeting-result) td:nth-child(6) { width: 8rem !important; } /* 공유회의/결과보고 */
            .is-fullscreen-mode .weekly-tasks-table:not(.has-no-meeting-result) th:nth-child(7), .is-fullscreen-mode .weekly-tasks-table:not(.has-no-meeting-result) td:nth-child(7) { width: auto !important; } /* 주요내용 (Flex) */

            /* 공통업무&행정 등 공유회의 열이 없는 테이블 전용 규칙 */
            .is-fullscreen-mode .weekly-tasks-table.has-no-meeting-result th:nth-child(6), .is-fullscreen-mode .weekly-tasks-table.has-no-meeting-result td:nth-child(6) { width: auto !important; } /* 주요내용 (Flex) */

            /* Project Table Column Widths */
            .is-fullscreen-mode .project-table { table-layout: fixed !important; width: 100% !important; }
            .is-fullscreen-mode .project-table th:nth-child(1), .is-fullscreen-mode .project-table td:nth-child(1) { width: 8rem !important; } /* 분류 코드 */
            .is-fullscreen-mode .project-table th:nth-child(2), .is-fullscreen-mode .project-table td:nth-child(2) { width: 28rem !important; } /* 프로젝트명 */
            .is-fullscreen-mode .project-table th:nth-child(3), .is-fullscreen-mode .project-table td:nth-child(3) { width: 10rem !important; } /* 수행방식 */
            .is-fullscreen-mode .project-table th:nth-child(4), .is-fullscreen-mode .project-table td:nth-child(4) { width: 8rem !important; } /* BIM용역비 */
            .is-fullscreen-mode .project-table th:nth-child(5), .is-fullscreen-mode .project-table td:nth-child(5) { width: 9rem !important; } /* 설계담당부서 */
            .is-fullscreen-mode .project-table th:nth-child(6), .is-fullscreen-mode .project-table td:nth-child(6) { width: 10rem !important; } /* 담당자 */
            .is-fullscreen-mode .project-table th:nth-child(7), .is-fullscreen-mode .project-table td:nth-child(7) { width: auto !important; } /* 수행현황 */

            .is-fullscreen-mode .attendance-tag { padding: 0.6rem 1.2rem !important; font-size: 1.2rem !important; border-width: 2px !important; }
            .is-fullscreen-mode aside button span { font-size: 1.2rem !important; font-weight: 700 !important; }
            .is-fullscreen-mode .bg-gray-50\\/50 { background-color: #f1f5f9 !important; }
            .is-fullscreen-mode .text-gray-400, .is-fullscreen-mode .text-gray-500 { color: #475569 !important; }
            .is-fullscreen-mode table thead th { white-space: nowrap !important; text-align: center !important; }
            .is-fullscreen-mode table td:not(.whitespace-pre-wrap):not(.whitespace-nowrap) { white-space: normal !important; word-break: keep-all; overflow-wrap: break-word; text-align: center !important; }
            .is-fullscreen-mode table td.whitespace-pre-wrap { text-align: left !important; padding-left: 1rem !important; }
            .is-fullscreen-mode table.circulation-table tr.bg-blue-50\/50 { background-color: #eff6ff !important; }
            .is-fullscreen-mode table.circulation-table tr td.team-cell { 
              text-align: left !important; 
              padding-left: 1.5rem !important; 
              color: #1e40af !important; 
              background-color: #eff6ff !important; 
              border-bottom-color: #dbeafe !important;
            }
            .is-fullscreen-mode table.circulation-table tr td.name-cell { text-align: left !important; padding-left: 1.5rem !important; }
            
            /* Override colors for Circulation Board dark headers */
            .is-fullscreen-mode .circulation-dark-header,
            .is-fullscreen-mode .circulation-dark-header h3,
            .is-fullscreen-mode .circulation-dark-header p,
            .is-fullscreen-mode .circulation-dark-header span,
            .is-fullscreen-mode .circulation-dark-header svg,
            .is-fullscreen-mode .circulation-dark-header button,
            .is-fullscreen-mode .circulation-dark-header input {
              color: #ffffff !important;
            }
            .is-fullscreen-mode .circulation-dark-header .text-kh-lime {
              color: #a3e635 !important;
            }
            
            /* Override padding for Circulation Tables to reduce row height */
            .is-fullscreen-mode .circulation-table th,
            .is-fullscreen-mode .circulation-table td {
              padding: 0.5rem 0.5rem !important;
              line-height: 1.4 !important;
            }
            .is-fullscreen-mode .circulation-table td.p-0 {
              padding: 0 !important;
            }
            .is-fullscreen-mode .circulation-table input {
              padding-top: 0.35rem !important;
              padding-bottom: 0.35rem !important;
              min-height: 2.2rem !important;
            }
          `}} />
        </div>
      )}

      {isModalOpen && (
        <TaskFormModal
          team={modalTeamOverride || (activeMenu === '회의 개요' ? '공통업무&행정' : activeMenu)}
          task={editingTask}
          onClose={() => { setIsModalOpen(false); setEditingTask(null); setModalTeamOverride(null); }}
          onSave={handleSaveTask}
          currentWeek={currentWeek}
          currentUser={currentUser}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">업무 삭제</h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                정말 이 업무를 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                  취소
                </button>
                <button onClick={confirmDelete}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-200">
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 숨겨진 PDF 인쇄 컨테이너 */}
      <div className="hidden">
        <PrintableReport ref={printRef} reportData={printData} />
      </div>

    </div>
  );
};

export default WeeklyMeeting;
