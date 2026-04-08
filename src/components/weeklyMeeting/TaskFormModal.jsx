import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const MAJOR_CATEGORIES = {
  'BIM': 'B',
  'AI': 'A',
  '디지털기술': 'D',
  'R&D 및 신기술': 'R',
  '교육': 'T',
  '대내외 활동': 'C',
  '기타업무': 'E'
};

const MIDDLE_CATEGORIES = {
  '프로젝트': 'P',
  '업무지원': 'S',
  'CDE': 'C',
  '촬영': 'F',
  '시각화': 'V',
  '개발': 'D',
  '기타': 'E',
  '내부': 'I',
  '외부': 'O',
  '신기술': 'N',
  '매뉴얼': 'M',
  '세미나, 박람회': 'R',
  '논문, 집필': 'W',
  '대외활동, 자문회의': 'A',
  'R&D센터 공통업무': 'G'
};



const TaskFormModal = ({ team, task, onClose, onSave, currentWeek }) => {
  const isProject = team === '프로젝트 추진 및 수행 현황';
  const isSchedule = team === '주간일정';

  const [formData, setFormData] = useState({});
  const [allTasks, setAllTasks] = useState([]);
  const [codeMode, setCodeMode] = useState('new'); // 'new' | 'existing'

  useEffect(() => {
    if (!task && !isProject && !isSchedule) {
      fetch('/api/weekly-tasks')
        .then(res => res.json())
        .then(data => setAllTasks(Array.isArray(data) ? data : []))
        .catch(console.error);
    }
  }, [task, isProject, isSchedule]);

  useEffect(() => {
    if (task) {
      setFormData(task);
    } else {
      // Default initial values based on team type
      if (isProject) {
        setFormData({ status_detail: '' });
      } else if (isSchedule) {
        setFormData({ start_date: currentWeek, end_date: currentWeek });
      } else {
        setFormData({
          status: '진행 중',
          priority: '중간',
          start_date: currentWeek,
          end_date: currentWeek
        });
      }
    }
  }, [task, isProject, isSchedule, currentWeek]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (task) return; // 기존 업무 수정 시에는 자동 수정 안 함
    if (isProject || isSchedule) return;

    const majorStr = MAJOR_CATEGORIES[formData.category];
    const middleStr = MIDDLE_CATEGORIES[formData.sub_category];
    
    if (majorStr && middleStr) {
       const prefix = `${majorStr}-${middleStr}-`;
       if (codeMode === 'new') {
           const matchingCodes = allTasks.map(t=>t.task_code).filter(c => c && c.startsWith(prefix));
           let maxNum = 0;
           matchingCodes.forEach(c => {
               const p = c.split('-');
               if(p.length === 3) {
                   const num = parseInt(p[2],10);
                   if(!isNaN(num) && num > maxNum) maxNum = num;
               }
           });
           const nextCode = `${prefix}${String(maxNum+1).padStart(3,'0')}`;
           setFormData(prev => prev.task_code !== nextCode ? { ...prev, task_code: nextCode } : prev);
       } else {
           // 기존 코드 선택 모드일 때 접두사가 다르면 폼 클리어
           setFormData(prev => prev.task_code && !prev.task_code.startsWith(prefix) ? { ...prev, task_code: '' } : prev);
       }
    } else {
       setFormData(prev => prev.task_code ? { ...prev, task_code: '' } : prev);
    }
  }, [formData.category, formData.sub_category, codeMode, allTasks, task, isProject, isSchedule]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const hasNote = team === '스마트 기술 개발팀';

  const renderScheduleForm = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">업무분야 *</label>
          <select name="schedule_type" value={formData.schedule_type || ''} onChange={handleChange} required className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary">
            <option value="">선택</option>
            <option value="휴가">휴가</option>
            <option value="세미나">세미나</option>
            <option value="교육">교육</option>
            <option value="TFT">TFT</option>
            <option value="연구과제">연구과제</option>
            <option value="부서지원">부서지원</option>
            <option value="대외활동">대외활동</option>
            <option value="기타">기타</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">장소</label>
          <input type="text" name="location" value={formData.location || ''} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">상세업무 *</label>
        <input type="text" name="content" value={formData.content || ''} onChange={handleChange} required className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
          <input type="date" name="start_date" value={formData.start_date || ''} onChange={handleChange} required className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
          <input type="date" name="end_date" value={formData.end_date || ''} onChange={handleChange} required className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">수행인원 (쉼표로 구분)</label>
        <input type="text" name="assignees" value={formData.assignees || ''} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary" />
      </div>
    </>
  );

  const renderProjectForm = () => (
    <>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">대분류</label>
          <input type="text" name="category" value={formData.category || ''} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">순번</label>
          <input type="text" name="sub_no" value={formData.sub_no || ''} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">담당부서</label>
          <input type="text" name="dept" value={formData.dept || ''} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트명 *</label>
        <input type="text" name="project_name" value={formData.project_name || ''} onChange={handleChange} required className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트코드</label>
          <input type="text" name="project_code" value={formData.project_code || ''} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">수행방식</label>
          <input type="text" name="method" value={formData.method || ''} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">BIM용역비</label>
          <input type="text" name="bim_cost" value={formData.bim_cost || ''} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">담당자</label>
        <input type="text" name="manager" value={formData.manager || ''} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">수행현황</label>
        <textarea name="status_detail" value={formData.status_detail || ''} onChange={handleChange} rows={3} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary" />
      </div>
    </>
  );

  const renderNormalForm = () => {
    const majorStr = MAJOR_CATEGORIES[formData.category];
    const middleStr = MIDDLE_CATEGORIES[formData.sub_category];
    const prefix = majorStr && middleStr ? `${majorStr}-${middleStr}-` : '';
    
    let existingCodesOptions = [];
    if (prefix && allTasks.length > 0) {
       existingCodesOptions = Array.from(new Set(allTasks.map(t=>t.task_code).filter(c=>c&&c.startsWith(prefix)))).sort();
    }

    return (
    <>
      <div className="flex gap-6 mb-4 mt-2 px-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="codeMode" checked={codeMode === 'new'} onChange={() => setCodeMode('new')} disabled={!!task} className="text-primary w-4 h-4 cursor-pointer focus:ring-primary" />
          <span className={`text-sm font-medium ${codeMode==='new' ? 'text-gray-800':'text-gray-500'}`}>신규 번호 자동 발급</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="codeMode" checked={codeMode === 'existing'} onChange={() => setCodeMode('existing')} disabled={!!task} className="text-primary w-4 h-4 cursor-pointer focus:ring-primary" />
          <span className={`text-sm font-medium ${codeMode==='existing' ? 'text-gray-800':'text-gray-500'}`}>기존 번호 재사용</span>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">대분류</label>
          <select name="category" value={formData.category || ''} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary">
            <option value="">선택</option>
            {Object.keys(MAJOR_CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">중분류</label>
          <select name="sub_category" value={formData.sub_category || ''} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary">
            <option value="">선택</option>
            {Object.keys(MIDDLE_CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">업무코드</label>
          {codeMode === 'new' || !!task ? (
             <input type="text" name="task_code" value={formData.task_code || ''} readOnly className="w-full rounded-lg border-gray-100 bg-gray-50 border p-2 text-gray-500 font-mono" placeholder="대/중분류 선택 시 자동 생성" />
          ) : (
             <select name="task_code" value={formData.task_code || ''} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary">
                <option value="">기존 코드 선택</option>
                {existingCodesOptions.map(code => <option key={code} value={code}>{code}</option>)}
             </select>
          )}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">주요내용 *</label>
        <textarea name="content" value={formData.content || ''} onChange={handleChange} required rows={3} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">수행인원 (쉼표로 구분)</label>
          <input type="text" name="assignees" value={formData.assignees || ''} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">우선순위 *</label>
            <select name="priority" value={formData.priority || '중간'} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary">
              <option value="높음">높음</option>
              <option value="중간">중간</option>
              <option value="낮음">낮음</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">진행 상태 *</label>
            <select name="status" value={formData.status || '진행 중'} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary">
              <option value="완료">완료</option>
              <option value="진행 중">진행 중</option>
              <option value="보류">보류</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
          <input type="date" name="start_date" value={formData.start_date || ''} onChange={handleChange} required className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">종료일 (옵션)</label>
          <input type="date" name="end_date" value={formData.end_date || ''} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary" />
        </div>
      </div>
      
      {hasNote && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
          <input type="text" name="note" value={formData.note || ''} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary" />
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">공유회의/결과보고 (옵션)</label>
        <input type="text" name="meeting_result" value={formData.meeting_result || ''} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary" />
      </div>
    </>
  );
};

  return (
    <div className="fixed inset-0 min-h-screen bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] px-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 mt-[-10vh] max-h-[85vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-xl font-bold flex flex-col gap-1">
            <span className="text-gray-900">{task ? '업무 수정' : '업무 추가'}</span>
            <span className="text-xs text-primary font-medium">{team}</span>
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="task-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            {isSchedule ? renderScheduleForm() : (isProject ? renderProjectForm() : renderNormalForm())}
          </form>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            취소
          </button>
          <button type="submit" form="task-form" className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary to-primary-light rounded-lg hover:shadow-lg transition-all">
            {task ? '저장' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskFormModal;
