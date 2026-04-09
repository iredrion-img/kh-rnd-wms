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

const TaskTable = ({ tasks, team, onEdit, onDelete, currentUser, isAdmin }) => {
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

  // --- 주간일정 뷰 ---
  if (isSchedule) {
    return (
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-500 bg-gray-50 uppercase sticky top-0">
          <tr>
            <th className="px-4 py-3 rounded-tl-lg">업무분야</th>
            <th className="px-4 py-3">상세업무</th>
            <th className="px-4 py-3">기간</th>
            <th className="px-4 py-3">장소</th>
            <th className="px-4 py-3">수행인원</th>
            <th className="px-4 py-3 w-24 text-right rounded-tr-lg">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tasks.map(t => (
            <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">{t.schedule_type}</td>
              <td className="px-4 py-3">{t.content}</td>
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                {t.start_date} {t.end_date && t.start_date !== t.end_date ? `~ ${t.end_date}` : ''}
              </td>
              <td className="px-4 py-3">{t.location}</td>
              <td className="px-4 py-3 text-gray-600">{t.assignees}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button onClick={() => onEdit(t)} className="p-1 text-gray-400 hover:text-primary transition-colors"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => onDelete(t)} className="p-1 text-gray-400 hover:text-red-500 transition-colors ml-1"><Trash2 className="w-4 h-4" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // --- 프로젝트 추진 및 수행 현황 뷰 ---
  if (isProject) {
    return (
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-500 bg-gray-50 uppercase sticky top-0">
          <tr>
            <th className="px-4 py-3 rounded-tl-lg">분류</th>
            <th className="px-4 py-3">업무코드</th>
            <th className="px-4 py-3 min-w-[200px]">프로젝트명</th>
            <th className="px-4 py-3">수행방식</th>
            <th className="px-4 py-3">BIM용역비</th>
            <th className="px-4 py-3">담당부서</th>
            <th className="px-4 py-3">담당자</th>
            <th className="px-4 py-3 min-w-[200px]">수행현황</th>
            <th className="px-4 py-3 w-24 text-right rounded-tr-lg">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tasks.map(t => (
            <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">{t.category}</td>
              <td className="px-4 py-3 text-gray-500 font-mono text-xs">{t.project_code}</td>
              <td className="px-4 py-3 font-medium text-primary">{t.project_name}</td>
              <td className="px-4 py-3">{t.method}</td>
              <td className="px-4 py-3 whitespace-nowrap">{t.bim_cost}</td>
              <td className="px-4 py-3">{t.dept}</td>
              <td className="px-4 py-3">{t.manager}</td>
              <td className="px-4 py-3 whitespace-pre-wrap">{t.status_detail}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => onEdit(t)} className="p-1 text-gray-400 hover:text-primary transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => onDelete(t)} className="p-1 text-gray-400 hover:text-red-500 transition-colors ml-1"><Trash2 className="w-4 h-4" /></button>
                </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // --- 일반 업무 현황 뷰 ---
  const hasNote = team === '스마트 기술 개발팀';

  return (
    <table className="w-full text-sm text-left">
      <thead className="text-xs text-gray-500 bg-gray-50 uppercase sticky top-0">
        <tr>
          {!isNotice && <th className="px-3 py-3 w-24 rounded-tl-lg">코드</th>}
          {!isNotice && <th className="px-3 py-3 w-20">대분류</th>}
          <th className={`px-3 py-3 min-w-[250px] ${isNotice ? 'rounded-tl-lg' : ''}`}>주요내용</th>
          {!isNotice && <th className="px-3 py-3 w-28">수행인원</th>}
          {!isNotice && <th className="px-3 py-3 w-24 text-center">상태</th>}
          {!isNotice && <th className="px-3 py-3 w-20 text-center">중요도</th>}
          <th className="px-3 py-3 w-32">기간</th>
          {hasNote && <th className="px-3 py-3 min-w-[150px]">비고</th>}
          <th className="px-3 py-3 w-20 text-right rounded-tr-lg">관리</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {tasks.map(t => {
          return (
            <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
              {!isNotice && <td className="px-3 py-3 text-xs text-gray-400 font-mono">{t.task_code}</td>}
              {!isNotice && <td className="px-3 py-3 font-medium text-gray-700">{t.category}</td>}
              <td className="px-3 py-3 text-gray-900 whitespace-pre-wrap">{t.content}</td>
              {!isNotice && <td className="px-3 py-3 text-gray-600">{t.assignees}</td>}
              
              {!isNotice && <td className="px-3 py-3 text-center">
                <span className={`px-2 py-1 text-xs font-medium rounded-md border ${STATUS_COLORS[t.status] || STATUS_COLORS['보류']}`}>
                  {t.status || '보류'}
                </span>
              </td>}
              
              {!isNotice && <td className="px-3 py-3 text-center">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${PRIORITY_COLORS[t.priority] || PRIORITY_COLORS['중간']}`}>
                  {t.priority || '중간'}
                </span>
              </td>}
              
              <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                {t.start_date.slice(5)} {t.end_date && t.start_date !== t.end_date ? ` ~ ${t.end_date.slice(5)}` : ''}
              </td>

              {hasNote && <td className="px-3 py-3 text-gray-500">{t.note}</td>}

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
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default TaskTable;
