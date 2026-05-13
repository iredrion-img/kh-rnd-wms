import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BellRing, CalendarCheck, ChevronDown, UserMinus, Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// R&D센터 + 기술연구소는 함께 표시
// keys: DB에 저장된 실제 department 값 (공백 없음 기준, 공백 있는 값도 normalize 후 매칭)
const GROUPED_TEAMS = [
  { label: 'R&D센터, 기술연구소', keys: ['R&D센터', '기술연구소'] },
  { label: '스마트 기술 개발팀', keys: ['스마트기술개발팀', '스마트 기술 개발팀'] },
  { label: '디지털 기술 연구팀', keys: ['디지털기술연구팀', '디지털 기술 연구팀'] },
  { label: '인프라 BIM팀', keys: ['인프라BIM팀', '인프라 BIM팀'] },
  { label: 'AI 응용팀', keys: ['AI응용팀', 'AI 응용팀'] },
];

// 공백을 제거하여 부서명을 정규화 (DB값과 표시값 모두 허용)
const normalizeKey = (str) => (str || '').replace(/\s+/g, '');

const ATTENDANCE_STORAGE_KEY = (week) => `kh_attendance_${week}`;
const MEETING_DATE_STORAGE_KEY = (week) => `kh_meeting_date_${week}`;

// ── 메인 패널 ────────────────────────────────────────────────────
const MeetingOverviewPanel = ({ 
  currentWeek, currentUser, isAdmin, onAddNotice, onEditNotice, onDeleteNotice, refreshTrigger, 
  hideNoticeActions = false, // Full screen hides notices but allows overview edits
  hideOverviewActions = false 
}) => {
  const [users, setUsers] = useState([]);
  const [noticeTasks, setNoticeTasks] = useState([]);
  const [noticeLoading, setNoticeLoading] = useState(true);
  const [absentees, setAbsentees] = useState(new Set());
  const [meetingDateStr, setMeetingDateStr] = useState('');

  // 1. 기초 데이터 로드 (인원, 공지사항)
  const fetchData = useCallback(async () => {
    try {
      setNoticeLoading(true);
      const [uRes, nRes] = await Promise.all([
        fetch('/api/users'),
        fetch(`/api/weekly-tasks?week=${currentWeek}&team=${encodeURIComponent('공지사항')}`)
      ]);
      const uData = await uRes.json();
      const nData = await nRes.json();

      setUsers(Array.isArray(uData) ? uData : []);
      setNoticeTasks(Array.isArray(nData) ? nData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setNoticeLoading(false);
    }
  }, [currentWeek]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  // 2. 로컬 설정 로드 (참석자, 회의일시)
  useEffect(() => {
    const storedAbs = localStorage.getItem(ATTENDANCE_STORAGE_KEY(currentWeek));
    if (storedAbs) {
      try { setAbsentees(new Set(JSON.parse(storedAbs))); } catch { setAbsentees(new Set()); }
    } else {
      setAbsentees(new Set());
    }

    const storedDate = localStorage.getItem(MEETING_DATE_STORAGE_KEY(currentWeek));
    if (storedDate) {
      setMeetingDateStr(storedDate);
    } else {
      const d = new Date(currentWeek);
      d.setDate(d.getDate() + 1);
      setMeetingDateStr(d.toISOString().slice(0, 10));
    }
  }, [currentWeek]);

  // 3. 참석자 변경 핸들러
  const handleRemove = (name) => {
    const newSet = new Set(absentees);
    newSet.add(name);
    setAbsentees(newSet);
    localStorage.setItem(ATTENDANCE_STORAGE_KEY(currentWeek), JSON.stringify([...newSet]));
  };

  const handleAdd = (name) => {
    const newSet = new Set(absentees);
    newSet.delete(name);
    setAbsentees(newSet);
    localStorage.setItem(ATTENDANCE_STORAGE_KEY(currentWeek), JSON.stringify([...newSet]));
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    setMeetingDateStr(val);
    localStorage.setItem(MEETING_DATE_STORAGE_KEY(currentWeek), val);
  };

  // 4. 데이터 가공 (공백 정규화로 DB 저장값과 표시값 모두 매칭)
  const teamRows = GROUPED_TEAMS.map(group => {
    const normalizedKeys = group.keys.map(normalizeKey);
    const members = users.filter(u => {
      const userDept = normalizeKey(u.department || u.team || '');
      return normalizedKeys.includes(userDept);
    });
    const attending = members.filter(u => !absentees.has(u.name));
    return { ...group, members, attending };
  });

  const totalAttending = teamRows.reduce((sum, r) => sum + r.attending.length, 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* ─── Basic Info Section ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <CalendarCheck size={18} className="text-primary" />
            기본 정보
          </h2>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Meeting Overview</div>
        </div>
        
        <div className="p-0">
          <table className="w-full border-collapse">
            <tbody>
              {/* 회의 일시 */}
              <tr className="border-b border-gray-100">
                <td className="px-6 py-4 bg-white w-24 whitespace-nowrap font-bold text-gray-500 text-sm border-r border-gray-100">회의일시</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <input
                      type="date"
                      value={meetingDateStr}
                      onChange={handleDateChange}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                    <div className="h-4 w-px bg-gray-200"></div>
                    <span className="text-xl font-black text-gray-900 whitespace-nowrap inline-flex items-center min-w-[4rem] justify-end">
                      {totalAttending}
                      <span className="ml-1 text-lg font-bold">인</span>
                    </span>
                  </div>
                </td>
              </tr>
              {/* 참석 인원 */}
              <tr>
                <td className="px-6 py-8 bg-white w-24 whitespace-nowrap font-bold text-gray-500 text-sm align-middle border-r border-gray-100">참석인원</td>
                <td className="px-0 py-0">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100">
                      {teamRows.map((row) => (
                        <tr key={row.label} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-6 py-3 w-48 whitespace-nowrap text-gray-400 font-bold text-xs uppercase tracking-tight">{row.label}</td>
                          <td className="px-6 py-3 w-16 text-center font-black text-gray-900 whitespace-nowrap overflow-hidden">
                            <span className="inline-block min-w-[2rem] text-right mr-1">{row.attending.length}</span>인
                          </td>
                          <td className="px-6 py-3">
                            <InlineAttendanceCell
                              row={row}
                              onRemove={handleRemove}
                              onAdd={handleAdd}
                              disabled={hideOverviewActions}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Notice Section ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <BellRing size={18} className="text-orange-500" />
            공지사항
          </h2>
          {!hideNoticeActions && (
            <button
              onClick={onAddNotice}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-kh-green/10 text-kh-green rounded-lg hover:bg-kh-green/20 transition-all text-xs font-bold"
            >
              <Plus size={14} />
              추가
            </button>
          )}
        </div>

        <div className="min-h-[100px]">
          {noticeLoading ? (
            <div className="p-8 text-center text-sm text-gray-400 animate-pulse">공지사항 로딩 중...</div>
          ) : noticeTasks.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400 italic">
              이번 주 등록된 공지사항이 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {noticeTasks.map((notice, idx) => (
                <div key={notice.id} className="group relative flex items-start gap-4 px-6 py-5 hover:bg-gray-50/60 transition-colors">
                  <span className="min-w-[24px] h-6 w-6 rounded-full bg-orange-100 text-orange-600 text-xs font-black flex items-center justify-center flex-none mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 pr-16 min-w-0">
                    <p className="text-gray-900 font-medium leading-relaxed whitespace-pre-wrap">{notice.content}</p>
                    {(notice.start_date || notice.end_date) && (
                      <p className="text-xs text-orange-500 mt-1 font-bold">
                        {notice.start_date?.slice(5)}
                        {notice.end_date && notice.start_date !== notice.end_date
                          ? ` ~ ${notice.end_date.slice(5)}`
                          : ''}
                      </p>
                    )}
                  </div>
                  {/* Hover Actions */}
                  {!hideNoticeActions && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/80 p-1 rounded-lg border border-gray-100 shadow-sm backdrop-blur-sm">
                      <button onClick={() => onEditNotice(notice)} className="p-1.5 text-gray-400 hover:text-primary transition-colors" title="수정"><Pencil size={15} /></button>
                      <button onClick={() => onDeleteNotice(notice)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="삭제"><Trash2 size={15} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

// ── 인라인 참석 셀 (드롭다운 상태 독립) ─────────────────────────
const InlineAttendanceCell = ({ row, onRemove, onAdd, disabled }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setDropdownOpen(false);
    };
    if (dropdownOpen) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [dropdownOpen]);

  const absent = row.members.filter(u => !row.attending.find(a => a.name === u.name));

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-wrap items-center justify-center gap-1.5 flex-1">
        {row.attending.map(u => (
          <button
            key={u.name}
            onClick={() => !disabled && onRemove(u.name)}
            disabled={disabled}
            title="클릭하여 불참 처리"
            className="group flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold
              bg-white text-gray-800 border border-gray-300
              hover:bg-red-50 hover:border-red-300 hover:text-red-600
              transition-all duration-150"
          >
            {u.name}
            <UserMinus size={10} className="opacity-0 group-hover:opacity-100 text-red-400 transition-opacity" />
          </button>
        ))}
        {row.members.length === 0 && (
          <span className="text-gray-400 text-xs italic">등록된 인원 없음</span>
        )}
      </div>

      {absent.length > 0 && (
        <div className="relative flex-none" ref={ref}>
          {!disabled && (
            <button
              onClick={() => setDropdownOpen(v => !v)}
            title="불참 인원 다시 추가"
            className={`flex items-center justify-center w-7 h-7 rounded-md border transition-all duration-150
              ${dropdownOpen
                ? 'bg-primary text-white border-primary'
                : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200 hover:text-gray-600'
              }`}
          >
            <ChevronDown size={13} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          )}

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl min-w-[160px] py-1.5">
              <p className="text-[10px] text-gray-400 font-semibold px-3 pt-1.5 pb-1 uppercase tracking-wide">
                불참 인원 — 클릭하여 추가
              </p>
              {absent.map(u => (
                <button
                  key={u.name}
                  onClick={() => { onAdd(u.name); setDropdownOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-600
                    hover:bg-primary/5 hover:text-primary transition-colors font-medium"
                >
                  {u.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MeetingOverviewPanel;
