import React, { useState } from 'react';
import { Edit2, Save, Plus, Trash2, Calendar as CalIcon, CheckCircle2, Circle, Settings2 } from 'lucide-react';
import { format, addDays, startOfMonth, getDaysInMonth } from 'date-fns';

const TEAMS = ['R&D센터, 기술연구소', '스마트 기술 개발팀', '디지털 기술 연구팀', '인프라 BIM팀', 'AI 응용팀'];
const USERS = [
  { team: 'R&D센터, 기술연구소', name: '김영근 부사장' },
  { team: 'R&D센터, 기술연구소', name: '차정석 이사' },
  { team: 'AI 응용팀', name: '장민욱 차장' },
  { team: 'AI 응용팀', name: '한형서 사원' },
  { team: '인프라 BIM팀', name: '이동근 이사대우' },
  { team: '인프라 BIM팀', name: '나기태 부장' },
  { team: '스마트 기술 개발팀', name: '임문구 상무' },
  { team: '스마트 기술 개발팀', name: '김진희 부장' },
  { team: '스마트 기술 개발팀', name: '이정선 대리' },
  { team: '디지털 기술 연구팀', name: '이충재 이사대우' },
  { team: '디지털 기술 연구팀', name: '박도해 차장' },
];

const CirculationBoard = ({ currentWeek, currentUser, isFullscreenMode }) => {
  // ─── 1. 교육/설문 취합 State ───
  const [surveyInfo, setSurveyInfo] = useState({
    title: '2026년 상반기 산업보안교육 참석/이수 조사',
    deadline: '2026-05-31',
    statusColName: '이수여부',
    trueLabel: '이수',
    falseLabel: '미이수',
    isEditing: false
  });
  
  const [surveyData, setSurveyData] = useState(
    USERS.map((u, i) => ({ id: i, ...u, status: i % 3 === 0, note: '' }))
  );

  // ─── 2. 자산/IP 등 자유 폼 State ───
  const [customForm, setCustomForm] = useState({
    title: '휴대전화 및 노트북/아이패드 IP 주소 등록',
    columns: ['휴대전화', '노트북/아이패드 IP', '비고'],
    isEditingConfig: false
  });
  const [customData, setCustomData] = useState(
    USERS.map((u, i) => ({
      id: i, ...u, 
      values: {
        '휴대전화': i === 0 ? '010-1234-5678' : '',
        '노트북/아이패드 IP': i === 1 ? '107.191.17.151' : '',
        '비고': ''
      }
    }))
  );

  // ─── 3. 하계 휴가 달력 State ───
  const currentYear = new Date().getFullYear();
  const [vacations, setVacations] = useState([
    { name: '김영근 부사장', date: `${currentYear}-07-28`, type: '연차' },
    { name: '김영근 부사장', date: `${currentYear}-07-29`, type: '연차' },
    { name: '김진희 부장', date: `${currentYear}-08-05`, type: '오전반차' },
    { name: '이정선 대리', date: `${currentYear}-08-10`, type: '오후반차' },
  ]);

  // ─── Handlers ───
  const handleSurveyToggle = (id) => {
    setSurveyData(prev => prev.map(item => 
      item.id === id ? { ...item, status: !item.status } : item
    ));
  };
  
  const handleSurveyNoteChange = (id, val) => {
    setSurveyData(prev => prev.map(item => item.id === id ? { ...item, note: val } : item));
  };

  const handleCustomDataChange = (id, col, val) => {
    setCustomData(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, values: { ...item.values, [col]: val } };
      }
      return item;
    }));
  };

  const completedCount = surveyData.filter(d => d.status).length;
  const totalCount = surveyData.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // 달력 렌더링용 함수
  const generateDaysForMonth = (month) => {
    const start = new Date(currentYear, month - 1, 1);
    const daysInMonth = getDaysInMonth(start);
    const days = [];
    for (let i = 0; i < daysInMonth; i++) {
      const d = addDays(start, i);
      days.push({
        dateStr: format(d, 'yyyy-MM-dd'),
        dayNum: format(d, 'd'),
        dayOfWeek: format(d, 'E'), // Mon, Tue...
        isWeekend: d.getDay() === 0 || d.getDay() === 6
      });
    }
    return days;
  };

  const julyDays = generateDaysForMonth(7);
  const augustDays = generateDaysForMonth(8);
  const allSummerDays = [...julyDays, ...augustDays];

  // ─── 4. 탭 State ───
  const TABS = ['교육/설문 취합', '기타 조사', '하계 휴가 일정'];
  const [activeTab, setActiveTab] = useState(TABS[0]);

  return (
    <div className={`flex flex-col gap-6 pb-10 animate-in fade-in duration-300 ${isFullscreenMode ? 'px-4' : ''}`}>
      
      {/* ─── 상단 탭 네비게이션 ─── */}
      <div className="flex border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-4 font-bold text-sm border-b-2 transition-all ${
              activeTab === tab ? 'border-kh-green text-kh-green bg-kh-green/5' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ─── 섹션 1: 교육/설문 취합 ─── */}
      {activeTab === TABS[0] && (
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-slate-800 px-6 py-4 flex justify-between items-center text-white circulation-dark-header">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-white" />
            </div>
            {surveyInfo.isEditing ? (
              <div className="flex-1 flex items-center gap-4">
                <input 
                  type="text" value={surveyInfo.title}
                  onChange={(e) => setSurveyInfo({...surveyInfo, title: e.target.value})}
                  className="px-3 py-1.5 rounded bg-white/10 border border-white/30 text-white placeholder-white/50 w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-kh-green font-bold text-lg"
                  placeholder="조사 제목 입력"
                />
                <input 
                  type="date" value={surveyInfo.deadline}
                  onChange={(e) => setSurveyInfo({...surveyInfo, deadline: e.target.value})}
                  className="px-3 py-1.5 rounded bg-white/10 border border-white/30 text-white focus:outline-none"
                />
                <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded border border-white/10">
                  <input 
                    type="text" value={surveyInfo.statusColName || '이수여부'}
                    onChange={(e) => setSurveyInfo({...surveyInfo, statusColName: e.target.value})}
                    className="px-3 py-1 rounded bg-white/10 border border-white/30 text-white placeholder-white/50 w-24 focus:outline-none focus:ring-2 focus:ring-kh-green font-bold text-xs"
                    placeholder="상태 열 이름"
                  />
                  <div className="h-4 w-px bg-white/20 mx-1"></div>
                  <span className="text-xs text-white/70">O 값:</span>
                  <input 
                    type="text" value={surveyInfo.trueLabel || '이수'}
                    onChange={(e) => setSurveyInfo({...surveyInfo, trueLabel: e.target.value})}
                    className="px-2 py-1 rounded bg-white/10 border border-white/30 text-white placeholder-white/50 w-16 focus:outline-none focus:ring-2 focus:ring-kh-green font-bold text-xs text-center"
                  />
                  <span className="text-xs text-white/70 ml-2">X 값:</span>
                  <input 
                    type="text" value={surveyInfo.falseLabel || '미이수'}
                    onChange={(e) => setSurveyInfo({...surveyInfo, falseLabel: e.target.value})}
                    className="px-2 py-1 rounded bg-white/10 border border-white/30 text-white placeholder-white/50 w-16 focus:outline-none focus:ring-2 focus:ring-kh-green font-bold text-xs text-center"
                  />
                </div>
                <button onClick={() => setSurveyInfo({...surveyInfo, isEditing: false})} className="px-3 py-1.5 bg-kh-green text-white rounded hover:bg-kh-green/80 font-bold text-sm">
                  저장
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold !text-white">{surveyInfo.title}</h3>
                <p className="text-sm text-slate-300 mt-1 flex items-center gap-2">
                  <CalIcon size={14} /> 제출기한: <span className="font-bold text-kh-lime">{surveyInfo.deadline}</span>
                </p>
              </div>
            )}
          </div>
          {!surveyInfo.isEditing && (
            <button onClick={() => setSurveyInfo({...surveyInfo, isEditing: true})} className="p-2 text-slate-300 hover:text-white transition-colors">
              <Edit2 size={18} />
            </button>
          )}
        </div>

        {/* Progress */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-6">
          <div className="flex-1">
            <div className="flex justify-between text-sm font-bold text-gray-600 mb-1">
              <span>진행률</span>
              <span className="text-kh-green">{progressPercent}% ({completedCount}/{totalCount})</span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-kh-green transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left circulation-table">
            <thead className="bg-gray-50/50 text-gray-500 font-bold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 w-20">성명</th>
                <th className="px-6 py-3 w-32 text-center">{surveyInfo.statusColName || '이수여부'}</th>
                <th className="px-6 py-3 min-w-[200px]">비고 (사유 등)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {TEAMS.map(team => (
                <React.Fragment key={team}>
                  <tr className="bg-blue-50/50">
                    <td colSpan={3} className="px-6 py-2 font-black text-blue-800 text-xs tracking-tight border-b border-blue-100 text-left team-cell">{team}</td>
                  </tr>
                  {surveyData.filter(r => r.team === team).map((row) => (
                    <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-3 font-bold text-gray-800 pl-8 flex items-center gap-2 whitespace-nowrap text-left name-cell">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-200 shrink-0"></div>
                        {row.name}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button 
                          onClick={() => handleSurveyToggle(row.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs transition-colors ${
                            row.status ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {row.status ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                          {row.status ? (surveyInfo.trueLabel || '이수') : (surveyInfo.falseLabel || '미이수')}
                        </button>
                      </td>
                      <td className="px-6 py-3">
                        <input 
                          type="text" 
                          value={row.note} 
                          onChange={(e) => handleSurveyNoteChange(row.id, e.target.value)}
                          placeholder="입력..."
                          className="w-full bg-transparent border-none focus:ring-0 text-sm text-gray-700 placeholder-gray-300"
                        />
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {/* ─── 섹션 2: 자산/IP 등 자유 폼 ─── */}
      {activeTab === TABS[1] && (
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-slate-800 px-6 py-4 flex justify-between items-center text-white circulation-dark-header">
          {customForm.isEditingConfig ? (
            <div className="flex-1 flex items-center gap-4">
              <input 
                type="text" value={customForm.title}
                onChange={(e) => setCustomForm({...customForm, title: e.target.value})}
                className="px-3 py-1.5 rounded border border-gray-300 font-bold w-1/2"
              />
              <button onClick={() => setCustomForm({...customForm, isEditingConfig: false})} className="px-3 py-1.5 bg-gray-800 text-white rounded text-sm font-bold">
                설정 완료
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-bold !text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Settings2 size={20} className="text-white" />
                </div>
                {customForm.title}
              </h3>
              <button onClick={() => setCustomForm({...customForm, isEditingConfig: true})} className="p-2 text-slate-300 hover:text-white transition-colors">
                <Edit2 size={18} />
              </button>
            </>
          )}
        </div>

        {customForm.isEditingConfig && (
          <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-100 flex items-center gap-4">
            <span className="text-sm font-bold text-yellow-800">컬럼 관리:</span>
            {customForm.columns.map((col, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-yellow-200 text-sm">
                <span>{col}</span>
                <button 
                  onClick={() => setCustomForm({...customForm, columns: customForm.columns.filter((_, i) => i !== idx)})}
                  className="text-red-400 hover:text-red-600 ml-1"><Trash2 size={12} /></button>
              </div>
            ))}
            <button 
              onClick={() => {
                const newCol = prompt("새 컬럼 이름");
                if (newCol) setCustomForm({...customForm, columns: [...customForm.columns, newCol]});
              }}
              className="text-sm text-blue-600 font-bold flex items-center gap-1 ml-2"><Plus size={14}/> 추가</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left circulation-table">
            <thead className="bg-white text-gray-500 font-bold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 w-20">성명</th>
                {customForm.columns.map(col => (
                  <th key={col} className="px-6 py-3 min-w-[150px] border-l border-gray-100">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {TEAMS.map(team => (
                <React.Fragment key={team}>
                  <tr className="bg-blue-50/50">
                    <td colSpan={customForm.columns.length + 1} className="px-6 py-2 font-black text-blue-800 text-xs tracking-tight border-b border-blue-100 text-left team-cell">{team}</td>
                  </tr>
                  {customData.filter(r => r.team === team).map(row => (
                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 font-bold text-gray-800 pl-8 flex items-center gap-2 whitespace-nowrap text-left name-cell">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-200 shrink-0"></div>
                        {row.name}
                      </td>
                      {customForm.columns.map(col => (
                        <td key={col} className="p-0 border-l border-gray-100">
                          <input 
                            type="text"
                            value={row.values[col] || ''}
                            onChange={(e) => handleCustomDataChange(row.id, col, e.target.value)}
                            className="w-full h-full min-h-[40px] px-6 py-3 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-blue-500 text-gray-700"
                            placeholder="입력..."
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {/* ─── 섹션 3: 하계 휴가 달력 ─── */}
      {activeTab === TABS[2] && (
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-slate-800 px-6 py-4 flex justify-between items-center text-white circulation-dark-header">
          <h3 className="text-xl font-bold !text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <CalIcon size={20} className="text-white" />
            </div>
            {currentYear}년 임직원 하계 휴가 일정
          </h3>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-300">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-400"></div>연차</div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 relative bg-white/10 rounded overflow-hidden">
                <div className="absolute top-0 left-0 right-0 bottom-1/2 bg-orange-400"></div>
              </div>
              오전반차
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 relative bg-white/10 rounded overflow-hidden">
                <div className="absolute top-1/2 left-0 right-0 bottom-0 bg-orange-400"></div>
              </div>
              오후반차
            </div>
            {!isFullscreenMode && (
              <>
                <div className="h-4 w-px bg-slate-600 mx-1"></div>
                <div className="text-kh-lime border border-kh-lime/30 bg-kh-lime/10 px-2 py-1 rounded text-[11px]">타임시트 자동 연동 중</div>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto pb-4">
          <table className="w-max min-w-full text-sm border-collapse table-fixed circulation-table vacation-table">
            <thead>
              {/* 월 헤더 */}
              <tr>
                <th className="bg-white border-b border-r border-gray-200 p-2"></th>
                <th colSpan={julyDays.length} className="bg-blue-50/50 border-b border-r border-gray-200 p-2 text-center text-blue-800 font-black tracking-widest">7월</th>
                <th colSpan={augustDays.length} className="bg-orange-50/50 border-b border-gray-200 p-2 text-center text-orange-800 font-black tracking-widest">8월</th>
              </tr>
              {/* 일/요일 헤더 */}
              <tr>
                <th className="bg-white border-b border-r border-gray-200 px-4 py-2 w-[100px] min-w-[100px] max-w-[100px] font-bold text-gray-500"></th>
                {allSummerDays.map((day, i) => (
                  <th key={i} className={`border-b border-r border-gray-200 w-[36px] min-w-[36px] max-w-[36px] text-center p-1 overflow-hidden ${day.isWeekend ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <div className={`text-[10px] ${day.isWeekend ? 'text-red-400' : 'text-gray-400'}`}>{day.dayOfWeek}</div>
                    <div className={`text-xs font-bold ${day.isWeekend ? 'text-red-600' : 'text-gray-800'}`}>{day.dayNum}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TEAMS.map(team => (
                <React.Fragment key={team}>
                  <tr>
                    <td colSpan={allSummerDays.length + 1} className="bg-blue-50/50 border-b border-r border-gray-200 px-4 py-2 font-black text-blue-800 text-xs tracking-tight text-left team-cell">{team}</td>
                  </tr>
                  {USERS.filter(u => u.team === team).map((user) => (
                    <tr key={user.name} className="hover:bg-gray-50/50">
                      <td className="border-b border-r border-gray-200 px-4 py-2 text-sm text-gray-800 font-bold whitespace-nowrap pl-6 flex items-center gap-2 text-left name-cell">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-200 shrink-0"></div>
                        {user.name}
                      </td>
                      {allSummerDays.map((day, i) => {
                        const vac = vacations.find(v => v.name === user.name && v.date === day.dateStr);
                        return (
                          <td key={i} className={`border-b border-r border-gray-100 text-center relative p-0 w-[36px] min-w-[36px] max-w-[36px] ${day.isWeekend ? 'bg-red-50/30' : ''}`}>
                            {vac && (
                              <div 
                                className={`absolute rounded-sm ${
                                  vac.type === '연차' ? 'inset-[2px] bg-blue-400' :
                                  vac.type === '오전반차' ? 'top-[2px] left-[2px] right-[2px] bottom-[50%] bg-orange-400' :
                                  vac.type === '오후반차' ? 'top-[50%] left-[2px] right-[2px] bottom-[2px] bg-orange-400' :
                                  'inset-[2px] bg-orange-400'
                                }`} 
                                title={`${vac.type}`}
                              >
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

    </div>
  );
};

export default CirculationBoard;
