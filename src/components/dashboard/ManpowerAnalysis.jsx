import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Download, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, LineChart, Line, ResponsiveContainer, LabelList } from 'recharts';
import { format, startOfQuarter, endOfQuarter, subQuarters, addQuarters, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

const COLORS = {
  'AI': '#a78bfa',
  'BIM': '#60a5fa',
  'Smart R&D': '#4ade80',
  'Digital Technology': '#fb923c',
  '기타 (Etc)': '#94a3b8'
};

const CATEGORIES = ['AI', 'BIM', 'Smart R&D', 'Digital Technology', '기타 (Etc)'];

const TEAM_MEMBER_ORDER = {
  '스마트 기술 개발팀': [
    '임문구 부장', '김진희 부장', '김경훈 과장', '강수민 대리', '이정선 대리', '김하빈 사원', '노유빈 사원'
  ],
  '디지털 기술 연구팀': [
    '이충재 이사대우', '박도해 차장'
  ],
  '인프라 BIM팀': [
    '이동근 이사대우', '김기윤 부장', '나기태 부장', '김동찬 차장', '강병주 과장', '임규민 과장'
  ],
  'AI 응용팀': [
    '김동욱 이사대우', '장민욱 차장', '한형서 사원'
  ]
};

const MEMBER_TITLES = {
  '임문구': '부장', '김진희': '부장', '김경훈': '과장', '강수민': '대리', '이정선': '대리', '김하빈': '사원', '노유빈': '사원',
  '이충재': '이사대우', '박도해': '차장',
  '이동근': '이사대우', '김기윤': '부장', '나기태': '부장', '김동찬': '차장', '강병주': '과장', '임규민': '과장',
  '김동욱': '이사대우', '장민욱': '차장', '한형서': '사원'
};

const TEAM_ORDER = ['스마트 기술 개발팀', '디지털 기술 연구팀', '인프라 BIM팀', 'AI 응용팀'];

const ManpowerAnalysis = ({ onClose }) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [activeQuarter, setActiveQuarter] = useState(Math.floor(today.getMonth() / 3) + 1);
  const [dateRange, setDateRange] = useState({
    from: format(startOfQuarter(today), 'yyyy-MM-dd'),
    to: format(endOfQuarter(today), 'yyyy-MM-dd')
  });
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData(dateRange.from, dateRange.to);
  }, [dateRange]);

  const fetchData = async (from, to) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/manpower?from=${from}&to=${to}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        console.error('Failed to fetch analytics data');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleQuarterClick = (q) => {
    setActiveQuarter(q);
    const startMonth = (q - 1) * 3;
    const start = new Date(currentYear, startMonth, 1);
    const end = new Date(currentYear, startMonth + 3, 0);
    setDateRange({
      from: format(start, 'yyyy-MM-dd'),
      to: format(end, 'yyyy-MM-dd')
    });
  };

  const handleYearChange = (delta) => {
    const newYear = currentYear + delta;
    setCurrentYear(newYear);
    // Maintain active quarter for the new year
    if (activeQuarter) {
      const startMonth = (activeQuarter - 1) * 3;
      const start = new Date(newYear, startMonth, 1);
      const end = new Date(newYear, startMonth + 3, 0);
      setDateRange({
        from: format(start, 'yyyy-MM-dd'),
        to: format(end, 'yyyy-MM-dd')
      });
    }
  };

  const handleCustomDateChange = (type, value) => {
    setActiveQuarter(null); // Clear active quarter button when typing custom date
    setDateRange(prev => ({ ...prev, [type]: value }));
  };

  // Section 1 Data: Category Distribution
  const catData = useMemo(() => {
    if (!data) return [];
    return CATEGORIES.map(name => ({
      name,
      value: data.byCategory[name] || 0
    })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [data]);

  const monthDataWithTotal = useMemo(() => {
    if (!data || !data.byMonth) return [];
    return data.byMonth.map(m => {
      const total = CATEGORIES.reduce((sum, cat) => sum + (m[cat] || 0), 0);
      return { ...m, total };
    });
  }, [data]);

  const sortedDataForSection4 = useMemo(() => {
    if (!data || !data.byTeam || !data.byPerson) return [];
    
    // Sort teams
    const teams = [...data.byTeam]
      .filter(t => t.total > 0)
      .sort((a, b) => {
        const indexA = TEAM_ORDER.indexOf(a.team);
        const indexB = TEAM_ORDER.indexOf(b.team);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return b.total - a.total;
      });

    return teams.map(team => {
      const members = data.byPerson.filter(p => p.team === team.team);
      const order = TEAM_MEMBER_ORDER[team.team];
      const sortedMembers = order 
        ? [...members].sort((a, b) => {
            const idxA = order.findIndex(o => o.startsWith(a.name));
            const idxB = order.findIndex(o => o.startsWith(b.name));
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return b.total - a.total;
          })
        : [...members].sort((a, b) => b.total - a.total);

      return { ...team, sortedMembers };
    });
  }, [data]);

  // Format Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg text-sm">
          <p className="font-bold mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-bold">{entry.value.toLocaleString()}h</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Percent Custom Tooltip
  const PercentTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Calculate total for this payload
      const total = payload.reduce((sum, entry) => sum + entry.value, 0);
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg text-sm">
          <p className="font-bold mb-2">{label}</p>
          {payload.map((entry, index) => {
             const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0;
             return (
              <div key={index} className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span className="text-gray-600">{entry.name}:</span>
                <span className="font-bold">{entry.value.toLocaleString()}h ({pct}%)</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 min-h-screen bg-gray-100 flex flex-col z-[100] animate-in fade-in duration-200 overflow-hidden">
      {/* ─── Header ─── */}
      <header className="flex-none bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <CalendarIcon size={24} className="text-primary" />
            분기별 맨아워 분석
          </h2>

          <div className="h-6 w-px bg-gray-200" />

          {/* Period Selector */}
          <div className="flex items-center gap-4 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
            <div className="flex items-center gap-1 px-2">
              <button onClick={() => handleYearChange(-1)} className="p-1 hover:bg-gray-200 rounded-md transition-colors"><ChevronLeft size={16}/></button>
              <span className="font-bold text-gray-700 w-14 text-center">{currentYear}년</span>
              <button onClick={() => handleYearChange(1)} className="p-1 hover:bg-gray-200 rounded-md transition-colors"><ChevronRight size={16}/></button>
            </div>
            
            <div className="flex items-center gap-1 border-l border-gray-300 pl-3">
              {[1, 2, 3, 4].map(q => (
                <button
                  key={q}
                  onClick={() => handleQuarterClick(q)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    activeQuarter === q
                      ? 'bg-primary text-white shadow-md'
                      : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'
                  }`}
                >
                  {q}분기
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 border-l border-gray-300 pl-4 pr-2">
              <span className="text-xs text-gray-400 font-bold uppercase">기간 직접 지정</span>
              <input 
                type="date" 
                value={dateRange.from}
                onChange={(e) => handleCustomDateChange('from', e.target.value)}
                className="text-sm bg-white border border-gray-300 rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-gray-400">~</span>
              <input 
                type="date" 
                value={dateRange.to}
                onChange={(e) => handleCustomDateChange('to', e.target.value)}
                className="text-sm bg-white border border-gray-300 rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
          <X size={24} />
        </button>
      </header>

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-6 pb-20">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-primary">
              <Loader2 size={40} className="animate-spin mb-4" />
              <p className="font-bold">데이터를 분석 중입니다...</p>
            </div>
          ) : !data ? (
            <div className="flex items-center justify-center h-64 text-gray-400 font-medium bg-white rounded-xl border border-dashed border-gray-300">
              데이터를 불러오지 못했습니다. 서버 연결을 확인해 주세요.
            </div>
          ) : data.totalHours === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500 font-medium bg-white rounded-xl border border-dashed border-gray-300">
              해당 기간({data.period.from} ~ {data.period.to})에 기록된 업무 데이터가 없습니다.
            </div>
          ) : (
            <>
              {/* Row 1: Sections 1 & 2 */}
              <div className="grid grid-cols-2 gap-6">
                
                {/* Section 1: 업무 분야별 분포 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
                  <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm">1</span>
                    업무 분야별 분포
                  </h3>
                  
                  <div className="flex-1 flex flex-col md:flex-row items-center gap-4">
                    <div className="w-full md:w-1/2 h-[250px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={catData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {catData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                            ))}
                          </Pie>
                          <RechartsTooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Inner Text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs font-bold text-gray-500">총 업무시간</span>
                        <span className="text-2xl font-black text-gray-800">{data.totalHours.toLocaleString()}H</span>
                      </div>
                    </div>
                    
                    <div className="w-full md:w-1/2 h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={catData}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                        >
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" hide />
                          <RechartsTooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltip />} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                            {catData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                            ))}
                            <LabelList 
                              dataKey="name" 
                              position="right" 
                              content={(props) => {
                                const { x, y, width, value, index } = props;
                                const entry = catData[index];
                                return (
                                  <text x={x + width + 10} y={y + 15} fill="#475569" fontSize={12} fontWeight="bold">
                                    {entry.name} {entry.value.toLocaleString()}h
                                  </text>
                                );
                              }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Section 2: 월별 업무 분포 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
                  <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm">2</span>
                    월별 업무 분포
                  </h3>
                  
                  <div className="flex-1 h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthDataWithTotal}
                        margin={{ top: 35, right: 30, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 'bold'}} dy={10} />
                        <YAxis tickFormatter={(val) => `${val}h`} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <RechartsTooltip content={<PercentTooltip />} cursor={{fill: '#f1f5f9'}} />
                        <Legend iconType="circle" wrapperStyle={{fontSize: '11px', paddingTop: '10px'}} />
                        
                        {CATEGORIES.map((cat, index) => (
                          <Bar key={cat} dataKey={cat} stackId="a" fill={COLORS[cat]} maxBarSize={60}>
                            {index === CATEGORIES.length - 1 && (
                              <LabelList 
                                dataKey="total" 
                                position="top" 
                                formatter={(val) => `${val.toLocaleString()}h`}
                                style={{ fill: '#475569', fontSize: 12, fontWeight: 'bold' }}
                                offset={10}
                              />
                            )}
                          </Bar>
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Row 2: Section 3 */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm">3</span>
                  팀별 업무 분포
                </h3>
                
                <div className="w-full h-[380px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.byTeam}
                      layout="vertical"
                      stackOffset="expand"
                      margin={{ top: 5, right: 60, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" tickFormatter={(val) => `${val * 100}%`} tick={{fontSize: 12, fill: '#64748b'}} />
                      <YAxis dataKey="team" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontWeight: 'bold', fontSize: 12}} width={150} />
                      <RechartsTooltip 
                        content={<PercentTooltip />} 
                        cursor={{fill: '#f8fafc'}} 
                      />
                      <Legend iconType="circle" wrapperStyle={{fontSize: '11px', paddingBottom: '25px'}} verticalAlign="top" align="right" />
                      
                      {CATEGORIES.map(cat => (
                        <Bar key={cat} dataKey={cat} stackId="a" fill={COLORS[cat]} barSize={40}>
                           <LabelList 
                            dataKey={cat} 
                            position="center" 
                            content={(props) => {
                              const { x, y, width, height, value, index } = props;
                              if (width < 35) return null;
                              
                              const teamData = data.byTeam[index];
                              if (!teamData || teamData.total === 0) return null;
                              
                              const pct = ((value / teamData.total) * 100).toFixed(1);
                              return (
                                <text 
                                  x={x + width / 2} 
                                  y={y + height / 2 + 5} 
                                  fill="white" 
                                  textAnchor="middle" 
                                  fontSize={11} 
                                  fontWeight="bold"
                                  style={{ pointerEvents: 'none', textShadow: '0px 1px 2px rgba(0,0,0,0.4)' }}
                                >
                                  {pct}%
                                </text>
                              );
                            }}
                          />
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Row 3: Section 4 */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm">4</span>
                  개인별 실무 투입 상세 내역
                </h3>
                
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {sortedDataForSection4.map(team => (
                    <div key={team.team} className="flex flex-col">
                      <h4 className="font-bold text-gray-800 mb-3 border-l-4 border-primary pl-2">{team.team}</h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="py-2.5 px-3 text-center font-semibold text-gray-600 w-[160px]">성명</th>
                              <th className="py-2.5 px-3 text-center font-semibold text-gray-600 w-24">총 시간</th>
                              <th className="py-2.5 px-3 text-center font-semibold text-gray-600">분야별 투입 비중</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                              {team.sortedMembers.map(member => (
                              <tr key={member.name} className="hover:bg-gray-50/50">
                                <td className="py-2.5 px-3 font-medium text-gray-800 text-center whitespace-nowrap">
                                  {member.name} {MEMBER_TITLES[member.name] || ''}
                                </td>
                                <td className="py-2.5 px-3 text-center font-bold text-gray-600">{member.total.toLocaleString()}h</td>
                                <td className="py-2.5 px-3">
                                  <div className="flex justify-center w-full">
                                    <div className="w-[95%] h-5 rounded-md overflow-hidden flex bg-gray-100 relative group cursor-pointer">
                                      {CATEGORIES.map(cat => {
                                        const val = member[cat];
                                        if (val <= 0) return null;
                                        const pct = (val / member.total) * 100;
                                        return (
                                          <div 
                                            key={cat} 
                                            style={{ width: `${pct}%`, backgroundColor: COLORS[cat] }}
                                            className="h-full flex items-center justify-center text-[10px] font-bold text-white transition-all hover:brightness-110"
                                            title={`${cat}: ${val}h (${pct.toFixed(1)}%)`}
                                          >
                                            {pct > 15 ? `${pct.toFixed(1)}%` : ''}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 4: Section 5 */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm">5</span>
                  AI & BIM 투입 현황 분석
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* AI Panel */}
                  <div className="bg-gray-50/80 rounded-xl p-6 border border-gray-100 shadow-sm">
                    <h4 className="text-center font-black text-xl text-gray-800 mb-6">AI</h4>
                    <div className="space-y-3 mb-8 text-sm">
                      <p className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                        <span className="font-bold text-gray-600">• 총 투입 시간</span>
                        <span className="font-black text-purple-600 text-lg">{data.byCategory['AI'].toLocaleString()}h</span>
                      </p>
                      <p className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                        <span className="font-bold text-gray-600">• 전체 업무 내 비중</span>
                        <span className="font-black text-purple-600 text-lg">
                          {data.totalHours > 0 ? ((data.byCategory['AI'] / data.totalHours) * 100).toFixed(1) : 0}%
                        </span>
                      </p>
                    </div>
                    
                    <p className="font-bold text-gray-700 text-sm mb-3 pl-1">• 월별 AI 투입 시간 추이</p>
                    <div className="h-[220px] bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.byMonth} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 'bold'}} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(val) => `${val}h`} width={45} />
                          <RechartsTooltip />
                          <Line type="monotone" dataKey="AI" stroke={COLORS['AI']} strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* BIM Panel */}
                  <div className="bg-gray-50/80 rounded-xl p-6 border border-gray-100 shadow-sm">
                    <h4 className="text-center font-black text-xl text-gray-800 mb-6">BIM</h4>
                    <div className="space-y-3 mb-8 text-sm">
                      <p className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                        <span className="font-bold text-gray-600">• 총 투입 시간</span>
                        <span className="font-black text-blue-500 text-lg">{data.byCategory['BIM'].toLocaleString()}h</span>
                      </p>
                      <p className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                        <span className="font-bold text-gray-600">• 전체 업무 내 비중</span>
                        <span className="font-black text-blue-500 text-lg">
                          {data.totalHours > 0 ? ((data.byCategory['BIM'] / data.totalHours) * 100).toFixed(1) : 0}%
                        </span>
                      </p>
                    </div>
                    
                    <p className="font-bold text-gray-700 text-sm mb-3 pl-1">• 월별 BIM 투입 시간 추이</p>
                    <div className="h-[220px] bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.byMonth} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 'bold'}} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(val) => `${val}h`} width={45} />
                          <RechartsTooltip />
                          <Line type="monotone" dataKey="BIM" stroke={COLORS['BIM']} strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Comparative Analysis Sub-section */}
                <div className="mt-8 pt-8 border-t border-gray-100 grid grid-cols-2 gap-8 items-center">
                  {/* Gauge & Ratio Box */}
                  <div className="flex flex-col items-center">
                    <div className="w-[300px] h-[160px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'AI', value: data.byCategory['AI'] },
                              { name: 'BIM', value: data.byCategory['BIM'] }
                            ]}
                            cx="50%"
                            cy="100%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={70}
                            outerRadius={110}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                          >
                            <Cell fill={COLORS['AI']} />
                            <Cell fill={COLORS['BIM']} />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Labels on Gauge */}
                      <span className="absolute left-0 bottom-4 font-black text-purple-600 text-lg">AI</span>
                      <span className="absolute right-0 bottom-4 font-black text-blue-500 text-lg">BIM</span>
                      
                      {/* Needle implementation (Sharp line, no tip dot) */}
                      {(() => {
                        const aiVal = data.byCategory['AI'] || 0;
                        const bimVal = data.byCategory['BIM'] || 0;
                        const total = aiVal + bimVal;
                        const ratio = total > 0 ? aiVal / total : 0;
                        const angle = -90 + (ratio * 180);
                        return (
                          <div 
                            className="absolute bottom-0 left-1/2 w-[1.5px] h-20 bg-gray-800 origin-bottom z-10"
                            style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}
                          />
                        );
                      })()}
                      {/* Center Circle */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-white border-2 border-gray-800 rounded-full z-20" />
                    </div>

                    <div className="mt-6 bg-gray-100 px-10 py-3 rounded-lg border border-gray-200">
                      <span className="text-xl font-black text-gray-800">
                        투입 비율 = 1 : {(data.byCategory['BIM'] / Math.max(1, data.byCategory['AI'])).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Combined Trend Chart */}
                  <div className="h-[280px] bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                    <p className="font-bold text-gray-700 text-sm mb-4 pl-1 text-center">AI & BIM 투입 시간 통합 추이 비교</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.byMonth} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 'bold'}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(val) => `${val}h`} width={45} />
                        <RechartsTooltip />
                        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{paddingBottom: '20px'}} />
                        <Line name="AI" type="monotone" dataKey="AI" stroke={COLORS['AI']} strokeWidth={3} dot={{r: 5, strokeWidth: 2}} activeDot={{r: 7}} />
                        <Line name="BIM" type="monotone" dataKey="BIM" stroke={COLORS['BIM']} strokeWidth={3} dot={{r: 5, strokeWidth: 2}} activeDot={{r: 7}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManpowerAnalysis;
