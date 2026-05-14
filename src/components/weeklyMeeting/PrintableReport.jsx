import React, { forwardRef } from 'react';

const PrintableReport = forwardRef(({ reportData }, ref) => {
  if (!reportData) return <div ref={ref} className="hidden print:block">출력 데이터가 없습니다.</div>;

  const { weekLabel, meetingDate, attendanceCounts, tasks, projects, schedules } = reportData;

  // 필터링 유틸 (내용이나 과업명이 없는 빈 줄 데이터 방어)
  const filterByTeam = (teamName) => tasks.filter(t => t.team === teamName && (t.content || t.task_code));

  const noticeTasks = filterByTeam('공지사항');
  const commonTasks = filterByTeam('공통업무&행정');
  const smartTasks = filterByTeam('스마트 기술 개발팀');
  const digitalTasks = filterByTeam('디지털 기술 연구팀');
  const infraTasks = filterByTeam('인프라 BIM팀');
  const aiTasks = filterByTeam('AI 응용팀');
  const researchTasks = filterByTeam('연구과제');
  
  const validProjects = projects?.filter(p => p.project_name && p.project_name.trim().length > 0) || [];
  const validSchedules = schedules?.filter(s => s.content && s.content.trim().length > 0) || [];

  // 공통 테이블 헤더/셀 스타일 (인쇄 최적화)
  const Th = ({ children, className = '' }) => (
    <th className={`border border-gray-400 bg-gray-100 text-center py-1.5 px-2 text-[10px] font-bold text-gray-800 break-keep ${className}`}>
      {children}
    </th>
  );
  
  const Td = ({ children, className = '', colSpan = 1 }) => (
    <td colSpan={colSpan} className={`border border-gray-400 py-1.5 px-2 text-[10px] text-gray-800 ${className}`}>
      {children}
    </td>
  );

  return (
    <div className="hidden print:block font-sans bg-white text-black p-4 w-full" ref={ref}>
      {/* ── 인쇄 공통 스타일 강제 주입 ── */}
      <style type="text/css" media="print">
        {`
          @page { size: A4; margin: 15mm; }
          html, body { 
            height: auto !important; 
            overflow: visible !important; 
            min-height: auto !important;
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
            background: transparent; 
          }
          .page-break { page-break-after: always; }
          .break-inside-avoid { break-inside: avoid; }
        `}
      </style>

      {/* ── 헬퍼 함수 ── */}
      {(() => {
        const getISOWeek = (dateStr) => {
          if (!dateStr) return '';
          const d = new Date(dateStr);
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
          const week1 = new Date(d.getFullYear(), 0, 4);
          return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        };

        const yearText = weekLabel ? weekLabel.split('-')[0] : '';
        const weekNum = getISOWeek(weekLabel);

        return (
          <>
            {/* ── 문서 헤더 ── */}
            <div className="flex justify-between items-end border-b-2 border-black pb-2 mb-4">
              <h1 className="text-2xl font-bold tracking-tight">
                R&D 센터 주간공정회의록
                {weekNum && <span className="text-lg ml-2 text-gray-700">({yearText}년 {weekNum}주차)</span>}
              </h1>
              <span className="text-xs text-gray-600 font-bold">{weekLabel}</span>
            </div>
          </>
        );
      })()}

      {/* ── 1. 기본 정보 & 참석자 정보 ── */}
      <div className="mb-6 break-inside-avoid">
        <table className="w-full border-collapse table-fixed">
          <colgroup><col width="15%" /><col width="30%" /><col width="15%" /><col width="40%" /></colgroup>
          <tbody>
            <tr>
              <Th>회의일시</Th>
              <Td className="text-center font-bold">{meetingDate}</Td>
              <Th>참석인원</Th>
              <Td className="text-center font-bold text-blue-600">총 {attendanceCounts?.total || 0}인 참석</Td>
            </tr>
            {/* 부서별 참석인원 행들 */}
            <tr>
              <Td colSpan={4} className="p-0 border-0">
                <table className="w-full border-collapse border-transparent">
                   <colgroup><col width="20%"/><col width="20%"/><col width="20%"/><col width="20%"/><col width="20%"/></colgroup>
                   <thead>
                     <tr>
                       <Th className="border-t-0 border-l-0">기술연구소</Th>
                       <Th className="border-t-0">스마트 기술 개발팀</Th>
                       <Th className="border-t-0">디지털 기술 연구팀</Th>
                       <Th className="border-t-0">인프라 BIM팀</Th>
                       <Th className="border-t-0 border-r-0">AI 응용팀</Th>
                     </tr>
                   </thead>
                   <tbody>
                     <tr>
                       <Td className="text-center border-b-0 border-l-0">{attendanceCounts?.rnd || 0} 인</Td>
                       <Td className="text-center border-b-0">{attendanceCounts?.smart || 0} 인</Td>
                       <Td className="text-center border-b-0">{attendanceCounts?.digital || 0} 인</Td>
                       <Td className="text-center border-b-0">{attendanceCounts?.infra || 0} 인</Td>
                       <Td className="text-center border-b-0 border-r-0">{attendanceCounts?.ai || 0} 인</Td>
                     </tr>
                   </tbody>
                </table>
              </Td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── 2. 공지사항 ── */}
      <div className="mb-6 break-inside-avoid">
        <h2 className="text-[12px] font-bold mb-1 pl-1 border-l-4 border-black">공지사항</h2>
        {noticeTasks.length === 0 ? (
          <p className="text-[10px] text-gray-500 italic p-2 border border-gray-400 text-center bg-gray-50">등록된 공지사항이 없습니다.</p>
        ) : (
          <table className="w-full border-collapse table-fixed">
            <colgroup><col width="22%" /><col width="78%" /></colgroup>
            <thead>
              <tr><Th>기간</Th><Th>공지 내용</Th></tr>
            </thead>
            <tbody>
              {noticeTasks.map((t, i) => {
                const formatDateShort = (dStr) => {
                  if (!dStr || dStr === '-') return '-';
                  const p = dStr.split('-');
                  return p.length === 3 ? `${p[0].slice(-2)}.${p[1]}.${p[2]}` : dStr;
                };
                return (
                  <tr key={i}>
                    <Td className="text-center text-[9px]">{formatDateShort(t.start_date)} ~ {formatDateShort(t.end_date)}</Td>
                    <Td className="whitespace-pre-wrap">{t.content}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── 팀별 렌더링 헬퍼 ── */}
      {(() => {
        const formatAssignees = (assigneesStr) => {
          if (!assigneesStr) return '-';
          const list = assigneesStr.split(',').map(s => s.trim()).filter(Boolean);
          const chunks = [];
          for (let i = 0; i < list.length; i += 2) {
            chunks.push(list.slice(i, i + 2).join(', '));
          }
          return chunks.join('\n');
        };

        const formatDateShort = (dateStr) => {
          if (!dateStr || dateStr === '-') return '-';
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            return `${parts[0].slice(-2)}.${parts[1]}.${parts[2]}`;
          }
          return dateStr;
        };

        const formatMeetingResult = (resStr) => {
          if (!resStr || resStr === '-') return '-';
          return resStr.replace(/\b(20\d\d)-(\d\d)-(\d\d)\b/g, (match, y, m, d) => `${y.slice(-2)}.${m}.${d}`);
        };

        const renderTeamTable = (teamName, teamTasks) => (
          <div key={teamName} className="mb-6 break-inside-avoid">
            <h2 className="text-[12px] font-bold mb-1 pl-1 border-l-4 border-black">{teamName}</h2>
            {teamTasks.length === 0 ? (
               <p className="text-[10px] text-gray-500 italic p-2 border border-gray-400 text-center bg-gray-50">등록된 주간 업무가 없습니다.</p>
            ) : (
              <table className="w-full border-collapse table-fixed bg-white border border-gray-400">
                <colgroup>
                  <col width="8%" />
                  <col width="15%" />
                  <col width="6%" />
                  <col width="10%" />
                  <col width="10%" />
                  <col width="11%" />
                  <col width="40%" />
                </colgroup>
                <thead>
                  <tr>
                    <Th className="border-t-0 border-l-0">업무코드</Th>
                    <Th className="border-t-0">수행인원</Th>
                    <Th className="border-t-0">상태</Th>
                    <Th className="border-t-0">시작일</Th>
                    <Th className="border-t-0">마감일</Th>
                    <Th className="border-t-0">공유회의/<br/>결과보고</Th>
                    <Th className="border-t-0 border-r-0">주요내용</Th>
                  </tr>
                </thead>
                <tbody>
                  {teamTasks.map((t, i) => (
                    <tr key={i} className="break-inside-avoid">
                      <Td className="text-center font-mono text-[9px] border-l-0">{t.task_code || '-'}</Td>
                      <Td className="text-center whitespace-pre-wrap leading-tight">{formatAssignees(t.assignees || t.author)}</Td>
                      <Td className="text-center text-[9px]">{t.status || '-'}</Td>
                      <Td className="text-center text-[9px]">{formatDateShort(t.start_date)}</Td>
                      <Td className="text-center text-[9px]">{formatDateShort(t.end_date)}</Td>
                      <Td className="whitespace-pre-wrap text-[9px] text-center">{formatMeetingResult(t.meeting_result)}</Td>
                      <Td className="whitespace-pre-wrap text-[10px] border-r-0">{t.content}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );

        return (
          <>
            {renderTeamTable('공통업무&행정', commonTasks)}
            {renderTeamTable('스마트 기술 개발팀', smartTasks)}
            {renderTeamTable('디지털 기술 연구팀', digitalTasks)}
            {renderTeamTable('인프라 BIM팀', infraTasks)}
            {renderTeamTable('AI 응용팀', aiTasks)}
            {renderTeamTable('연구과제', researchTasks)}
          </>
        );
      })()}

      <div className="page-break"></div>

      {/* ── 3. 프로젝트 추진 현황 ── */}
      <div className="mb-6 mt-8 break-inside-avoid">
        <h2 className="text-[12px] font-bold mb-1 pl-1 border-l-4 border-black">프로젝트 추진 및 수행 현황</h2>
        {validProjects.length === 0 ? (
          <p className="text-[10px] text-gray-500 italic p-2 border border-gray-400 text-center bg-gray-50">등록된 프로젝트가 없습니다.</p>
        ) : (
          <table className="w-full border-collapse table-fixed border border-gray-400">
            <colgroup>
              <col width="8%" />
              <col width="26%" />
              <col width="12%" />
              <col width="8%" />
              <col width="10%" />
              <col width="8%" />
              <col width="28%" />
            </colgroup>
            <thead>
              <tr>
                 <Th className="border-t-0 border-l-0">분류코드</Th>
                 <Th className="border-t-0">프로젝트명</Th>
                 <Th className="border-t-0">수행방식</Th>
                 <Th className="border-t-0">BIM용역비</Th>
                 <Th className="border-t-0">설계부서</Th>
                 <Th className="border-t-0">담당자</Th>
                 <Th className="border-t-0 border-r-0">수행현황</Th>
              </tr>
            </thead>
            <tbody>
              {validProjects.map((p, i) => {
                let methodStr = p.method || '';
                if(methodStr.includes(',')) methodStr = methodStr.split(',').map(s=>s.trim()).filter(Boolean).join('\n');
                return (
                 <tr key={i} className="break-inside-avoid">
                  <Td className="text-center font-mono text-[9px] border-l-0">{p.project_code || '-'}</Td>
                  <Td className="text-[9px] font-bold text-primary break-all">{p.project_name}</Td>
                  <Td className="text-center text-[9px] whitespace-pre-wrap leading-tight">{methodStr || '-'}</Td>
                  <Td className="text-center text-[9px]">{p.bim_cost || '-'}</Td>
                  <Td className="text-center text-[9px]">{p.dept || '-'}</Td>
                  <Td className="text-center text-[9px]">{p.manager || '-'}</Td>
                  <Td className="whitespace-pre-wrap text-[9px] border-r-0">{p.status_detail || '-'}</Td>
                 </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── 4. 주간일정 ── */}
      <div className="mb-6 mt-8 break-inside-avoid">
        <h2 className="text-[12px] font-bold mb-1 pl-1 border-l-4 border-black">주간일정</h2>
        {validSchedules.length === 0 ? (
          <p className="text-[10px] text-gray-500 italic p-2 border border-gray-400 text-center bg-gray-50">등록된 일정이 없습니다.</p>
        ) : (
          <table className="w-full border-collapse table-fixed border border-gray-400">
            <colgroup>
              <col width="12%" />
              <col width="15%" />
              <col width="12%" />
              <col width="12%" />
              <col width="49%" />
            </colgroup>
            <thead>
              <tr><Th>업무분야</Th><Th>수행인원</Th><Th>시작일정</Th><Th>종료일정</Th><Th>상세업무</Th></tr>
            </thead>
            <tbody>
              {validSchedules.map((s, i) => {
                const formatAssignees = (assigneesStr) => {
                  if (!assigneesStr) return '-';
                  const list = assigneesStr.split(',').map(str => str.trim()).filter(Boolean);
                  const chunks = [];
                  for (let idx = 0; idx < list.length; idx += 2) {
                    chunks.push(list.slice(idx, idx + 2).join(', '));
                  }
                  return chunks.join('\n');
                };
                const formatDateShort = (dStr) => {
                  if (!dStr || dStr === '-') return '-';
                  const p = dStr.split('-');
                  return p.length === 3 ? `${p[0].slice(-2)}.${p[1]}.${p[2]}` : dStr;
                };
                return (
                  <tr key={i} className="break-inside-avoid">
                    <Td className="text-center font-bold text-[10px]">{s.schedule_type || '-'}</Td>
                    <Td className="text-center whitespace-pre-wrap leading-tight">{formatAssignees(s.assignees)}</Td>
                    <Td className="text-center text-[9px]">{formatDateShort(s.start_date)}</Td>
                    <Td className="text-center text-[9px]">{formatDateShort(s.end_date)}</Td>
                    <Td className="whitespace-pre-wrap text-[10px]">{s.content || '-'}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
});

export default PrintableReport;
