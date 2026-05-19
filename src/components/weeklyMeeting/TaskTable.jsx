import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

const PRIORITY_COLORS = {
  '높음': 'bg-red-100 text-red-700 border-red-200',
  '중간': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  '낮음': 'bg-blue-100 text-blue-700 border-blue-200',
};

const STATUS_COLORS = {
  '계획': 'bg-blue-100 text-blue-700 border-blue-200',
  '완료': 'bg-green-100 text-green-700 border-green-200',
  '진행 중': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  '보류': 'bg-gray-100 text-gray-700 border-gray-200',
  '타절': 'bg-red-100 text-red-700 border-red-200',
};

const TaskTable = ({ tasks, team, onEdit, onDelete, currentUser, isAdmin, hideActions }) => {
  const isProject = team === '프로젝트 추진 및 수행 현황';
  const isSchedule = team === '주간일정';
  const isNotice = team === '공지사항';

  if (!tasks || tasks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <p className="text-lg">등록된 데이터가 없습니다.</p>
        <p className="text-sm mt-1">우측 상단의 '업무 추가' 버튼을 눌러보세요.</p>
      </div>
    );
  }

  const formatMethod = (method) => {
    if (!method) return '';
    const bases = ["직접수행(합사)", "직접수행", "외주", "미정", "수행예정", "추진중"];
    
    // Handle cases where comma exists before or inside parentheses
    const parentheticalMatch = method.match(/^(.*?)\s*,?\s*\((.*)\)\s*$/);
    if (parentheticalMatch) {
      let bStr = parentheticalMatch[1].trim().replace(/,$/, '').trim();
      const dStr = parentheticalMatch[2].trim();
      
      const foundBases = [];
      let tempBStr = bStr;
      bases.forEach(base => {
        const idx = bStr.indexOf(base);
        if (idx !== -1) {
          foundBases.push({ base, idx });
          tempBStr = tempBStr.replace(base, '').trim();
        }
      });
      foundBases.sort((a, b) => a.idx - b.idx);
      const remainingB = tempBStr.replace(/[, ]+/g, ' ').trim();
      
      const parsedBases = foundBases.map(item => item.base);
      if (remainingB) parsedBases.push(remainingB);
      
      const b = parsedBases.join(', ');
      return b && dStr ? `${b} (${dStr})` : (b || dStr);
    }

    let tempStr = method;
    const selectedBases = [];
    bases.forEach(base => {
      const idx = method.indexOf(base);
      if (idx !== -1) {
        selectedBases.push({ base, idx });
        tempStr = tempStr.replace(base, '').trim();
      }
    });
    selectedBases.sort((a, b) => a.idx - b.idx);

    const details = tempStr.split(',').map(s => s.trim()).filter(Boolean);
    const baseStr = selectedBases.map(item => item.base).join(', ');
    const detailStr = details.join(', ');
    if (baseStr && detailStr) return `${baseStr} (${detailStr})`;
    return baseStr || method;
  };

  const formatAssignees = (assignees) => {
    if (!assignees) return '';
    const names = assignees.split(',').map(n => n.trim()).filter(Boolean);
    const rows = [];
    for (let i = 0; i < names.length; i += 2) {
      rows.push(names.slice(i, i + 2).join(', '));
    }
    return rows.map((row, idx) => <div key={idx} className="whitespace-nowrap">{row}</div>);
  };

  // --- 주간일정 뷰 ---
  if (isSchedule) {
    return (
      <table className="w-full text-sm text-left schedule-table">
        <thead className="text-xs text-gray-500 uppercase">
          <tr>
            <th className="px-4 py-3 rounded-tl-lg sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)] whitespace-nowrap text-center">구분</th>
            <th className="px-4 py-3 sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)] whitespace-nowrap text-center">수행인원</th>
            <th className="px-4 py-3 sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)] whitespace-nowrap text-center">시작예정</th>
            <th className="px-4 py-3 sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)] whitespace-nowrap text-center">종료예정</th>
            <th className="px-4 py-3 sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)] text-center">상세내용</th>
            <th className="px-4 py-3 sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)] w-32 whitespace-nowrap text-center">비고</th>
            {!hideActions && <th className="px-4 py-3 w-24 text-right rounded-tr-lg sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)]">관리</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tasks.map(t => (
            <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap text-center">{t.schedule_type}</td>
              <td className="px-4 py-3 text-gray-600 font-bold text-center">{formatAssignees(t.assignees)}</td>
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-center">{t.start_date}</td>
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-center">{t.end_date}</td>
              <td className="px-4 py-3 font-medium whitespace-pre-wrap">{t.content}</td>
              <td className="px-4 py-3 text-gray-500 whitespace-pre-wrap">{t.location}</td>
              {!hideActions && (
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => onEdit(t)} className="p-1 text-gray-400 hover:text-primary transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => onDelete(t)} className="p-1 text-gray-400 hover:text-red-500 transition-colors ml-1"><Trash2 className="w-4 h-4" /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // --- 프로젝트 추진 및 수행 현황 뷰 ---
  if (isProject) {
    return (
      <table className="w-full text-sm text-left project-table">
        <thead className="text-xs text-gray-500 uppercase">
          <tr className="divide-x divide-gray-200">
            <th className="px-4 py-3 rounded-tl-lg sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)]">분류 코드</th>
            <th className="px-4 py-3 min-w-[200px] sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)]">프로젝트명</th>
            <th className="px-4 py-3 sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)]">수행방식</th>
            <th className="px-4 py-3 sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)]">BIM용역비</th>
            <th className="px-4 py-3 sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)]">설계담당부서</th>
            <th className="px-4 py-3 sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)]">담당자</th>
            <th className="px-4 py-3 min-w-[200px] sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)]">수행현황</th>
            {!hideActions && <th className="px-4 py-3 w-24 text-right rounded-tr-lg sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)]">관리</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tasks.map(t => (
            <tr key={t.id} className="hover:bg-gray-50/50 transition-colors divide-x divide-gray-200">
              <td className="px-4 py-3 text-gray-500 font-mono text-xs font-bold bg-gray-50/30 text-center">{t.project_code || t.sub_no}</td>
              <td className={`px-4 py-3 font-bold whitespace-pre-wrap ${hideActions ? 'text-gray-900' : 'text-primary'}`}>{t.project_name}</td>
              <td className="px-4 py-3 text-center">{formatMethod(t.method)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-center">{t.bim_cost}</td>
              <td className="px-4 py-3 text-center">{t.dept}</td>
              <td className="px-4 py-3 font-bold text-center">{formatAssignees(t.manager)}</td>
              <td className="px-4 py-3 whitespace-pre-wrap">{t.status_detail}</td>
                {!hideActions && (
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => onEdit(t)} className="p-1 text-gray-400 hover:text-primary transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(t)} className="p-1 text-gray-400 hover:text-red-500 transition-colors ml-1"><Trash2 className="w-4 h-4" /></button>
                  </td>
                )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // --- 일반 업무 현황 뷰 ---
  const isResearchTeam = ['스마트 기술 개발팀', '디지털 기술 연구팀', 'AI 응용팀', '인프라 BIM팀', '연구과제'].includes(team);
  const showMeetingResult = isResearchTeam;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return dateStr.slice(2).replace(/-/g, '. ');
  };

  return (
    <table className={`w-full text-sm text-left weekly-tasks-table ${!showMeetingResult ? 'has-no-meeting-result' : ''}`}>
      <thead className="text-xs text-gray-500 uppercase">
        <tr>
          {!isNotice && <th className="px-3 py-3 w-28 rounded-tl-lg sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)]">업무코드</th>}
          {!isNotice && <th className="px-3 py-3 w-32 sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)]">수행인원</th>}
          {!isNotice && <th className="px-3 py-3 w-24 text-center sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)]">진행 상태</th>}
          <th className="px-3 py-3 w-28 text-center sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)]">시작일</th>
          <th className="px-3 py-3 w-28 text-center sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)]">마감일</th>
          {showMeetingResult && <th className="px-3 py-3 w-48 text-center sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)] whitespace-nowrap">공유회의/결과보고</th>}
          <th className={`pl-7 pr-3 py-3 min-w-[300px] sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)] ${isNotice ? 'rounded-tl-lg' : ''}`}>주요내용</th>
          {!hideActions && <th className="px-3 py-3 w-20 text-right rounded-tr-lg sticky top-0 bg-gray-50 z-10 shadow-[0_1px_0_rgba(200,200,200,0.5)]">관리</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {tasks.map(t => {
          return (
            <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
              {!isNotice && <td className="px-3 py-3 text-xs text-gray-400 font-mono">{t.task_code}</td>}
              {!isNotice && <td className="px-3 py-3 text-gray-600 font-bold leading-tight">{formatAssignees(t.assignees)}</td>}
              
              {!isNotice && <td className="px-3 py-3 text-center">
                <span className={`px-2 py-1 text-[11px] font-bold rounded-md border whitespace-nowrap ${STATUS_COLORS[t.status] || STATUS_COLORS['보류']}`}>
                  {t.status || '진행 중'}
                </span>
              </td>}

              <td className="px-3 py-3 text-xs text-gray-500 text-center whitespace-nowrap">
                {formatDate(t.start_date)}
              </td>
              <td className="px-3 py-3 text-xs text-gray-500 text-center whitespace-nowrap">
                {formatDate(t.end_date)}
              </td>

              {showMeetingResult && (
                <td className="px-3 py-3 text-xs text-gray-500 text-center whitespace-nowrap">
                  {formatDate(t.meeting_result)}
                </td>
              )}
              
              <td className="pl-7 pr-3 py-3 text-gray-900 whitespace-pre-wrap font-medium">{t.content}</td>

              {!hideActions && (
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  <button onClick={() => onEdit(t)} className="p-1.5 text-gray-400 hover:text-primary transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation();
                      onDelete(t); 
                    }} 
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors ml-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default TaskTable;
