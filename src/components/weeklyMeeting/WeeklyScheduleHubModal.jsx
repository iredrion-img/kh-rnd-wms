import React, { useState, useEffect } from 'react';
import { X, Pencil, Trash2, CalendarRange, Plus, ClipboardList, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import TaskFormModal from './TaskFormModal';

const WeeklyScheduleHubModal = ({
  onClose,
  onSaveSchedule,
  onDeleteSchedule,
  currentUser,
  currentWeek,
  selectedDate,
}) => {
  const [activeTab, setActiveTab] = useState('view'); // 'view' | 'add'
  const [mySchedules, setMySchedules] = useState([]);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSchedules = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/weekly-schedule?week=${currentWeek}`);
      if (res.ok) {
        const all = await res.json();
        // Filter schedules where the current user is mentioned in assignees
        const mine = all.filter(s => s.assignees && s.assignees.includes(currentUser.name));
        // Sort: Category Order -> Start Date
        const orderMap = {
          '업무협의': 1, '프로젝트': 2, '부서지원': 3, 'TFT': 4, '대외활동': 5,
          '세미나': 6, '교육': 7, '연구과제': 8, '매뉴얼작성': 9, '행정': 10,
          '기타': 11, '휴가': 12
        };
        mine.sort((a, b) => {
          const valA = orderMap[a.schedule_type || '기타'] || 99;
          const valB = orderMap[b.schedule_type || '기타'] || 99;
          if (valA !== valB) return valA - valB;
          return (a.start_date || '').localeCompare(b.start_date || '');
        });
        setMySchedules(mine);
      }
    } catch (e) {
      console.error('Failed to fetch weekly schedules:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [currentWeek, currentUser]);

  const handleDelete = (schedule) => {
    setScheduleToDelete(schedule);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!scheduleToDelete) return;
    try {
      await onDeleteSchedule(scheduleToDelete);
      await fetchSchedules();
    } finally {
      setShowDeleteConfirm(false);
      setScheduleToDelete(null);
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
  };

  const handleSaveEdit = async (scheduleData) => {
    await onSaveSchedule(scheduleData);
    setEditingSchedule(null);
    await fetchSchedules();
  };

  const handleSaveNew = async (scheduleData) => {
    await onSaveSchedule(scheduleData);
    setActiveTab('view');
    await fetchSchedules();
  };

  const typeBadge = (type) => {
    const map = {
      '합사': 'bg-rose-50 text-rose-600 border border-rose-100',
      '업무협의': 'bg-blue-50 text-blue-600 border border-blue-100',
      '프로젝트': 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      '부서지원': 'bg-cyan-50 text-cyan-600 border border-cyan-100',
      '연구과제': 'bg-purple-50 text-purple-600 border border-purple-100',
      '매뉴얼작성': 'bg-teal-50 text-teal-600 border border-teal-100',
      '행정': 'bg-slate-50 text-slate-600 border border-slate-100',
      '휴가': 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      '세미나': 'bg-sky-50 text-sky-600 border border-sky-100',
      '교육': 'bg-violet-50 text-violet-600 border border-violet-100',
      '대외활동': 'bg-orange-50 text-orange-600 border border-orange-100',
      'TFT': 'bg-pink-50 text-pink-600 border border-pink-100',
      '기타': 'bg-gray-50 text-gray-600 border border-gray-100',
    };
    return map[type] || 'bg-gray-100 text-gray-700';
  };

  const renderViewTab = () => (
    <div className="flex flex-col gap-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1">
        <CalendarRange size={15} className="text-primary" />
        이번 주 나의 일정
      </h3>
      {isLoading ? (
        <div className="text-sm text-gray-400 animate-pulse p-3 bg-gray-50 rounded-lg">불러오는 중...</div>
      ) : mySchedules.length > 0 ? (
        <div className="flex flex-col gap-3">
          {(() => {
            const today = format(new Date(), 'yyyy-MM-dd');
            return mySchedules.map(sch => {
              const isPast = (sch.end_date || sch.start_date || '') < today;
              return (
                <React.Fragment key={sch.id}>
                  <div className={`flex items-center justify-between gap-3 p-4 rounded-xl border transition-colors ${
                    isPast
                      ? 'border-gray-100 bg-gray-50/30 opacity-60 hover:opacity-80'
                      : 'border-gray-100 bg-gray-50/60 hover:bg-gray-50'
                  }`}>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${typeBadge(sch.schedule_type)}`}>
                          {sch.schedule_type || '기타'}
                        </span>
                        {sch.location && (
                          <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                            <MapPin size={10} />
                            {sch.location}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-800 font-bold truncate" title={sch.content}>
                        {sch.content}
                      </span>
                      <span className="text-[11px] text-gray-500 mt-1">
                        {sch.start_date === sch.end_date
                          ? sch.start_date
                          : `${sch.start_date} ~ ${sch.end_date}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <button
                        onClick={() => handleEdit(sch)}
                        className="p-2 text-gray-400 hover:text-primary transition-colors rounded-lg hover:bg-primary/10"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(sch)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </React.Fragment>
              );
            });
          })()}
        </div>
      ) : (
        <div className="text-sm text-gray-400 text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          이번 주 등록된 나의 일정이 없습니다.
          <button
            onClick={() => setActiveTab('add')}
            className="block mx-auto mt-2 text-xs text-primary font-bold hover:underline"
          >
            + 일정 등록하기
          </button>
        </div>
      )}
    </div>
  );

  const renderAddTab = () => (
    <TaskFormModal
      team="주간일정"
      task={null}
      onClose={onClose}
      onSave={handleSaveNew}
      currentWeek={currentWeek}
      currentUser={currentUser}
      isFromTimesheet={true}
    />
  );

  return (
    <>
      <div className="fixed inset-0 min-h-screen bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] px-4 animate-in fade-in duration-200">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 mt-[-5vh] max-h-[88vh]">
          {/* Header */}
          <div className="px-6 pt-5 pb-0 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">주간 일정</h2>
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
                일정 현황
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
                일정 등록
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'view' ? (
              <div className="p-6">{renderViewTab()}</div>
            ) : (
              <div className="p-0">{renderAddTab()}</div>
            )}
          </div>
        </div>
      </div>

      {editingSchedule && (
        <TaskFormModal
          team="주간일정"
          task={editingSchedule}
          onClose={() => setEditingSchedule(null)}
          onSave={handleSaveEdit}
          currentWeek={currentWeek}
          currentUser={currentUser}
          isFromTimesheet={true}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">일정 삭제</h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                정말 이 일정을 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setScheduleToDelete(null); }}
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

export default WeeklyScheduleHubModal;
