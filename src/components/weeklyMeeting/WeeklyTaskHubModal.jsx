import React, { useState, useEffect, useRef } from 'react';
import { X, Pencil, Trash2, BellRing, CalendarDays, Plus, ClipboardList } from 'lucide-react';
import { format, startOfWeek } from 'date-fns';
import TaskFormModal from './TaskFormModal';

const WeeklyTaskHubModal = ({
  onClose,
  onSaveTask,
  onDeleteTask,
  currentUser,
  currentWeek,
  selectedDate,
}) => {
  const [activeTab, setActiveTab] = useState('view'); // 'view' | 'add'
  const [isPastExpanded, setIsPastExpanded] = useState(false);
  const [pastTasks, setPastTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [noticeTasks, setNoticeTasks] = useState([]);
  const [editingTask, setEditingTask] = useState(null); // Task being edited in separate modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data whenever the modal opens or the week changes
  const fetchTasks = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/weekly-tasks`);
      if (res.ok) {
        const all = await res.json();
        const mine = all.filter(t => t.assignees && t.assignees.includes(currentUser.name) && t.team !== '공지사항');
        const notices = all.filter(t => t.team === '공지사항' && t.week_start === currentWeek);
        notices.sort((a, b) => (a.end_date || '9999-12-31').localeCompare(b.end_date || '9999-12-31'));

        const past = mine.filter(t => t.week_start < currentWeek);
        const current = mine.filter(t => t.week_start === currentWeek);
        const upcoming = mine.filter(t => t.week_start > currentWeek);

        past.sort((a, b) => (b.week_start || '').localeCompare(a.week_start || ''));
        current.sort((a, b) => (a.task_code || '').localeCompare(b.task_code || ''));
        upcoming.sort((a, b) => (a.week_start || '').localeCompare(b.week_start || ''));

        setPastTasks(past);
        setMyTasks(current);
        setUpcomingTasks(upcoming);
        setNoticeTasks(notices);
      }
    } catch (e) {
      console.error('Failed to fetch weekly tasks:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [currentWeek, currentUser]);

  const handleDelete = (task) => {
    setTaskToDelete(task);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await onDeleteTask(taskToDelete);
      await fetchTasks(); // Refresh list after delete
    } finally {
      setShowDeleteConfirm(false);
      setTaskToDelete(null);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
  };

  const handleSaveEdit = async (taskData) => {
    await onSaveTask(taskData);
    setEditingTask(null);
    await fetchTasks(); // Refresh list after edit
  };

  const handleSaveNew = async (taskData) => {
    await onSaveTask(taskData);
    setActiveTab('view'); // Switch to view tab after adding
    await fetchTasks(); // Refresh
  };

  const statusBadge = (status) => {
    const map = {
      '완료': 'bg-green-100 text-green-700',
      '보류': 'bg-orange-100 text-orange-700',
      '타절': 'bg-red-100 text-red-600',
    };
    return map[status] || 'bg-primary/10 text-primary';
  };

  // ─── TAB: VIEW ──────────────────────────────────────────────
  const renderViewTab = () => (
    <div className="flex flex-col gap-6">
      {/* 📢 공지사항 */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-bold text-orange-500 mb-3">
          <BellRing size={15} />
          이번 주 공지사항
        </h3>
        {isLoading ? (
          <div className="text-sm text-gray-400 animate-pulse p-3 bg-gray-50 rounded-lg">불러오는 중...</div>
        ) : noticeTasks.length > 0 ? (
          <ul className="space-y-2">
            {noticeTasks.map(t => (
              <li key={t.id} className="flex items-start justify-between gap-3 p-3 bg-orange-50/60 border border-orange-100 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{t.content}</p>
                  <p className="text-[11px] text-orange-500 mt-0.5">
                    {t.start_date?.slice(5)}{t.end_date && t.start_date !== t.end_date ? ` ~ ${t.end_date.slice(5)}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-400 text-center p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            등록된 공지사항이 없습니다.
          </div>
        )}
      </section>

      {/* ▶️ 이번 주 나의 업무 현황 */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-bold text-primary mb-3">
          <CalendarDays size={15} />
          이번 주 나의 업무 현황 <span className="text-xs font-normal text-gray-400">({myTasks.length}건)</span>
        </h3>
        {isLoading ? (
          <div className="text-sm text-gray-400 animate-pulse p-3 bg-gray-50 rounded-lg">불러오는 중...</div>
        ) : myTasks.length > 0 ? (
          <div className="flex flex-col gap-2">
            {myTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-primary/20 bg-primary/[0.03] hover:bg-primary/[0.06] transition-colors shadow-sm shadow-primary/5">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-primary mb-0.5">{task.task_code || task.team || '일반 업무'}</span>
                  <span className="text-sm text-gray-900 font-bold truncate" title={task.content}>
                    {task.content}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    {[task.category, task.sub_category].filter(Boolean).join(' › ')}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusBadge(task.status)}`}>
                    {task.status || '진행 중'}
                  </span>
                  <button
                    onClick={() => handleEdit(task)}
                    className="p-1.5 text-gray-400 hover:text-primary transition-colors rounded-lg hover:bg-white"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(task)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-white"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-400 text-center p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            이번 주 등록된 나의 업무가 없습니다.
            <button
              onClick={() => setActiveTab('add')}
              className="block mx-auto mt-2 text-xs text-primary font-bold hover:underline"
            >
              + 업무 등록하기
            </button>
          </div>
        )}
      </section>

      {/* 📅 예정 업무 */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-bold text-indigo-600 mb-3">
          <CalendarDays size={15} />
          예정 업무 <span className="text-xs font-normal text-gray-400">({upcomingTasks.length}건)</span>
        </h3>
        {isLoading ? (
          <div className="text-sm text-gray-400 animate-pulse p-3 bg-gray-50 rounded-lg">불러오는 중...</div>
        ) : upcomingTasks.length > 0 ? (
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
            {upcomingTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50/60 transition-colors">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-indigo-600 mb-0.5">[{task.week_start} 예정] {task.task_code || task.team || '일반 업무'}</span>
                  <span className="text-sm text-gray-800 font-medium truncate" title={task.content}>
                    {task.content}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    {[task.category, task.sub_category].filter(Boolean).join(' › ')}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusBadge(task.status)}`}>
                    {task.status || '진행 중'}
                  </span>
                  <button
                    onClick={() => handleEdit(task)}
                    className="p-1.5 text-gray-400 hover:text-primary transition-colors rounded-lg hover:bg-white"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(task)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-white"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-400 text-center p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            예정된 업무가 없습니다.
          </div>
        )}
      </section>

      {/* 🕒 과거 업무 이력 (접이식 UI, 맨 하단) */}
      <section className="border-t border-gray-100 pt-4 mt-2">
        <button
          type="button"
          onClick={() => setIsPastExpanded(!isPastExpanded)}
          className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all text-gray-600 font-bold text-sm border border-gray-200/60"
        >
          <div className="flex items-center gap-2">
            <CalendarDays size={15} />
            과거 업무 이력 <span className="text-xs font-normal text-gray-400">({pastTasks.length}건)</span>
          </div>
          <span className="text-xs font-bold text-primary bg-white px-2.5 py-1 rounded-md border border-gray-200 shadow-sm">
            {isPastExpanded ? '접기 ▲' : '펼쳐보기 ▼'}
          </span>
        </button>

        {isPastExpanded && (
          <div className="mt-3">
            {isLoading ? (
              <div className="text-sm text-gray-400 animate-pulse p-3 bg-gray-50 rounded-lg">불러오는 중...</div>
            ) : pastTasks.length > 0 ? (
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1 animate-in fade-in slide-in-from-top-1 duration-200">
                {pastTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 bg-gray-100/50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-gray-500 mb-0.5">[{task.week_start}] {task.task_code || task.team || '일반 업무'}</span>
                      <span className="text-sm text-gray-700 font-medium truncate" title={task.content}>
                        {task.content}
                      </span>
                      <span className="text-[10px] text-gray-400 mt-0.5">
                        {[task.category, task.sub_category].filter(Boolean).join(' › ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusBadge(task.status)}`}>
                        {task.status || '진행 중'}
                      </span>
                      <button
                        onClick={() => handleEdit(task)}
                        className="p-1.5 text-gray-400 hover:text-primary transition-colors rounded-lg hover:bg-white"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(task)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-white"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400 text-center p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                과거 이력이 없습니다.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );

  // ─── TAB: ADD (new task form embedded) ──────────────────────
  const renderAddTab = () => (
    <TaskFormModal
      team={currentUser?.department || '공통업무&행정'}
      task={null}
      onClose={onClose}
      onSave={handleSaveNew}
      currentWeek={currentWeek}
      currentUser={currentUser}
      isFromTimesheet={true}
      isEmbedded={true}
    />
  );

  return (
    <>
      {/* Main Hub Modal */}
      <div className="fixed inset-0 min-h-screen bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] px-4 animate-in fade-in duration-200">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 mt-[-5vh] max-h-[88vh]">
          {/* Header */}
          <div className="px-6 pt-5 pb-0 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">주간 업무</h2>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('view')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all border-b-2 ${
                  activeTab === 'view'
                    ? 'text-primary border-primary bg-white'
                    : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ClipboardList size={15} />
                업무 현황
              </button>
              <button
                onClick={() => setActiveTab('add')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all border-b-2 ${
                  activeTab === 'add'
                    ? 'text-primary border-primary bg-white'
                    : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Plus size={15} />
                업무 등록
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'view' ? (
              <div className="p-6">{renderViewTab()}</div>
            ) : (
              renderAddTab()
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal (separate, on top of Hub) */}
      {editingTask && (
        <TaskFormModal
          team={editingTask.team}
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleSaveEdit}
          currentWeek={currentWeek}
          currentUser={currentUser}
          isFromTimesheet={true}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
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
                <button
                  onClick={() => { setShowDeleteConfirm(false); setTaskToDelete(null); }}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-200"
                >
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WeeklyTaskHubModal;
