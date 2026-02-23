import React, { useState, useEffect, useMemo } from 'react';
import { Users, Clock, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, Cell, LabelList,
    PieChart, Pie, Sector
} from 'recharts';
import { format, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isSameWeek, isSameMonth, isSameYear, addDays, getDay, getWeekOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';

/* ═══════════════════════════════════════════
   Constants & Color System
   ═══════════════════════════════════════════ */
const CATEGORIES = ['AI', 'BIM', 'Smart R&D', 'Digital Technology', 'Etc'];
const CATEGORY_COLORS = {
    'AI': '#367FF6',
    'BIM': '#22C55E',
    'Smart R&D': '#F97316',
    'Digital Technology': '#A855F7',
    'Etc': '#9E9E9E'
};
const GRADIENT_ENDS = {
    'AI': '#93B8FC',
    'BIM': '#6EE7A0',
    'Smart R&D': '#FDBA74',
    'Digital Technology': '#D8B4FE',
    'Etc': '#D1D5DB'
};

const getCategory = (pName) => {
    if (!pName) return 'Etc';
    const upper = pName.trim().toUpperCase();
    if (upper.includes('AI')) return 'AI';
    if (upper.includes('BIM')) return 'BIM';
    if (upper.includes('R&D') || upper.includes('SMART')) return 'Smart R&D';
    if (upper.includes('DIGITAL') || upper.includes('TECHNOLOGY')) return 'Digital Technology';
    return 'Etc';
};

/* ═══════════════════════════════════════════
   Custom Glassmorphism Tooltip
   ═══════════════════════════════════════════ */
const GlassTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.5)', borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.10)', padding: '12px 16px',
        }}>
            <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px', color: '#25282B' }}>{label}</p>
            {payload.filter(e => e.value > 0).map((e, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '2px 0' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
                    <span style={{ color: '#6B7280' }}>{e.name}</span>
                    <span style={{ fontWeight: 700, marginLeft: 'auto', color: '#25282B' }}>{e.value}h</span>
                </div>
            ))}
        </div>
    );
};

/* ═══════════════════════════════════════════
   Donut Active Shape (hover expand)
   ═══════════════════════════════════════════ */
const renderActiveDonut = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
        <g>
            <Sector cx={cx} cy={cy} innerRadius={innerRadius - 3} outerRadius={outerRadius + 8}
                startAngle={startAngle} endAngle={endAngle} fill={fill} />
            <Sector cx={cx} cy={cy} innerRadius={outerRadius + 10} outerRadius={outerRadius + 12}
                startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.3} />
        </g>
    );
};

/* ═══════════════════════════════════════════
   Custom Legend (enforces CATEGORIES order)
   ═══════════════════════════════════════════ */
const CustomLegend = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '11px', paddingTop: '10px' }}>
        {CATEGORIES.map(cat => (
            <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#666' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: CATEGORY_COLORS[cat], display: 'inline-block' }} />
                {cat}
            </span>
        ))}
    </div>
);

/* ═══════════════════════════════════════════
   Dashboard Component
   ═══════════════════════════════════════════ */
const Dashboard = () => {
    const [timeRange, setTimeRange] = useState('weekly');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [rawTimesheets, setRawTimesheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showOvertimeModal, setShowOvertimeModal] = useState(false);
    const [viewMode, setViewMode] = useState('hours');
    const [showStaffDetail, setShowStaffDetail] = useState(false);
    const [filterDept, setFilterDept] = useState('전체');
    const [activeDonutIdx, setActiveDonutIdx] = useState(-1);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/timesheets');
                if (res.ok) setRawTimesheets(await res.json());
            } catch (e) { console.error("Fetch timesheets failed:", e); }
            finally { setLoading(false); }
        })();
    }, []);

    const handlePrev = () => {
        if (timeRange === 'weekly') setCurrentDate(subWeeks(currentDate, 1));
        else if (timeRange === 'monthly') setCurrentDate(subMonths(currentDate, 1));
        else setCurrentDate(subYears(currentDate, 1));
    };
    const handleNext = () => {
        if (timeRange === 'weekly') setCurrentDate(addWeeks(currentDate, 1));
        else if (timeRange === 'monthly') setCurrentDate(addMonths(currentDate, 1));
        else setCurrentDate(addYears(currentDate, 1));
    };
    const formatDateLabel = () => {
        if (timeRange === 'weekly') {
            const s = startOfWeek(currentDate, { weekStartsOn: 1 });
            const e = endOfWeek(currentDate, { weekStartsOn: 1 });
            return `${format(s, 'M월 d일', { locale: ko })} - ${format(e, 'M월 d일', { locale: ko })}`;
        }
        if (timeRange === 'monthly') return format(currentDate, 'yyyy년 M월', { locale: ko });
        return format(currentDate, 'yyyy년', { locale: ko });
    };

    /* ─── Process & Aggregate Data ─── */
    const processedData = useMemo(() => {
        const empty = { project: [], staff: [], totalHours: 0, strategicRatio: 0, totalOvertime: 0, hoursTrend: 0, overtimeTrend: 0, overtimeList: [], areaChartData: [], sparklineData: [], departmentRows: [] };
        if (!rawTimesheets.length) return empty;

        const filterByRange = (data, date, range) => data.filter(item => {
            const d = parseISO(item.week_start);
            if (range === 'weekly') return isSameWeek(d, date, { weekStartsOn: 1 });
            if (range === 'monthly') return isSameMonth(d, date);
            return isSameYear(d, date);
        });

        const filteredData = filterByRange(rawTimesheets, currentDate, timeRange);

        // Previous period for trend calculation
        const prevDate = timeRange === 'weekly' ? subWeeks(currentDate, 1) : timeRange === 'monthly' ? subMonths(currentDate, 1) : subYears(currentDate, 1);
        const prevData = filterByRange(rawTimesheets, prevDate, timeRange);

        // ── Projects by Category ──
        const projectMap = {};
        CATEGORIES.forEach(c => projectMap[c] = 0);
        filteredData.forEach(item => { projectMap[getCategory(item.project_name)] += parseFloat(item.total || 0); });
        const project = CATEGORIES.map(name => ({ name, billable: Math.round(projectMap[name] * 10) / 10 }));

        // ── Staff & Department ──
        const staffMap = {}, departmentMap = {};
        filteredData.forEach(item => {
            const emp = item.employee || 'Unknown', dept = item.department || '미소속';
            const cat = getCategory(item.project_name), hrs = parseFloat(item.total || 0);
            if (!staffMap[emp]) { staffMap[emp] = { total: 0, department: dept }; CATEGORIES.forEach(c => staffMap[emp][c] = 0); }
            staffMap[emp].total += hrs; staffMap[emp][cat] += hrs;
            if (!departmentMap[dept]) { departmentMap[dept] = { total: 0 }; CATEGORIES.forEach(c => departmentMap[dept][c] = 0); }
            departmentMap[dept].total += hrs; departmentMap[dept][cat] += hrs;
        });

        const toRatioArray = (map) => Object.entries(map).map(([name, data]) => {
            const row = { name, hours: data.total, department: data.department };
            CATEGORIES.forEach(cat => { row[cat] = data.total > 0 ? Math.round((data[cat] / data.total) * 100) : 0; });
            return row;
        }).sort((a, b) => b.hours - a.hours);

        const staff = toRatioArray(staffMap);
        const departmentRows = toRatioArray(departmentMap);

        // ── Stats ──
        const totalHours = filteredData.reduce((s, i) => s + parseFloat(i.total || 0), 0);
        const strategicHours = filteredData.reduce((s, i) => { const c = getCategory(i.project_name); return (c === 'AI' || c === 'BIM' || c === 'Smart R&D') ? s + parseFloat(i.total || 0) : s; }, 0);
        const strategicRatio = totalHours > 0 ? Math.round((strategicHours / totalHours) * 100) : 0;

        const calcOvertime = (data) => {
            const m = {};
            data.forEach(i => { const k = `${i.employee}-${i.week_start}`; m[k] = (m[k] || 0) + parseFloat(i.total || 0); });
            let ot = 0; Object.values(m).forEach(h => { if (h > 40) ot += (h - 40); }); return ot;
        };
        const totalOvertime = calcOvertime(filteredData);
        const prevTotalHours = prevData.reduce((s, i) => s + parseFloat(i.total || 0), 0);
        const prevOvertime = calcOvertime(prevData);
        const hoursTrend = prevTotalHours > 0 ? Math.round(((totalHours - prevTotalHours) / prevTotalHours) * 100) : 0;
        const overtimeTrend = prevOvertime > 0 ? Math.round(((totalOvertime - prevOvertime) / prevOvertime) * 100) : 0;

        // ── Overtime List ──
        const uwm = {};
        filteredData.forEach(i => { const k = `${i.employee}-${i.week_start}`; uwm[k] = (uwm[k] || 0) + parseFloat(i.total || 0); });
        const overtimeList = Object.entries(uwm).filter(([_, h]) => h > 40).map(([k, h]) => ({ name: k.split('-')[0], hours: Math.round(h - 40) })).sort((a, b) => b.hours - a.hours);

        // ── Area Chart Data (Fixed x-axis range) ──
        const areaMap = {};

        // Step 1: Pre-populate ALL axis slots so x-axis is always fixed
        if (timeRange === 'weekly') {
            // Mon–Fri (5 weekdays)
            const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
            for (let i = 0; i < 5; i++) {
                const d = addDays(ws, i);
                const key = format(d, 'yyyy-MM-dd');
                const display = format(d, 'M/d(eee)', { locale: ko });
                areaMap[key] = { key, displayDate: display };
                CATEGORIES.forEach(c => areaMap[key][c] = 0);
            }
        } else if (timeRange === 'monthly') {
            // All weeks of the month (1주차–5주차, up to 6)
            const mStart = startOfMonth(currentDate);
            const mEnd = endOfMonth(currentDate);
            let cursor = startOfWeek(mStart, { weekStartsOn: 1 });
            let weekNum = 1;
            while (cursor <= mEnd) {
                const key = format(cursor, 'yyyy-MM-dd');
                const display = `${weekNum}주차`;
                areaMap[key] = { key, displayDate: display };
                CATEGORIES.forEach(c => areaMap[key][c] = 0);
                cursor = addDays(cursor, 7);
                weekNum++;
            }
        } else {
            // yearly: Jan–Dec (12 months)
            for (let m = 0; m < 12; m++) {
                const d = new Date(currentDate.getFullYear(), m, 1);
                const key = format(d, 'yyyy-MM');
                const display = format(d, 'M월', { locale: ko });
                areaMap[key] = { key, displayDate: display };
                CATEGORIES.forEach(c => areaMap[key][c] = 0);
            }
        }

        // Step 2: Fill in actual data
        filteredData.forEach(item => {
            const startDate = parseISO(item.week_start), cat = getCategory(item.project_name);
            ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach((day, idx) => {
                const dateObj = addDays(startDate, idx), hrs = parseFloat(item[day] || 0);
                if (hrs > 0) {
                    let key;
                    if (timeRange === 'yearly') { key = format(dateObj, 'yyyy-MM'); }
                    else if (timeRange === 'monthly') { const ws = startOfWeek(dateObj, { weekStartsOn: 1 }); key = format(ws, 'yyyy-MM-dd'); }
                    else { key = format(dateObj, 'yyyy-MM-dd'); }
                    if (areaMap[key]) { areaMap[key][cat] += hrs; }
                }
            });
        });
        const areaChartData = Object.values(areaMap).sort((a, b) => a.key.localeCompare(b.key));

        // ── Sparkline Data (sum all categories per point) ──
        const sparklineData = areaChartData.map(d => ({ value: CATEGORIES.reduce((s, c) => s + (d[c] || 0), 0) }));

        return { project, staff, totalHours, strategicRatio, totalOvertime, hoursTrend, overtimeTrend, overtimeList, areaChartData, sparklineData, departmentRows };
    }, [rawTimesheets, timeRange, currentDate]);

    if (loading) return <div className="p-10 text-center text-gray-500">Loading...</div>;

    const donutData = processedData.project.filter(d => d.billable > 0);

    return (
        <div className="h-full w-full flex flex-col bg-kh-bg-main overflow-hidden p-6 gap-4">
            {/* ═══ Header ═══ */}
            <header className="flex justify-between items-center shrink-0 h-[5%]">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-kh-text-main fluid-text">R&D Center Dashboard</h2>
                    <p className="text-sm text-gray-400 font-medium">{formatDateLabel()}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {['weekly', 'monthly', 'yearly'].map(r => (
                            <button key={r} onClick={() => { setTimeRange(r); if (r !== 'monthly') setViewMode('hours'); }}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${timeRange === r ? 'bg-white text-kh-green shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                {r === 'weekly' ? 'WEEK' : r === 'monthly' ? 'MONTH' : 'YEAR'}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center space-x-2 bg-white px-3 py-1.5 border border-gray-100 rounded-lg text-sm text-gray-500 shadow-sm">
                        <button onClick={handlePrev} className="p-1 hover:text-kh-text-main hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={16} /></button>
                        <span className="min-w-[140px] text-center font-medium text-kh-text-main">{formatDateLabel()}</span>
                        <button onClick={handleNext} className="p-1 hover:text-kh-text-main hover:bg-gray-100 rounded-full transition-colors"><ChevronRight size={16} /></button>
                    </div>
                    <button onClick={() => setShowOvertimeModal(true)} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 transition-colors flex items-center gap-2">
                        <Users size={16} />
                    </button>
                </div>
            </header>

            {/* ═══ Bento Grid ═══ */}
            <main className="flex-1 grid grid-cols-12 grid-rows-12 gap-4 min-h-0">

                {/* ─── KPI Card 1: Total Hours + Sparkline ─── */}
                <div className="col-span-4 row-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden flex items-center p-4 gap-3">
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-kh-green" />
                    <div className="flex-1 pl-2 min-w-0">
                        <p className="text-[11px] font-semibold text-gray-400 tracking-wide mb-0.5 whitespace-nowrap">총 근무 시간</p>
                        <p className="text-2xl font-extrabold text-kh-text-main whitespace-nowrap">{processedData.totalHours.toLocaleString()} <span className="text-sm font-bold text-gray-300">h</span></p>
                        <div className="flex items-center gap-1 mt-1.5">
                            {processedData.hoursTrend >= 0
                                ? <TrendingUp size={12} className="text-emerald-500" />
                                : <TrendingDown size={12} className="text-red-500" />}
                            <span className={`text-xs font-bold ${processedData.hoursTrend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {processedData.hoursTrend > 0 ? '+' : ''}{processedData.hoursTrend}%
                            </span>
                            <span className="text-[10px] text-gray-300 ml-0.5">vs 이전기간</span>
                        </div>
                    </div>
                    <div style={{ width: 110, height: 48 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={processedData.sparklineData} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="spkHrs" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#009245" stopOpacity={0.35} />
                                        <stop offset="100%" stopColor="#009245" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="value" stroke="#009245" strokeWidth={1.5} fill="url(#spkHrs)" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ─── KPI Card 2: Strategic Ratio + Gauge ─── */}
                <div className="col-span-4 row-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden flex items-center p-4">
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-kh-lime" />
                    <div className="flex-1 pl-2 min-w-0">
                        <p className="text-[11px] font-semibold text-gray-400 tracking-wide mb-0.5 whitespace-nowrap">전략 업무 비중</p>
                        <p className="text-2xl font-extrabold text-kh-text-main whitespace-nowrap">{processedData.strategicRatio}<span className="text-sm font-bold text-gray-300">%</span></p>
                        <p className="text-[10px] text-gray-300 mt-0.5 whitespace-nowrap">AI + BIM + Smart R&D</p>
                    </div>
                    <div style={{ width: 90, height: 55 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <defs>
                                    <linearGradient id="gaugeGr" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#8CC63F" />
                                        <stop offset="100%" stopColor="#009245" />
                                    </linearGradient>
                                </defs>
                                <Pie data={[{ value: processedData.strategicRatio || 0.1 }, { value: Math.max(0.1, 100 - processedData.strategicRatio) }]}
                                    cx="50%" cy="95%" startAngle={180} endAngle={0}
                                    innerRadius="50%" outerRadius="95%" dataKey="value" stroke="none">
                                    <Cell fill="url(#gaugeGr)" />
                                    <Cell fill="#F3F4F6" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ─── KPI Card 3: Overtime + Sparkline ─── */}
                <div className="col-span-4 row-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden flex items-center p-4 gap-3">
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-orange-400" />
                    <div className="flex-1 pl-2 min-w-0">
                        <p className="text-[11px] font-semibold text-gray-400 tracking-wide mb-0.5 whitespace-nowrap">초과 근무</p>
                        <p className="text-2xl font-extrabold text-kh-text-main whitespace-nowrap">{Math.round(processedData.totalOvertime).toLocaleString()} <span className="text-sm font-bold text-gray-300">h</span></p>
                        <div className="flex items-center gap-1 mt-1.5">
                            {processedData.overtimeTrend <= 0
                                ? <TrendingDown size={12} className="text-emerald-500" />
                                : <TrendingUp size={12} className="text-red-500" />}
                            <span className={`text-xs font-bold ${processedData.overtimeTrend <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {processedData.overtimeTrend > 0 ? '+' : ''}{processedData.overtimeTrend}%
                            </span>
                            <span className="text-[10px] text-gray-300 ml-0.5">vs 이전기간</span>
                        </div>
                    </div>
                    <div style={{ width: 110, height: 48 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={processedData.sparklineData} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="spkOt" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#F97316" stopOpacity={0.35} />
                                        <stop offset="100%" stopColor="#F97316" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="value" stroke="#F97316" strokeWidth={1.5} fill="url(#spkOt)" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ─── Main Chart: Premium Stacked Area/Bar ─── */}
                <div className="col-span-8 row-span-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-kh-text-main">주간 업무 현황</h3>
                            <p className="text-xs text-gray-400">시간 흐름에 따른 업무 비중의 변화를 확인하세요.</p>
                        </div>
                        {timeRange === 'monthly' && (
                            <div className="flex bg-gray-50 rounded-lg p-1 text-xs font-bold">
                                <button onClick={() => setViewMode('hours')} className={`px-2 py-1 rounded ${viewMode === 'hours' ? 'bg-white shadow' : 'text-gray-400'}`}>Hrs</button>
                                <button onClick={() => setViewMode('percent')} className={`px-2 py-1 rounded ${viewMode === 'percent' ? 'bg-white shadow' : 'text-gray-400'}`}>%</button>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            {timeRange === 'weekly' ? (
                                <BarChart data={processedData.areaChartData.filter(d => { const dy = getDay(new Date(d.date || d.key)); return dy >= 1 && dy <= 5; })} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        {CATEGORIES.map((cat, i) => (
                                            <linearGradient key={cat} id={`barG-${i}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={CATEGORY_COLORS[cat]} />
                                                <stop offset="100%" stopColor={GRADIENT_ENDS[cat]} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" strokeOpacity={0.5} />
                                    <XAxis dataKey="displayDate" stroke="#9CA3AF" fontSize={11} tickMargin={5} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#9CA3AF" fontSize={11} axisLine={false} tickLine={false} />
                                    <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                                    <Legend content={<CustomLegend />} />
                                    {[...CATEGORIES].reverse().map((cat, ri) => {
                                        const origIdx = CATEGORIES.indexOf(cat);
                                        return (
                                            <Bar key={cat} dataKey={cat} stackId="a" fill={`url(#barG-${origIdx})`}
                                                radius={ri === CATEGORIES.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0]} barSize={44} />
                                        );
                                    })}
                                </BarChart>
                            ) : (
                                <AreaChart data={processedData.areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        {CATEGORIES.map((cat, i) => (
                                            <linearGradient key={cat} id={`areaG-${i}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={CATEGORY_COLORS[cat]} stopOpacity={0.45} />
                                                <stop offset="95%" stopColor={CATEGORY_COLORS[cat]} stopOpacity={0.02} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" strokeOpacity={0.5} />
                                    <XAxis dataKey="displayDate" stroke="#9CA3AF" fontSize={11} tickMargin={5} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#9CA3AF" fontSize={11} axisLine={false} tickLine={false} />
                                    <Tooltip content={<GlassTooltip />} />
                                    <Legend content={<CustomLegend />} />
                                    {CATEGORIES.map((cat, i) => (
                                        <Area key={cat} type="monotone" dataKey={cat} stackId="1"
                                            stroke={CATEGORY_COLORS[cat]} strokeWidth={2.5}
                                            fill={`url(#areaG-${i})`} />
                                    ))}
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ─── Gradient Donut Chart ─── */}
                <div className="col-span-4 row-span-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-kh-text-main mb-2">업무별 시간 비중</h3>
                    <div className="flex-1 min-h-0 relative">
                        {donutData.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <defs>
                                            {donutData.map((entry, i) => (
                                                <linearGradient key={entry.name} id={`dnt-${i}`} x1="0" y1="0" x2="1" y2="1">
                                                    <stop offset="0%" stopColor={CATEGORY_COLORS[entry.name]} />
                                                    <stop offset="100%" stopColor={GRADIENT_ENDS[entry.name]} />
                                                </linearGradient>
                                            ))}
                                        </defs>
                                        <Pie data={donutData} cx="50%" cy="45%" innerRadius="52%" outerRadius="78%"
                                            dataKey="billable" stroke="none" paddingAngle={3}
                                            activeIndex={activeDonutIdx} activeShape={renderActiveDonut}
                                            onMouseEnter={(_, i) => setActiveDonutIdx(i)} onMouseLeave={() => setActiveDonutIdx(-1)}>
                                            {donutData.map((_, i) => <Cell key={i} fill={`url(#dnt-${i})`} />)}
                                        </Pie>
                                        <Tooltip content={<GlassTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Center Label */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: '-10%' }}>
                                    <span className="text-2xl font-extrabold text-kh-text-main">{Math.round(processedData.totalHours)}<span className="text-sm text-gray-300">h</span></span>
                                    <span className="text-[10px] text-gray-400">총 업무시간</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-300 text-sm">데이터 없음</div>
                        )}
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
                        {CATEGORIES.map(cat => (
                            <div key={cat} className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[cat] }} />
                                <span className="text-[11px] text-gray-500 font-medium">{cat}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── Enhanced Data Table w/ Progress Bars ─── */}
                <div className="col-span-12 row-span-4 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                        <h3 className="text-lg font-bold text-kh-text-main">팀원별 상세 현황</h3>
                        <button onClick={() => { setShowStaffDetail(true); setFilterDept('전체'); }} className="text-sm text-kh-lime font-bold hover:text-green-700 transition-colors">전체 보기</button>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[#1E2225] text-white sticky top-0 z-10">
                                <tr>
                                    <th className="px-5 py-3 font-semibold text-center border-r border-white/10">부서명</th>
                                    <th className="px-5 py-3 font-semibold text-center border-r border-white/10 w-[10%]">총 시간</th>
                                    {CATEGORIES.map(cat => (
                                        <th key={cat} className="px-4 py-3 text-center font-bold border-r border-white/10 last:border-none w-[14%]"
                                            style={{ borderBottom: `4px solid ${CATEGORY_COLORS[cat]}` }}>{cat}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {processedData.departmentRows.map(dept => (
                                    <tr key={dept.name} className="hover:bg-slate-50/80 transition-all duration-200 hover:translate-x-0.5 group">
                                        <td className="px-5 py-3 font-bold text-gray-700 text-center border-r border-gray-50 relative">
                                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-kh-green opacity-0 group-hover:opacity-100 transition-opacity rounded-r" />
                                            {dept.name}
                                        </td>
                                        <td className="px-5 py-3 font-bold text-kh-text-main text-center border-r border-gray-50">{dept.hours.toLocaleString()}h</td>
                                        {CATEGORIES.map(cat => (
                                            <td key={cat} className="px-4 py-3 border-r border-gray-50 last:border-none">
                                                {dept[cat] > 0 ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full transition-all duration-700 ease-out"
                                                                style={{ width: `${dept[cat]}%`, background: `linear-gradient(90deg, ${CATEGORY_COLORS[cat]}, ${GRADIENT_ENDS[cat]})` }} />
                                                        </div>
                                                        <span className="text-xs font-bold min-w-[28px] text-right" style={{ color: CATEGORY_COLORS[cat] }}>{dept[cat]}%</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-center block text-gray-200 text-xs">-</span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* ═══ Overtime Modal ═══ */}
            {showOvertimeModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="text-xl font-bold text-dark">Overtime Analysis</h3>
                            <button onClick={() => setShowOvertimeModal(false)}><X size={24} className="text-gray-400" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            {processedData.overtimeList.length > 0 ? (
                                <div className="space-y-6">
                                    <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={processedData.overtimeList.slice(0, 5)} layout="vertical"><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={60} /><Bar dataKey="hours" fill="#f97316" radius={[0, 6, 6, 0]} barSize={20} /></BarChart></ResponsiveContainer></div>
                                    <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="p-2">Name</th><th className="p-2 text-right">Hours</th></tr></thead><tbody>{processedData.overtimeList.map((item, i) => <tr key={i} className="border-b"><td className="p-2">{item.name}</td><td className="p-2 text-right font-bold text-orange-600">+{item.hours}h</td></tr>)}</tbody></table>
                                </div>
                            ) : <div className="text-center py-10 text-gray-500">No overtime recorded.</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Staff Details Modal ═══ */}
            {showStaffDetail && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col">
                        <div className="p-5 border-b flex flex-col gap-4 bg-gray-50">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-dark">Staff Details</h3>
                                <button onClick={() => setShowStaffDetail(false)}><X size={24} className="text-gray-400" /></button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {['전체', ...processedData.departmentRows.map(d => d.name)].map(dept => (
                                    <button key={dept} onClick={() => setFilterDept(dept)} className={`px-4 py-1.5 text-sm font-bold rounded-full transition-all ${filterDept === dept ? 'bg-kh-green text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}>{dept}</button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm text-center">
                                <thead className="bg-[#1E2225] text-white sticky top-0 z-10">
                                    <tr>
                                        <th className="p-4 border-r border-white/10">Staff</th>
                                        <th className="p-4 border-r border-white/10">Dept</th>
                                        <th className="p-4 border-r border-white/10">Total</th>
                                        {CATEGORIES.map(cat => <th key={cat} className="p-4 border-r border-white/10" style={{ borderBottom: `4px solid ${CATEGORY_COLORS[cat]}` }}>{cat}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {processedData.staff.filter(i => filterDept === '전체' || i.department === filterDept).map((item, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 border-r border-gray-100 font-medium">{item.name}</td>
                                            <td className="p-4 border-r border-gray-100 text-gray-500">{item.department}</td>
                                            <td className="p-4 border-r border-gray-100 font-bold">{item.hours}h</td>
                                            {CATEGORIES.map(cat => (
                                                <td key={cat} className="p-4 border-r border-gray-100">
                                                    {item[cat] > 0 ? (
                                                        <div className="flex items-center gap-1.5 justify-center">
                                                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                <div className="h-full rounded-full" style={{ width: `${item[cat]}%`, background: `linear-gradient(90deg, ${CATEGORY_COLORS[cat]}, ${GRADIENT_ENDS[cat]})` }} />
                                                            </div>
                                                            <span className="text-xs font-bold" style={{ color: CATEGORY_COLORS[cat] }}>{item[cat]}%</span>
                                                        </div>
                                                    ) : <span className="text-gray-300">-</span>}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
