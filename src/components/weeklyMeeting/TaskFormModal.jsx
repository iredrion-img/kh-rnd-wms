import React, { useState, useEffect, useRef } from 'react';
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



const TaskFormModal = ({ team, task, onClose, onSave, currentWeek, isFromTimesheet }) => {
  const [formData, setFormData] = useState({});
  const currentTeam = formData.team || team;
  const isProject = currentTeam === '프로젝트 추진 및 수행 현황';
  const isSchedule = currentTeam === '주간일정';

  const availableTeams = isFromTimesheet ? [
      '공통업무&행정', '연구과제', '스마트 기술 개발팀', '디지털 기술 연구팀', '인프라 BIM팀', 'AI 응용팀'
  ] : [
      '공지사항', '공통업무&행정', '스마트 기술 개발팀', '디지털 기술 연구팀', '인프라 BIM팀', 'AI 응용팀', '연구과제', '프로젝트 추진 및 수행 현황'
  ];

  const [allTasks, setAllTasks] = useState([]);
  // 수정 모드에서는 기존 코드가 있으므로 기본값을 'existing'으로 설정
  const [codeMode, setCodeMode] = useState(task ? 'existing' : 'new'); // 'new' | 'existing'
  const [usersInfo, setUsersInfo] = useState([]);
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [isMethodBaseDropdownOpen, setIsMethodBaseDropdownOpen] = useState(false);
  const [isManagerDropdownOpen, setIsManagerDropdownOpen] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    fetch('/api/users')
      .then(res => {
        if (!res.ok) throw new Error('Users fetch failed');
        return res.json();
      })
      .then(data => {
        const usersArray = Array.isArray(data) ? data : [];
        setUsersInfo(usersArray);
        console.log('[DEBUG] UsersInfo loaded:', usersArray.length);
      })
      .catch(err => {
        console.error('[DEBUG] Users fetch error:', err);
        setUsersInfo([]);
      });

    if (!isSchedule) {
      const endpoint = isProject ? '/api/projects' : '/api/weekly-tasks';
      fetch(endpoint)
        .then(res => res.json())
        .then(data => setAllTasks(Array.isArray(data) ? data : []))
        .catch(console.error);
    }
  }, [isProject, isSchedule, task]);

  useEffect(() => {
    if (task) {
      let base = '';
      let detail = '';
      if (task.method) {
         const methods = ["직접수행(합사)", "직접수행", "외주", "미정", "수행예정", "추진중"];
         let tempStr = task.method;
         const extractedBases = [];
         methods.forEach(b => {
           const idx = task.method.indexOf(b);
           if (idx !== -1) {
             extractedBases.push({ base: b, idx });
             tempStr = tempStr.replace(b, '').trim();
           }
         });
         extractedBases.sort((a, b) => a.idx - b.idx);
         base = extractedBases.map(item => item.base).join(', ');
         detail = tempStr.replace(/^[, ]+/, '').replace(/[, ]+$/, '').trim();
      }
      setFormData({ ...task, method_base: base, method_detail: detail });
    } else if (!initialized.current) {
      const authDataStr = localStorage.getItem('kh_current_user');
      const currentUserLocal = authDataStr ? JSON.parse(authDataStr) : null;
      const initialAssignees = currentUserLocal?.name || '';

      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000; 
      const today = new Date(now.getTime() - offset).toISOString().split('T')[0];

      const baseData = {
        team: team,
        status: '진행 중',
        priority: '중간',
        start_date: today,
        end_date: today,
        assignees: initialAssignees
      };

      if (isProject) {
        setFormData({ ...baseData, status_detail: '' });
      } else if (isSchedule) {
        setFormData({ ...baseData, schedule_type: '', content: '' });
      } else {
        const initialTeam = isFromTimesheet && !availableTeams.includes(team) ? availableTeams[0] : team;
        setFormData({ ...baseData, team: initialTeam });
      }
      initialized.current = true;
    }
  }, [task, team, currentWeek]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
        const updated = { ...prev, [name]: value };
        
        // 시작일 변경 시 종료일 자동 동기화
        if (name === 'start_date') {
            const now = new Date();
            const offset = now.getTimezoneOffset() * 60000;
            const todayStr = new Date(now.getTime() - offset).toISOString().split('T')[0];
            
            if (value > todayStr) {
                // 미래인 경우 시작일과 종료일 동기화
                updated.end_date = value;
            } else {
                // 과거이거나 오늘인 경우 종료일을 오늘로 유지
                updated.end_date = todayStr;
            }
        }

        if (name === 'method_base' || name === 'method_detail') {
             const b = updated.method_base || '';
             const d = updated.method_detail || '';
             updated.method = b && d ? `${b}, ${d}` : (b || d);
        }
        return updated;
    });
  };

  useEffect(() => {
    // '기존 코드 사용' 모드이거나, 수정 중 분류를 바꾸지 않았으면 자동 채번을 건너뜀
    if (codeMode === 'existing') return;
    if (task && formData.category === task.category && formData.sub_category === task.sub_category) return;
    if (isSchedule) return;

    if (isProject) {
        if (formData.category) {
            const prefixRegex = new RegExp(`^${formData.category}\\s*-\\s*(?!\\s*$)`, 'i');
            const matchingCodes = allTasks.map(t=>t.project_code || t.task_code).filter(c=>c&&prefixRegex.test(c));
            let maxNum = 0;
            matchingCodes.forEach(c => {
                const match = c.trim().match(/\d+$/);
                if (match) {
                    const num = parseInt(match[0], 10);
                    if (num > maxNum) maxNum = num;
                }
            });
            const nextSubNo = String(maxNum + 1).padStart(3, '0');
            const nextCode = `${formData.category}-${nextSubNo}`;
            setFormData(prev => prev.project_code !== nextCode ? { ...prev, sub_no: nextSubNo, project_code: nextCode } : prev);
        } else {
            setFormData(prev => prev.project_code ? { ...prev, project_code: '', sub_no: '' } : prev);
        }
        return;
    }

    const majorStr = MAJOR_CATEGORIES[formData.category];
    const middleStr = MIDDLE_CATEGORIES[formData.sub_category];
    
    if (majorStr && middleStr) {
       const prefix = `${majorStr}-${middleStr}-`;
       const matchingCodes = allTasks.map(t=>t.task_code).filter(c => c && c.toUpperCase().startsWith(prefix));
       let maxNum = 0;
       matchingCodes.forEach(c => {
           const m = c.trim().match(/\d+$/);
           if (m) {
               const num = parseInt(m[0], 10);
               if (num > maxNum) maxNum = num;
           }
       });
       const nextCode = `${prefix}${String(maxNum+1).padStart(3,'0')}`;
       setFormData(prev => prev.task_code !== nextCode ? { ...prev, task_code: nextCode } : prev);
    } else {
       setFormData(prev => prev.task_code && (prev.category || prev.sub_category) ? { ...prev, task_code: '' } : prev);
    }
  }, [formData.category, formData.sub_category, codeMode, allTasks, task, isProject, isSchedule]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const hasNote = team === '스마트 기술 개발팀';

  const renderMultiUserSelector = (fieldName, labelText, isOpen, setOpen, showGroups = true) => {
    const selected = formData[fieldName] ? formData[fieldName].split(',').map(s=>s.trim()).filter(Boolean) : [];
    
    const toggleUser = (name) => {
        let newUsers;
        if (selected.includes(name)) newUsers = selected.filter(n => n !== name);
        else newUsers = [...selected, name];
        setFormData(prev => ({ ...prev, [fieldName]: newUsers.join(', ') }));
    };

    const groupedUsers = (usersInfo || []).reduce((acc, u) => {
        const dept = u.department || '기타';
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push(u);
        return acc;
    }, {});

    return (
      <div className="relative w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">{labelText}</label>
        <div 
           className="w-full rounded-lg border-gray-300 border p-2 min-h-[42px] cursor-pointer bg-white flex flex-wrap gap-1.5 items-center focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all"
           onClick={() => setOpen(!isOpen)}
        >
           {selected.length === 0 ? (
              <span className="text-gray-400 text-sm py-0.5 px-1">선택</span>
           ) : (
              selected.map(name => (
                 <span key={name} className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 hover:bg-primary/20 transition-colors" onClick={(e) => { e.stopPropagation(); toggleUser(name); }}>
                    {name}
                    <X className="w-3 h-3 ml-0.5" />
                 </span>
              ))
           )}
        </div>

        {isOpen && (
           <>
             <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}></div>
             <div className="absolute z-50 mt-2 w-full max-h-72 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-2xl p-4 grid gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                 {Object.keys(groupedUsers).length === 0 ? (
                    <div className="text-center text-sm text-gray-500 py-4">사용자 정보를 불러오는 중...</div>
                 ) : (
                    <>
                       {/* 그룹 태그 추가 */}
                       {showGroups && (
                         <div className="flex flex-col gap-2 pb-3 border-b border-gray-100 mb-1">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">조직 그룹</div>
                            <div className="flex flex-wrap gap-2">
                               {['All', '스마트 기술 개발팀', '디지털 기술 연구팀', '인프라 BIM팀', 'AI 응용팀'].map(group => {
                                  const isSelected = selected.includes(group);
                                  return (
                                    <button 
                                      key={group} 
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); toggleUser(group); }}
                                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center ${isSelected ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-100'}`}
                                    >
                                      {group}
                                    </button>
                                  );
                               })}
                            </div>
                         </div>
                       )}
                       
                       {/* 기존 부서별 유저 렌더링 */}
                       {Object.entries(groupedUsers).map(([dept, usrs]) => (
                      <div key={dept} className="flex flex-col gap-2">
                         <div className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">{dept}</div>
                         <div className="flex flex-wrap gap-2">
                            {usrs.map(u => {
                               const isSelected = selected.includes(u.name);
                               return (
                                 <button 
                                   key={u.name} 
                                   type="button"
                                   onClick={(e) => { e.stopPropagation(); toggleUser(u.name); }}
                                   className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center ${isSelected ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-100'}`}
                                 >
                                   {u.name} {u.role === 'admin' && <span className="ml-1 opacity-70 text-[10px]">⭐</span>}
                                 </button>
                               );
                            })}
                         </div>
                       </div>
                    ))
                    }
                    </>
                 )}
              </div>
           </>
        )}
      </div>
    );
  };

  const renderAssigneeSelector = () => renderMultiUserSelector('assignees', '수행인원 *', isAssigneeDropdownOpen, setIsAssigneeDropdownOpen);

  const renderScheduleForm = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">업무분야 *</label>
          <select name="schedule_type" value={formData.schedule_type || ''} onChange={handleChange} required className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary">
            <option value="">선택</option>
            <option value="합사">합사</option>
            <option value="업무협의">업무협의</option>
            <option value="프로젝트">프로젝트</option>
            <option value="부서지원">부서지원</option>
            <option value="연구과제">연구과제</option>
            <option value="매뉴얼작성">매뉴얼작성</option>
            <option value="TFT">TFT</option>
            <option value="행정">행정</option>
            <option value="휴가">휴가</option>
            <option value="세미나">세미나</option>
            <option value="교육">교육</option>
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
        {renderAssigneeSelector()}
      </div>
    </>
  );

  const renderMethodBaseSelector = () => {
    const selected = formData.method_base ? formData.method_base.split(',').map(s=>s.trim()).filter(Boolean) : [];
    
    const toggleMethodBase = (val) => {
        let newBases;
        if (selected.includes(val)) newBases = selected.filter(n => n !== val);
        else newBases = [...selected, val];
        
        const updatedBase = newBases.join(', ');
        
        setFormData(prev => {
            const b = updatedBase;
            const d = prev.method_detail || '';
            return {
                ...prev,
                method_base: b,
                method: b && d ? `${b}, ${d}` : (b || d)
            };
        });
    };

    const bases = ["직접수행", "직접수행(합사)", "외주", "미정", "수행예정", "추진중"];

    return (
      <div className="relative w-full">
        <div 
           className="w-full rounded-lg border-gray-300 border p-2 min-h-[42px] cursor-pointer bg-white flex flex-wrap gap-1.5 items-center focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all"
           onClick={() => setIsMethodBaseDropdownOpen(!isMethodBaseDropdownOpen)}
        >
           {selected.length === 0 ? (
              <span className="text-gray-400 text-sm py-0.5 px-1">선택</span>
           ) : (
              selected.map(val => (
                 <span key={val} className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 hover:bg-primary/20 transition-colors" onClick={(e) => { e.stopPropagation(); toggleMethodBase(val); }}>
                    {val}
                    <X className="w-3 h-3 ml-0.5" />
                 </span>
              ))
           )}
        </div>

        {isMethodBaseDropdownOpen && (
           <>
             <div className="fixed inset-0 z-40" onClick={() => setIsMethodBaseDropdownOpen(false)}></div>
             <div className="absolute z-50 mt-2 w-full max-h-72 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-2xl p-4 grid gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-wrap gap-2">
                   {bases.map(b => {
                      const isSelected = selected.includes(b);
                      return (
                        <button 
                          key={b} 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleMethodBase(b); }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center ${isSelected ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-100'}`}
                        >
                          {b}
                        </button>
                      );
                   })}
                </div>
             </div>
           </>
        )}
      </div>
    );
  };

  const renderProjectForm = () => {
    let existingProjectNumbers = [];
    if (formData.category && allTasks.length > 0) {
      const prefixRegex = new RegExp(`^${formData.category}\\s*-\\s*(?!\\s*$)`, 'i');
      const nums = allTasks
          .map(t => t.project_code || t.task_code)
          .filter(c => c && prefixRegex.test(c.trim()))
          .map(c => {
             const m = c.trim().match(/\d+$/);
             return m ? m[0] : null;
          })
          .filter(Boolean);
      existingProjectNumbers = Array.from(new Set(nums)).sort();
    }
    
    let existingMethodDetails = [];
    if (allTasks) {
       const details = [];
       const bases = ["직접수행(합사)", "직접수행", "외주", "미정", "수행예정", "추진중"];
       allTasks.forEach(t => {
          if (t.method) {
             let foundBase = '';
             for (const b of bases) {
                 if (t.method.startsWith(b)) { foundBase = b; break; }
             }
             if (foundBase) {
                 let d = t.method.substring(foundBase.length).replace(/^[, ]+/, '').trim();
                 if (d) details.push(d);
             } else {
                 if (t.method.trim()) details.push(t.method.trim());
             }
          }
       });
       existingMethodDetails = Array.from(new Set(details))
          .filter(Boolean)
          .filter(d => !bases.includes(d))
          .sort();
    }
    
    let existingDepartments = [];
    if (allTasks) {
       const depts = allTasks.map(t => t.dept).filter(Boolean).map(d => d.trim().replace(/^[, ]+/, ''));
       existingDepartments = Array.from(new Set(depts)).sort();
    }

    return (
    <>
      <div className="mb-4 bg-gray-50/80 p-3 rounded-lg border border-gray-100 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 min-w-max mr-4">분류</label>
        <select name="team" value={formData.team || team} onChange={handleChange} className="w-full rounded-md border-gray-300 border py-1.5 px-3 focus:ring-primary focus:border-primary text-sm font-medium bg-white">
          {availableTeams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트 분류</label>
          <select name="category" value={formData.category || ''} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary">
            <option value="">선택</option>
            <option value="AI">AI</option>
            <option value="BIM">BIM</option>
            <option value="R&D">R&D</option>
          </select>
        </div>
        <div>
           <div className="flex items-center justify-between mb-1">
             <label className="block text-sm font-medium text-gray-700">소분류</label>
             {!task && (
               <label className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                 <input 
                   type="checkbox" 
                   checked={codeMode === 'existing'} 
                   onChange={(e) => {
                       setCodeMode(e.target.checked ? 'existing' : 'new');
                       setFormData(prev => ({...prev, sub_no: '', project_code: ''}));
                   }} 
                   className="rounded border-gray-300 text-primary focus:ring-primary w-3.5 h-3.5"
                 />
                 <span className="text-xs text-gray-500 font-medium whitespace-nowrap">기존 코드 사용</span>
               </label>
             )}
           </div>
           {codeMode === 'new' || !!task ? (
             <input type="text" name="sub_no" value={formData.sub_no || ''} readOnly className="w-full rounded-lg border-gray-100 bg-gray-50 border p-2 text-gray-500 font-mono text-center" placeholder="분류 시 자동생성" />
           ) : (
             <select name="sub_no" value={formData.sub_no || ''} onChange={(e) => {
                 const newNo = e.target.value;
                 setFormData(prev => ({ ...prev, sub_no: newNo, project_code: prev.category && newNo ? `${prev.category} - ${newNo}` : '' }));
             }} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary text-center">
                <option value="">번호 선택</option>
                {existingProjectNumbers.map(num => <option key={num} value={num}>{num}</option>)}
             </select>
           )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">순번</label>
          <input type="text" name="project_code" value={formData.project_code || ''} readOnly className="w-full rounded-lg border-gray-100 bg-gray-50 border p-2 text-gray-500 font-mono" placeholder="자동 생성" />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트명 *</label>
        <input type="text" name="project_name" value={formData.project_name || ''} onChange={handleChange} required className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary" />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">수행방식</label>
        <div className="grid grid-cols-2 gap-4">
           {renderMethodBaseSelector()}
           <input type="text" name="method_detail" value={formData.method_detail || ''} onChange={handleChange} placeholder="기타 직접입력 또는 기존항목 선택" className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary" />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">BIM 용역비</label>
          <input type="text" name="bim_cost" value={formData.bim_cost || ''} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">설계담당부서</label>
          <input type="text" list="dept_list" name="dept" value={formData.dept || ''} onChange={handleChange} placeholder="부서 선택 및 입력" className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary" />
          <datalist id="dept_list">
             {existingDepartments.map(d => <option key={d} value={d} />)}
          </datalist>
        </div>
        <div>
          {renderMultiUserSelector('manager', '담당자', isManagerDropdownOpen, setIsManagerDropdownOpen, false)}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">수행현황</label>
        <textarea name="status_detail" value={formData.status_detail || ''} onChange={handleChange} rows={3} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary" />
      </div>
    </>
  );
  };

  const renderNormalForm = () => {
    const majorStr = MAJOR_CATEGORIES[formData.category];
    const middleStr = MIDDLE_CATEGORIES[formData.sub_category];
    const prefix = majorStr && middleStr ? `${majorStr}-${middleStr}-` : '';
    
    // 신규 채번 모드 datalist용 + 기존 코드 모드 목록: prefix 필터 적용, 없으면 전체
    let existingCodesOptions = [];
    if (allTasks.length > 0) {
       const filtered = prefix 
         ? allTasks.map(t=>t.task_code).filter(c=>c&&c.toUpperCase().startsWith(prefix))
         : allTasks.map(t=>t.task_code).filter(Boolean);
       existingCodesOptions = Array.from(new Set(filtered)).sort();
    }

    return (
    <>
      <div className="mb-4 bg-gray-50/80 p-3 rounded-lg border border-gray-100 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 min-w-max mr-4">분류</label>
        <select name="team" value={formData.team || team} onChange={handleChange} className="w-full rounded-md border-gray-300 border py-1.5 px-3 focus:ring-primary focus:border-primary text-sm font-medium bg-white">
          {availableTeams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {formData.team !== '공지사항' && (
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
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">업무코드</label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
              <input
                type="checkbox"
                checked={codeMode === 'existing'}
                onChange={(e) => {
                  setCodeMode(e.target.checked ? 'existing' : 'new');
                  if (!e.target.checked) setFormData(prev => ({ ...prev, task_code: '' }));
                }}
                className="rounded border-gray-300 text-primary focus:ring-primary w-3.5 h-3.5"
              />
              <span className="text-xs text-gray-500 font-medium whitespace-nowrap">기존 코드 사용</span>
            </label>
          </div>
          {codeMode === 'existing' ? (
            <select name="task_code" value={formData.task_code || ''} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary">
              <option value="">기존 코드 선택</option>
              {existingCodesOptions.map(code => <option key={code} value={code}>{code}</option>)}
            </select>
          ) : (
            <>
              <input
                type="text"
                list="task_codes_datalist"
                name="task_code"
                value={formData.task_code || ''}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary font-mono text-sm bg-white"
                placeholder="대/중분류 선택 시 자동생성, 직접 수정 가능"
              />
              <datalist id="task_codes_datalist">
                {existingCodesOptions.map(code => <option key={code} value={code} />)}
              </datalist>
            </>
          )}
        </div>
      </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">주요내용 *</label>
        <textarea name="content" value={formData.content || ''} onChange={handleChange} required rows={3} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary" />
      </div>

      {formData.team !== '공지사항' && (
      <div className="grid grid-cols-2 gap-4">
        <div>
          {renderAssigneeSelector()}
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
              <option value="계획">계획</option>
              <option value="진행 중">진행 중</option>
              <option value="완료">완료</option>
              <option value="보류">보류</option>
              <option value="타절">타절</option>
            </select>
          </div>
        </div>
      </div>
      )}

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
      
      {formData.team !== '공지사항' && (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">공유회의/결과보고 (옵션)</label>
        <input type="date" name="meeting_result" value={formData.meeting_result || ''} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-primary focus:border-primary" />
      </div>
      )}
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

        <div className="p-6 overflow-y-auto flex-1 pb-48">
          <form id="task-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            {isSchedule ? renderScheduleForm() : (isProject ? renderProjectForm() : renderNormalForm())}
          </form>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            취소
          </button>
          <button type="submit" form="task-form" className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-kh-green to-kh-green/80 rounded-lg hover:shadow-lg hover:brightness-110 transition-all">
            {task ? '저장' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskFormModal;
