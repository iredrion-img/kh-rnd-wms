import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Maximize2, Minimize2, RefreshCw, X, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import TaskFormModal from '../weeklyMeeting/TaskFormModal';

const getISOWeekString = (d = new Date()) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

const StatusBoard = ({ currentUser, isModal = false, onClose = () => {} }) => {
  const [schedules, setSchedules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [orderTarget, setOrderTarget] = useState(() => localStorage.getItem('kh_order_target') || '6,200');
  const [collectionTarget, setCollectionTarget] = useState(() => localStorage.getItem('kh_collection_target') || '4,500');

  const boardRef = React.useRef(null);

  useEffect(() => {
    const handleVisibilityChange = () => { if (!document.hidden) setRefreshTrigger(p => p+1); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const interval = setInterval(() => {
      if (!document.hidden) setRefreshTrigger(p => p + 1);
    }, 15000); 

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const today = new Date();
      // Use the week_start (Monday) of the current week for the API query
      const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon ... 6=Sat
      const diffToMon = (dayOfWeek === 0) ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diffToMon);
      const weekStr = monday.toISOString().slice(0, 10); // 'YYYY-MM-DD'

      const [usersRes, schedRes] = await Promise.all([
        fetch('/api/users'),
        fetch(`/api/weekly-schedule?week=${weekStr}`)
      ]);
      const usersData = await usersRes.json();
      const schedData = await schedRes.json();

      setUsers(Array.isArray(usersData) ? usersData : []);
      
      const todayStr = format(today, 'yyyy-MM-dd');
      
      const todayScheds = (Array.isArray(schedData) ? schedData : []).filter(s => {
        const start = s.start_date || '9999-12-31';
        const end = s.end_date || s.start_date || '9999-12-31';
        return start <= todayStr && todayStr <= end;
      });

      setSchedules(todayScheds);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [refreshTrigger]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (boardRef.current) {
        boardRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleSaveEdit = async (taskData) => {
    let url = '/api/weekly-schedule';
    if (editingTask && editingTask.id) url += `/${editingTask.id}`;
    
    await fetch(url, {
      method: editingTask ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...taskData, team: '주간일정' }),
    });
    setEditingTask(null);
    setRefreshTrigger(p => p + 1);
  };

  const handleEditClick = (task) => {
    const originalTask = schedules.find(s => s.id === task.id);
    if(originalTask) {
        setEditingTask(originalTask);
    }
  };

  // Parsing logic
  const categorized = useMemo(() => {
    const results = {
      '외근/출장': [],
      '공가/교육': [],
      '휴가': [],
      '반차': [], // items will have .period = '오전' or '오후'
      '합사': [],
      '외출': []
    };

    schedules.forEach(sch => {
      const type = sch.schedule_type || '';
      const content = sch.content || '';
      const loc = sch.location || '';
      const assignees = sch.assignees ? sch.assignees.split(',').map(s=>s.trim()).filter(Boolean) : [];

      assignees.forEach(name => {
        const entry = { name, ...sch };
        
        if (content.includes('외출')) {
           results['외출'].push(entry);
        } 
        else if (type === '합사') {
           results['합사'].push(entry);
        }
        else if (type === '휴가') {
           // 오전반차/오후반차 키워드 먼저 체크 (완전 매칭 우선)
           if (content === '오전반차' || content === '오후반차' || content.includes('반차') || content.includes('오전') || content.includes('오후')) {
              // 오후 포함 여부로 구분 (기본값: 오전반차)
              entry.period = (content.includes('오후') || content === '오후반차') ? '오후' : '오전';
              results['반차'].push(entry);
           } else {
              results['휴가'].push(entry);
           }
        }
        else if (type === '교육' || type === '세미나' || content.match(/공가|출산|예비군|경조사/)) {
           results['공가/교육'].push(entry);
        }
        else if ((loc && !loc.includes('사내') && !loc.includes('본사') && type !== '기타') || content.includes('외근') || content.includes('출장')) {
           results['외근/출장'].push(entry);
        }
      });
    });

    return results;
  }, [schedules]);

  const totalUsersCount = users.length > 0 ? users.length : 20;
  const uniqueOutUsers = new Set();
  Object.values(categorized).forEach(arr => arr.forEach(item => uniqueOutUsers.add(item.name)));
  const outUsersNum = uniqueOutUsers.size;
  const presentUsersNum = totalUsersCount - outUsersNum;

  const todayStr = format(new Date(), 'yyyy. MM. dd eeee', { locale: ko });

  const renderSection = (title, items, borderClass, textClass, isHalf = false) => (
    <div className={`border-2 ${borderClass} rounded-2xl flex flex-col bg-white overflow-hidden shadow-sm h-full`}>
      <div className={`px-4 py-3 flex justify-between items-center border-b ${borderClass}`}>
        <h3 className={`font-bold ${textClass}`}>{title}</h3>
        <span className={`font-semibold ${textClass} bg-white px-2 py-0.5 rounded-full border ${borderClass} text-sm`}>{items.length} 인</span>
      </div>
      <div className="flex-1 p-2 grid gap-2 auto-rows-max overflow-y-auto min-h-[150px]">
        {items.map((item, idx) => (
          <div key={`${item.id}-${idx}`} 
               className={`p-2.5 rounded-xl border border-gray-100 bg-gray-50 flex flex-col gap-1 mx-1 hover:border-${borderClass.split('-')[1]}-300 transition-colors group cursor-pointer relative`}
               onClick={() => handleEditClick(item)}
               title="일정 수정하기"
          >
            <div className="flex justify-between items-start">
               <span className="font-bold text-gray-800 flex items-center gap-1.5">
                  {item.name}
                  {item.period && <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-[10px]">{item.period}</span>}
               </span>
               <Pencil size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            
            {(item.location || item.content) && (
               <div className="text-xs text-gray-600 flex flex-col gap-0.5 mt-0.5">
                  {item.location && <span className="font-medium text-gray-700">{item.location}</span>}
                  {item.content && <span className="truncate opacity-80">{item.content}</span>}
               </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="flex items-center justify-center h-full opacity-30">
            <span className="text-sm font-medium">등록된 인원이 없습니다.</span>
          </div>
        )}
      </div>
    </div>
  );

  const mainContent = (
    <div className={`flex flex-col h-full bg-slate-50 transition-all ${isFullscreen ? 'p-8 gap-6' : 'p-6 gap-4'}`}>
      
      {/* Header */}
      <div className="flex flex-wrap xl:flex-nowrap items-end justify-between border-b-2 border-slate-800 pb-3 shrink-0 gap-4">
         <div className="flex items-center gap-3 shrink-0">
            <img src="/kh_rnd_new_logo.png" alt="KH R&D Center Logo" className="h-[clamp(2rem,3vw,3rem)] object-contain" />
            <div className="h-6 w-px bg-slate-300 mx-1 shrink-0"></div>
            <h2 className="text-[clamp(1.25rem,1.8vw,1.5rem)] font-bold text-slate-700 whitespace-nowrap leading-none">{todayStr}</h2>
         </div>
         
         <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-4">
               {/* Controls */}
               <div className="flex items-center gap-2 mx-2">
                  <button onClick={() => setRefreshTrigger(p=>p+1)} className="p-1.5 text-slate-400 hover:text-primary transition-colors bg-white rounded-md shadow-sm border border-slate-100" title="새로고침">
                     <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  </button>
                  <button onClick={toggleFullscreen} className="p-1.5 text-slate-400 hover:text-primary transition-colors bg-white rounded-md shadow-sm border border-slate-100" title="전체화면">
                     {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                  {isModal && !isFullscreen && (
                     <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors bg-white rounded-md shadow-sm border border-slate-100 ml-1">
                        <X size={16} />
                     </button>
                  )}
               </div>
               
               {/* Objectives Table */}
               <table className="text-center font-bold border-2 border-slate-800 bg-white text-xs">
                  <tbody>
                     <tr>
                        <td rowSpan="2" className="border-r-2 border-slate-800 bg-[#cdd4e6] italic w-24 text-sm align-middle text-slate-900">Kunhwa</td>
                        <td className="border-b-2 border-r-2 border-slate-800 bg-[#cdd4e6] w-24 py-1 text-slate-800">수주목표</td>
                        <td className="border-b-2 border-slate-800 bg-[#cdd4e6] w-24 py-1 text-slate-800">수금목표</td>
                     </tr>
                     <tr>
                        <td 
                           className="border-r-2 border-slate-800 py-1 text-sm bg-white text-slate-900 cursor-text hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-primary focus:z-10 focus:bg-white transition-colors relative"
                           title="클릭하여 목표 수정"
                           contentEditable
                           suppressContentEditableWarning
                           onBlur={(e) => {
                              const val = e.currentTarget.textContent;
                              setOrderTarget(val);
                              localStorage.setItem('kh_order_target', val);
                           }}
                        >{orderTarget}</td>
                        <td 
                           className="py-1 text-sm bg-white text-slate-900 cursor-text hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-primary focus:z-10 focus:bg-white transition-colors relative"
                           title="클릭하여 목표 수정"
                           contentEditable
                           suppressContentEditableWarning
                           onBlur={(e) => {
                              const val = e.currentTarget.textContent;
                              setCollectionTarget(val);
                              localStorage.setItem('kh_collection_target', val);
                           }}
                        >{collectionTarget}</td>
                     </tr>
                  </tbody>
               </table>
            </div>
            
            {/* Total / Present Users Summary */}
            <div className="text-slate-900 font-extrabold flex items-center gap-2 text-lg pr-1">
               <span>총인원 : {totalUsersCount}명</span>
               <span className="text-slate-400 px-1">/</span>
               <span>현인원 : {presentUsersNum}명</span>
            </div>
         </div>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0">
          <div className="grid grid-cols-4 gap-4 h-full">
             {/* Left Column - 외근/출장 */}
             <div className="col-span-1 h-full">
                {renderSection('외근/출장', categorized['외근/출장'], 'border-blue-300', 'text-blue-700')}
             </div>
             
             {/* Second Column - 공가/교육 */}
             <div className="col-span-1 h-full">
                {renderSection('공가/교육', categorized['공가/교육'], 'border-emerald-300', 'text-emerald-700')}
             </div>
             
             {/* Third Column - 휴가 / 반차 */}
             <div className="col-span-1 h-full flex flex-col gap-4">
                <div className="flex-1 min-h-0">
                   {renderSection('휴가', categorized['휴가'], 'border-fuchsia-300', 'text-fuchsia-700')}
                </div>
                <div className="flex-1 min-h-0">
                   {renderSection('반차', categorized['반차'], 'border-amber-300', 'text-amber-700')}
                </div>
             </div>
             
             {/* Fourth Column - 합사 / 외출 */}
             <div className="col-span-1 h-full flex flex-col gap-4">
                <div className="flex-1 min-h-0">
                   {renderSection('합사', categorized['합사'], 'border-red-300', 'text-red-700')}
                </div>
                <div className="flex-1 min-h-0">
                   {renderSection('외출', categorized['외출'], 'border-purple-300', 'text-purple-700')}
                </div>
             </div>
          </div>
      </div>

      {editingTask && (
        <TaskFormModal
          team="주간일정"
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleSaveEdit}
          currentWeek={getISOWeekString(new Date())}
          currentUser={currentUser}
          isFromTimesheet={true}
        />
      )}
    </div>
  );

  if (isModal) {
    return (
      <div ref={boardRef} className={`fixed inset-0 z-[150] flex items-center justify-center ${isFullscreen ? 'bg-slate-50' : 'bg-black/60 backdrop-blur-sm p-4'} animate-in fade-in duration-200`}>
        <div className={`${isFullscreen ? 'w-full h-full' : 'w-[95vw] h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden shadow-black/20 ring-1 ring-white/20'}`}>
           {mainContent}
        </div>
      </div>
    );
  }

  return (
    <div ref={boardRef} className={isFullscreen ? "fixed inset-0 z-[200] bg-slate-50 w-full h-full" : "h-full w-full"}>
       {mainContent}
    </div>
  );
};

export default StatusBoard;
