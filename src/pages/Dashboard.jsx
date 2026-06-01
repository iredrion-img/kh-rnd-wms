import React, { useState, useEffect, useMemo } from 'react';
import { Users, Clock, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, Cell, LabelList,
    PieChart, Pie, Sector
} from 'recharts';
import { format, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isSameWeek, isSameMonth, isSameYear, addDays, getDay, getWeekOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';

import { CATEGORIES, CATEGORY_COLORS, GRADIENT_ENDS, GlassTooltip, CustomLegend } from '../components/dashboard/ChartUtils';
import WeeklyChartBoard from '../components/dashboard/WeeklyChartBoard';
import MonthlyChartBoard from '../components/dashboard/MonthlyChartBoard';
import YearlyChartBoard from '../components/dashboard/YearlyChartBoard';
import ManpowerAnalysis from '../components/dashboard/ManpowerAnalysis';

/* ═══════════════════════════════════════════
   Constants & Color System
   ═══════════════════════════════════════════ */
// DB에 저장된 실제 부서명 (공백 없음)
const DEPARTMENT_ORDER = ['R&D센터', '기술연구소', '스마트기술개발팀', '디지털기술연구팀', '인프라BIM팀', 'AI응용팀'];
// UI 표시용 레이블 맵핑 (DB키 -> 표시명)
const DEPT_DISPLAY_LABEL = {
    'R&D센터': 'R&D센터',
    '기술연구소': '기술연구소',
    '스마트기술개발팀': '스마트 기술 개발팀',
    '디지털기술연구팀': '디지털 기술 연구팀',
    '인프라BIM팀': '인프라 BIM팀',
    'AI응용팀': 'AI 응용팀',
};
const TEAM_MEMBER_ORDER = {
    '스마트기술개발팀': ['임문구', '김진희', '이정선', '강수민', '김하빈', '노유빈'],
    '디지털기술연구팀': ['이충재', '박도해'],
    '인프라BIM팀': ['이동근', '나기태', '김기윤', '김동찬', '임규민', '강병주'],
    'AI응용팀': ['김동욱', '장민욱', '한형서'],
};
const DEPARTMENT_HEAD = { name: '김영근', department: 'R&D센터' };

const getCategory = (pName) => {
    if (!pName) return 'Etc';
    const upper = pName.trim().toUpperCase();
    if (upper.includes('AI')) return 'AI';
    if (upper.includes('BIM')) return 'BIM';
    if (upper.includes('R&D') || upper.includes('SMART')) return 'Smart R&D';
    if (upper.includes('DIGITAL') || upper.includes('TECHNOLOGY')) return 'Digital Technology';
    return 'Etc';
};

// GlassTooltip moved to ChartUtils

/* ═══════════════════════════════════════════
   Donut Active Shape (hover expand)
   ═══════════════════════════════════════════ */
const renderActiveDonut = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, percent, midAngle } = props;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
        <g>
            <Sector cx={cx} cy={cy} innerRadius={innerRadius - 3} outerRadius={outerRadius + 8}
                startAngle={startAngle} endAngle={endAngle} fill={fill} />
            <Sector cx={cx} cy={cy} innerRadius={outerRadius + 10} outerRadius={outerRadius + 12}
                startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.3} />
            {percent >= 0.05 && (
                <text x={x} y={y} fill="#FFFFFF" textAnchor="middle" dominantBaseline="central" fontSize="16" fontWeight="800" style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }} pointerEvents="none">
                    {`${(percent * 100).toFixed(0)}%`}
                </text>
            )}
        </g>
    );
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.1) return null; // Hide if less than 10% slice to avoid visual clutter
    const RADIAN = Math.PI / 180;
    // 도넛 조각의 정중앙에 라벨 배치
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="#FFFFFF" textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="600" opacity={0.65} style={{ pointerEvents: 'none' }}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};


// CustomLegend moved to ChartUtils

/* ═══════════════════════════════════════════
   Yearly Heatmap Grid Component
   ═══════════════════════════════════════════ */
const HeatmapChart = ({ data }) => {
    const [tooltip, setTooltip] = useState(null);
    const containerRef = React.useRef(null);
    const [dims, setDims] = useState({ w: 0, h: 0 });

    useEffect(() => {
        if (!containerRef.current) return;
        const obs = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            setDims({ w: width, h: height });
        });
        obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    // Calculate max per category for normalization
    const maxPerCat = useMemo(() => {
        const m = {};
        CATEGORIES.forEach(cat => {
            m[cat] = Math.max(1, ...data.map(d => d[cat] || 0));
        });
        return m;
    }, [data]);

    const { w, h } = dims;
    const labelW = Math.max(40, w * 0.07);
    const headerH = Math.max(28, h * 0.08);
    const gap = 3;
    const cols = CATEGORIES.length;
    const rows = data.length;
    const cellW = rows > 0 && cols > 0 ? (w - labelW - gap * (cols - 1)) / cols : 0;
    const cellH = rows > 0 ? (h - headerH - gap * (rows - 1) - 24) / rows : 0;

    const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
    };

    const getCellColor = (cat, value) => {
        const ratio = maxPerCat[cat] > 0 ? value / maxPerCat[cat] : 0;
        const baseHex = GRADIENT_ENDS[cat] || '#9E9E9E';
        const { r, g, b } = hexToRgb(baseHex);
        const alpha = 0.08 + ratio * 0.82; // min 0.08, max 0.90
        return `rgba(${r},${g},${b},${alpha})`;
    };

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', userSelect: 'none' }}>
            {w > 0 && h > 0 && (
                <svg width={w} height={h}>
                    {/* Column Headers (Category names) */}
                    {CATEGORIES.map((cat, ci) => (
                        <text key={cat}
                            x={labelW + ci * (cellW + gap) + cellW / 2}
                            y={headerH - 8}
                            textAnchor="middle"
                            fontSize={Math.min(13, cellW * 0.22)}
                            fontWeight="700"
                            fill="#6B7280">
                            {cat}
                        </text>
                    ))}
                    {/* Rows (months) */}
                    {data.map((d, ri) => (
                        <g key={d.key}>
                            {/* Row label */}
                            <text
                                x={labelW - 8}
                                y={headerH + ri * (cellH + gap) + cellH / 2 + 4}
                                textAnchor="end"
                                fontSize={Math.min(12, cellH * 0.45)}
                                fontWeight="600"
                                fill="#9CA3AF">
                                {d.displayDate}
                            </text>
                            {/* Cells */}
                            {CATEGORIES.map((cat, ci) => {
                                const val = d[cat] || 0;
                                const x = labelW + ci * (cellW + gap);
                                const y = headerH + ri * (cellH + gap);
                                return (
                                    <g key={cat}
                                        onMouseEnter={(e) => {
                                            const rect = containerRef.current.getBoundingClientRect();
                                            setTooltip({
                                                cat, month: d.displayDate, value: Math.round(val * 10) / 10,
                                                x: e.clientX - rect.left, y: e.clientY - rect.top
                                            });
                                        }}
                                        onMouseMove={(e) => {
                                            const rect = containerRef.current.getBoundingClientRect();
                                            setTooltip(prev => prev ? {
                                                ...prev,
                                                x: e.clientX - rect.left, y: e.clientY - rect.top
                                            } : null);
                                        }}
                                        onMouseLeave={() => setTooltip(null)}
                                        style={{ cursor: 'pointer' }}>
                                        <rect
                                            x={x} y={y}
                                            width={cellW} height={cellH}
                                            rx={Math.min(6, cellW * 0.08)}
                                            fill={getCellColor(cat, val)}
                                            stroke={tooltip?.cat === cat && tooltip?.month === d.displayDate ? '#374151' : 'rgba(255,255,255,0.6)'}
                                            strokeWidth={tooltip?.cat === cat && tooltip?.month === d.displayDate ? 2 : 1}
                                        />
                                        {/* Show hours text if cell is large enough and value > 0 */}
                                        {cellW > 50 && cellH > 18 && val > 0 && (
                                            <text
                                                x={x + cellW / 2}
                                                y={y + cellH / 2 + 4}
                                                textAnchor="middle"
                                                fontSize={Math.min(11, cellH * 0.38)}
                                                fontWeight="700"
                                                fill={val / maxPerCat[cat] > 0.5 ? '#fff' : '#6B7280'}
                                                style={{ textShadow: val / maxPerCat[cat] > 0.5 ? '0 1px 2px rgba(0,0,0,0.3)' : 'none' }}
                                                pointerEvents="none">
                                                {Math.round(val)}h
                                            </text>
                                        )}
                                    </g>
                                );
                            })}
                        </g>
                    ))}
                </svg>
            )}
            {/* Tooltip */}
            {tooltip && (
                <div style={{
                    position: 'absolute',
                    left: tooltip.x + 12, top: tooltip.y - 40,
                    background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.12)', padding: '8px 14px',
                    pointerEvents: 'none', zIndex: 50, whiteSpace: 'nowrap'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#25282B', marginBottom: '2px' }}>
                        {tooltip.month} · {tooltip.cat}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[tooltip.cat] }} />
                        <span style={{ fontSize: '13px', fontWeight: 800, color: GRADIENT_ENDS[tooltip.cat] }}>
                            {tooltip.value}h
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ═══════════════════════════════════════════
   Dashboard Component
   ═══════════════════════════════════════════ */
const Dashboard = ({ currentUser }) => {
    // 현황판(Kiosk) 모드 플래그: true일 경우 모든 hover 및 tooltip 반응 비활성화
    const isDisplayBoardMode = true; 

    const [timeRange, setTimeRange] = useState('weekly');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [rawTimesheets, setRawTimesheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showManpowerAnalysis, setShowManpowerAnalysis] = useState(false);
    const [showOvertimeModal, setShowOvertimeModal] = useState(false);
    const [viewMode, setViewMode] = useState('hours');
    const [showStaffDetail, setShowStaffDetail] = useState(false);
    const [filterDept, setFilterDept] = useState('전체');
    const [activeDonutIdx, setActiveDonutIdx] = useState(-1);

    const activeViewMode = viewMode;

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
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
            if (range === 'monthly') {
                // Include weeks that straddle month boundaries
                // (e.g. week_start=Dec 29 should be included for January if any day is in Jan)
                const weekEnd = addDays(d, 6);
                return isSameMonth(d, date) || isSameMonth(weekEnd, date);
            }
            return isSameYear(d, date);
        });

        const filteredData = filterByRange(rawTimesheets, currentDate, timeRange);

        // Previous period for trend calculation
        const prevDate = timeRange === 'weekly' ? subWeeks(currentDate, 1) : timeRange === 'monthly' ? subMonths(currentDate, 1) : subYears(currentDate, 1);
        const prevData = filterByRange(rawTimesheets, prevDate, timeRange);

        // ── Projects by Category ──
        const projectMap = {};
        const prevProjectMap = {};
        CATEGORIES.forEach(c => { projectMap[c] = 0; prevProjectMap[c] = 0; });
        filteredData.forEach(item => { projectMap[getCategory(item.project_name)] += parseFloat(item.total || 0); });
        prevData.forEach(item => { prevProjectMap[getCategory(item.project_name)] += parseFloat(item.total || 0); });
        
        const project = CATEGORIES.map(name => {
            const current = Math.round(projectMap[name] * 10) / 10;
            const prev = Math.round(prevProjectMap[name] * 10) / 10;
            const diffHours = Math.round((current - prev) * 10) / 10;
            const diffPercent = prev > 0 ? Math.round(((current - prev) / prev) * 100) : 0;
            return { name, billable: current, prev, diffHours, diffPercent };
        });

        // ── Staff & Department ──
        const staffMap = {}, departmentMap = {};
        filteredData.forEach(item => {
            const emp = item.employee || 'Unknown', dept = item.department || '미소속';
            const cat = getCategory(item.project_name), hrs = parseFloat(item.total || 0);
            if (!staffMap[emp]) { staffMap[emp] = { total: 0, department: dept }; CATEGORIES.forEach(c => staffMap[emp][c] = 0); }
            staffMap[emp].total += hrs; staffMap[emp][cat] += hrs;
            if (!departmentMap[dept]) { departmentMap[dept] = { total: 0, members: new Set() }; CATEGORIES.forEach(c => departmentMap[dept][c] = 0); }
            departmentMap[dept].total += hrs; departmentMap[dept][cat] += hrs; departmentMap[dept].members.add(emp);
        });

        // Pre-populate all defined team members (even those with 0 hours)
        Object.entries(TEAM_MEMBER_ORDER).forEach(([dept, members]) => {
            if (!departmentMap[dept]) { departmentMap[dept] = { total: 0, members: new Set() }; CATEGORIES.forEach(c => departmentMap[dept][c] = 0); }
            members.forEach(name => {
                if (!staffMap[name]) { staffMap[name] = { total: 0, department: dept }; CATEGORIES.forEach(c => staffMap[name][c] = 0); }
                // TEAM_MEMBER_ORDER가 권위적인 소속 정보: 빈 문자열이나 '미소속'인 경우 올바른 팀명으로 덮어씀
                if (!staffMap[name].department || staffMap[name].department === '미소속') {
                    staffMap[name].department = dept;
                }
                departmentMap[dept].members.add(name);
            });
        });
        // Pre-populate department head
        if (!staffMap[DEPARTMENT_HEAD.name]) {
            staffMap[DEPARTMENT_HEAD.name] = { total: 0, department: DEPARTMENT_HEAD.department };
            CATEGORIES.forEach(c => staffMap[DEPARTMENT_HEAD.name][c] = 0);
        }

        const toRatioRow = (name, data) => {
            const row = { name, hours: Math.round(data.total * 10) / 10, department: data.department };
            CATEGORIES.forEach(cat => {
                row[cat] = data.total > 0 ? Math.round((data[cat] / data.total) * 100) : 0;
                row[`${cat}_hours`] = Math.round(data[cat] * 10) / 10;
            });
            return row;
        };

        // Build staff array with custom ordering per department
        const staff = [];
        Object.entries(TEAM_MEMBER_ORDER).forEach(([dept, orderedNames]) => {
            // Add members in defined order first
            orderedNames.forEach(name => {
                if (staffMap[name]) staff.push(toRatioRow(name, staffMap[name]));
            });
            // Add any remaining members of this dept not in the predefined list
            Object.entries(staffMap).forEach(([name, data]) => {
                if (data.department === dept && !orderedNames.includes(name)) {
                    staff.push(toRatioRow(name, data));
                }
            });
        });
        // Add members from departments not in TEAM_MEMBER_ORDER
        Object.entries(staffMap).forEach(([name, data]) => {
            if (!staff.some(s => s.name === name) && name !== DEPARTMENT_HEAD.name) {
                staff.push(toRatioRow(name, data));
            }
        });
        const departmentRows = Object.entries(departmentMap).map(([name, data]) => {
            const memberCount = data.members.size;
            const displayLabel = DEPT_DISPLAY_LABEL[name] || name;
            const row = { name, displayLabel, hours: data.total, memberCount, perPerson: memberCount > 0 ? Math.round(data.total / memberCount * 10) / 10 : 0 };
            CATEGORIES.forEach(cat => {
                row[cat] = data.total > 0 ? Math.round((data[cat] / data.total) * 100) : 0;
                row[`${cat}_hours`] = Math.round(data[cat] * 10) / 10;
                row[`${cat}_perPerson`] = memberCount > 0 ? Math.round(data[cat] / memberCount * 10) / 10 : 0;
            });
            return row;
        }).sort((a, b) => {
            const ai = DEPARTMENT_ORDER.indexOf(a.name);
            const bi = DEPARTMENT_ORDER.indexOf(b.name);
            return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        });

        // ── Stats ──
        // 연차·반차·공휴일은 실제 근무 시간이 아니므로 총 근무 시간에서 제외
        const LEAVE_TYPES = new Set(['연차', '반차', '공휴일']);
        const totalHours = filteredData.reduce((s, i) => LEAVE_TYPES.has(i.project_name) ? s : s + parseFloat(i.total || 0), 0);
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

        const departmentHead = staffMap[DEPARTMENT_HEAD.name] ? toRatioRow(DEPARTMENT_HEAD.name, staffMap[DEPARTMENT_HEAD.name]) : null;

        return { project, staff, totalHours, strategicRatio, totalOvertime, hoursTrend, overtimeTrend, overtimeList, areaChartData, sparklineData, departmentRows, departmentHead };
    }, [rawTimesheets, timeRange, currentDate]);

    if (loading) return <div className="p-10 text-center text-gray-500">Loading...</div>;

    const donutData = processedData.project.filter(d => d.billable > 0);
    const topIncreases = [...processedData.project].filter(d => d.diffHours > 0).sort((a,b) => b.diffHours - a.diffHours).slice(0, 2);
    const topDecreases = [...processedData.project].filter(d => d.diffHours < 0).sort((a,b) => a.diffHours - b.diffHours).slice(0, 2);

    return (
        <div className="flex flex-col h-full w-full bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 p-[clamp(1rem,2vw,2.5rem)] gap-[clamp(0.5rem,1.5vh,1.5rem)]">

            {/* ═══ 1. Header (flex-none: 고정 높이) ═══ */}
            <header className="flex-none flex justify-between items-center">
                <div>
                    <h2 className="text-[clamp(1.5rem,3vw,3rem)] font-extrabold tracking-tight text-kh-text-main leading-tight">R&D Center Dashboard</h2>
                    <p className="text-[clamp(0.75rem,1.2vw,1.5rem)] text-gray-500 font-medium mt-1">{formatDateLabel()}</p>
                </div>
                <div className="flex items-center gap-[clamp(0.5rem,0.8vw,1rem)]">
                    <div className="flex bg-gray-100 rounded-xl p-1">
                        {['weekly', 'monthly', 'yearly'].map(r => (
                            <button key={r} onClick={() => { setTimeRange(r); if (r !== 'monthly') setViewMode('hours'); }}
                                className={`px-[clamp(0.75rem,1vw,1.5rem)] py-[clamp(0.25rem,0.5vh,0.5rem)] rounded-lg text-[clamp(0.7rem,0.9vw,1.1rem)] font-bold transition-all ${timeRange === r ? 'bg-white text-kh-green shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                {r === 'weekly' ? 'WEEK' : r === 'monthly' ? 'MONTH' : 'YEAR'}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 bg-white px-[clamp(0.5rem,0.8vw,1.25rem)] py-[clamp(0.25rem,0.5vh,0.5rem)] border border-gray-100 rounded-xl text-[clamp(0.75rem,1vw,1.25rem)] text-gray-500 shadow-sm">
                        <button onClick={handlePrev} className="p-1 hover:text-kh-text-main hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                        <span className="min-w-[clamp(8rem,12vw,14rem)] text-center font-bold text-kh-text-main">{formatDateLabel()}</span>
                        <button onClick={handleNext} className="p-1 hover:text-kh-text-main hover:bg-gray-100 rounded-full transition-colors"><ChevronRight size={20} /></button>
                    </div>
                    <button onClick={() => { setShowStaffDetail(true); setFilterDept('전체'); }} className="whitespace-nowrap px-[clamp(0.75rem,1vw,1.5rem)] py-[clamp(0.4rem,0.6vh,0.75rem)] bg-white border border-gray-200 text-gray-700 rounded-xl text-[clamp(0.7rem,0.9vw,1rem)] font-bold hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
                        상세 현황 보기
                    </button>
                    <button
                        onClick={() => setShowManpowerAnalysis(true)}
                        className="whitespace-nowrap px-[clamp(0.75rem,1vw,1.5rem)] py-[clamp(0.4rem,0.6vh,0.75rem)] bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-[clamp(0.7rem,0.9vw,1rem)] font-bold hover:shadow-lg transition-all flex items-center justify-center shadow-sm"
                    >
                        맨아워 분석
                    </button>
                    <button onClick={() => setShowOvertimeModal(true)} className="p-[clamp(0.4rem,0.6vh,0.75rem)] bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors">
                        <Users size={20} />
                    </button>
                </div>
            </header>

            {/* ═══ 2. KPI Cards Section (flex-none: 콘텐츠 높이만큼) ═══ */}
            <section className="flex-none grid grid-cols-3 gap-[clamp(0.5rem,1vw,1.5rem)]">

                {/* ─── KPI Card 1: Total Hours + Sparkline ─── */}
                <div className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-white shadow-[0_12px_40px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] hover:-translate-y-1 relative overflow-hidden flex items-center p-[clamp(0.75rem,1.5vw,1.5rem)] gap-[clamp(0.5rem,1vw,1.25rem)]">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-r-full bg-kh-green" />
                    <div className="flex-1 min-w-0 flex flex-col justify-center pl-3">
                        <p className="text-[clamp(0.6rem,0.7vw,0.9rem)] font-extrabold text-gray-400 tracking-widest uppercase mb-0.5 whitespace-nowrap">총 근무 시간</p>
                        <p className="text-[clamp(2rem,min(3.5vw,6vh),4rem)] font-black text-kh-text-main whitespace-nowrap tracking-tight leading-none">{processedData.totalHours.toLocaleString()} <span className="text-[clamp(1rem,min(1.2vw,2.5vh),1.75rem)] font-bold text-gray-300 ml-0.5">h</span></p>
                        <div className="flex items-center gap-1 mt-1">
                            {processedData.hoursTrend >= 0
                                ? <TrendingUp size={14} className="text-emerald-500" />
                                : <TrendingDown size={14} className="text-red-500" />}
                            <span className={`text-[clamp(0.6rem,0.7vw,0.9rem)] font-bold ${processedData.hoursTrend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {processedData.hoursTrend > 0 ? '+' : ''}{processedData.hoursTrend}%
                            </span>
                            <span className="text-[clamp(0.5rem,0.6vw,0.75rem)] font-medium text-gray-400 ml-0.5">vs 이전기간</span>
                        </div>
                    </div>
                    <div className="w-[clamp(4rem,8vw,7rem)] h-[clamp(1.5rem,3vh,3rem)] shrink-0">
                        <ResponsiveContainer width="99%" height="99%">
                            <AreaChart data={processedData.sparklineData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
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
                <div className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-white shadow-[0_12px_40px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] hover:-translate-y-1 relative overflow-hidden flex items-center p-[clamp(0.75rem,1.5vw,1.5rem)]">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-r-full bg-kh-lime" />
                    <div className="flex-1 min-w-0 flex flex-col justify-center pl-3">
                        <p className="text-[clamp(0.6rem,0.7vw,0.9rem)] font-extrabold text-gray-400 tracking-widest uppercase mb-0.5 whitespace-nowrap">전략 업무 비중</p>
                        <p className="text-[clamp(2rem,min(3.5vw,6vh),4rem)] font-black text-kh-text-main whitespace-nowrap tracking-tight leading-none">{processedData.strategicRatio}<span className="text-[clamp(1rem,min(1.2vw,2.5vh),1.75rem)] font-bold text-gray-300 ml-0.5">%</span></p>
                        <p className="text-[clamp(0.5rem,0.6vw,0.75rem)] text-gray-400 mt-0.5 whitespace-nowrap font-medium">AI + BIM + Smart R&D</p>
                    </div>
                    <div className="w-[clamp(3rem,6vw,5.5rem)] h-[clamp(2rem,3.5vh,3.5rem)] shrink-0">
                        <ResponsiveContainer width="99%" height="99%">
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
                <div className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-white shadow-[0_12px_40px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] hover:-translate-y-1 relative overflow-hidden flex items-center p-[clamp(0.75rem,1.5vw,1.5rem)] gap-[clamp(0.5rem,1vw,1.25rem)]">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-r-full bg-orange-400" />
                    <div className="flex-1 min-w-0 flex flex-col justify-center pl-3">
                        <p className="text-[clamp(0.6rem,0.7vw,0.9rem)] font-extrabold text-gray-400 tracking-widest uppercase mb-0.5 whitespace-nowrap">초과 근무</p>
                        <p className="text-[clamp(2rem,min(3.5vw,6vh),4rem)] font-black text-kh-text-main whitespace-nowrap tracking-tight leading-none">{Math.round(processedData.totalOvertime).toLocaleString()} <span className="text-[clamp(1rem,min(1.2vw,2.5vh),1.75rem)] font-bold text-gray-300 ml-0.5">h</span></p>
                        <div className="flex items-center gap-1 mt-1">
                            {processedData.overtimeTrend <= 0
                                ? <TrendingDown size={14} className="text-emerald-500" />
                                : <TrendingUp size={14} className="text-red-500" />}
                            <span className={`text-[clamp(0.6rem,0.7vw,0.9rem)] font-bold ${processedData.overtimeTrend <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {processedData.overtimeTrend > 0 ? '+' : ''}{processedData.overtimeTrend}%
                            </span>
                            <span className="text-[clamp(0.5rem,0.6vw,0.75rem)] font-medium text-gray-400 ml-0.5">vs 이전기간</span>
                        </div>
                    </div>
                    <div className="w-[clamp(4rem,8vw,7rem)] h-[clamp(1.5rem,3vh,3rem)] shrink-0">
                        <ResponsiveContainer width="99%" height="99%">
                            <AreaChart data={processedData.sparklineData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
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
            </section>

            {/* ═══ 3. Charts Section (flex-1 min-h-0: 남은 공간 모두 차지 — 핵심!) ═══ */}
            <section className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-[clamp(0.5rem,1vw,1.5rem)]">

                {/* ─── 하단 Chart Boards (컴포넌트 분리됨) ─── */}
                {timeRange === 'weekly' && (
                    <WeeklyChartBoard 
                        key={`${currentDate.toISOString()}-weekly`}
                        data={processedData.areaChartData}
                        totalHours={processedData.totalHours}
                        isDisplayBoardMode={isDisplayBoardMode}
                    />
                )}
                {timeRange === 'monthly' && (
                        <MonthlyChartBoard
                            key={`${currentDate.toISOString()}-monthly`}
                            data={processedData.areaChartData}
                            activeViewMode={activeViewMode}
                            setViewMode={setViewMode}
                            isDisplayBoardMode={isDisplayBoardMode}
                        />
                )}
                {timeRange === 'yearly' && (
                        <YearlyChartBoard
                            key={`${currentDate.toISOString()}-yearly`}
                            data={processedData.areaChartData}
                            activeViewMode={activeViewMode}
                            setViewMode={setViewMode}
                            isDisplayBoardMode={isDisplayBoardMode}
                        />
                )}

                {/* ─── Donut Chart (오른쪽 1/3) ─── */}
                <div className="lg:col-span-1 bg-white/80 backdrop-blur-2xl rounded-3xl border border-white p-[clamp(0.75rem,1.5vw,2rem)] shadow-[0_12px_40px_rgba(0,0,0,0.04)] flex flex-col min-h-0">
                    <div className="flex-none flex justify-between items-end mb-[clamp(0.5rem,1vh,1.5rem)] pb-[clamp(0.25rem,0.5vh,0.75rem)] border-b border-gray-50">
                        <h3 className="text-[clamp(1rem,1.2vw,1.5rem)] font-extrabold tracking-tight text-kh-text-main pb-1">업무별 시간 비중</h3>
                        <div className="text-right flex items-baseline gap-1.5 pb-0.5">
                            <span className="text-[clamp(0.65rem,0.8vw,0.9rem)] text-gray-400 font-bold">총 업무시간</span>
                            <div>
                                <span className="text-[clamp(1.2rem,1.75vw,2.25rem)] font-black text-kh-text-main tracking-tight leading-none">{Math.round(processedData.totalHours).toLocaleString()}</span>
                                <span className="text-[clamp(0.8rem,1vw,1.25rem)] text-gray-300 font-bold ml-0.5">h</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0 flex items-center justify-between" style={{ pointerEvents: isDisplayBoardMode ? 'none' : 'auto' }}>
                        {/* 1. Left Side: Top Increases */}
                        <div className="w-[25%] flex flex-col justify-center items-end text-right gap-3 pr-2">
                            {topIncreases.map(item => (
                                <div key={item.name} className="flex flex-col">
                                    <div className="text-[clamp(10px,0.7vw,12px)] text-gray-500 font-bold mb-0.5">{item.name}</div>
                                    <div className="text-[clamp(12px,0.9vw,14px)] font-black text-emerald-500 whitespace-nowrap">
                                        ▲ +{item.diffHours.toLocaleString()}h
                                    </div>
                                    <div className="text-[clamp(9px,0.6vw,11px)] font-medium text-emerald-400">
                                        (+{item.diffPercent}%)
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 2. Middle: Donut Chart */}
                        <div className="w-[50%] h-full relative">
                            {donutData.length > 0 ? (
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
                                        <Pie data={donutData} cx="50%" cy="50%" innerRadius="40%" outerRadius="80%" isAnimationActive={false}
                                            dataKey="billable" stroke="none" paddingAngle={2}
                                            label={false} labelLine={false}
                                            activeIndex={activeDonutIdx} activeShape={renderActiveDonut}
                                            onMouseEnter={(_, i) => setActiveDonutIdx(i)} onMouseLeave={() => setActiveDonutIdx(-1)}>
                                            {donutData.map((_, i) => <Cell key={i} fill={`url(#dnt-${i})`} />)}
                                        </Pie>
                                        <Tooltip content={<GlassTooltip />} isAnimationActive={false} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-300 text-[clamp(0.7rem,0.8vw,1rem)]">데이터 없음</div>
                            )}
                        </div>

                        {/* 3. Right Side: Top Decreases */}
                        <div className="w-[25%] flex flex-col justify-center items-start text-left gap-3 pl-2">
                            {topDecreases.map(item => (
                                <div key={item.name} className="flex flex-col">
                                    <div className="text-[clamp(10px,0.7vw,12px)] text-gray-500 font-bold mb-0.5">{item.name}</div>
                                    <div className="text-[clamp(12px,0.9vw,14px)] font-black text-red-500 whitespace-nowrap">
                                        ▼ {item.diffHours.toLocaleString()}h
                                    </div>
                                    <div className="text-[clamp(9px,0.6vw,11px)] font-medium text-red-400">
                                        ({item.diffPercent}%)
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Legend */}
                    <div className="flex-none flex flex-wrap gap-x-[clamp(0.5rem,1vw,1.5rem)] gap-y-1 mt-[clamp(1rem,2vh,2rem)] mb-[clamp(0.5rem,1vh,1rem)] justify-center">
                        {CATEGORIES.map(cat => (
                            <div key={cat} className="flex items-center gap-1.5">
                                <span className="w-[clamp(0.5rem,0.7vw,1rem)] h-[clamp(0.5rem,0.7vw,1rem)] rounded-full shrink-0" style={{ background: CATEGORY_COLORS[cat] }} />
                                <span className="text-[clamp(12px,0.8vw,14px)] text-gray-500 font-medium">{cat}</span>
                            </div>
                        ))}
                    </div>

                    {/* Rank Summary Table-like */}
                    <div className="flex-none flex flex-col gap-[clamp(0.25rem,0.5vh,0.4rem)] pt-[clamp(0.6rem,1vh,1rem)] border-t border-gray-100 overflow-y-auto min-h-0">
                        <div className="flex justify-between items-end mb-[clamp(0.2rem,0.4vh,0.5rem)] px-1 relative">
                            <span className="text-[clamp(0.75rem,0.9vw,1rem)] font-extrabold text-gray-500 tracking-tight">업무 항목별 순위</span>
                            <span className="text-[clamp(10px,0.7vw,11px)] font-bold text-gray-400 absolute right-1 pb-[1px]">전월 대비(Δ)</span>
                        </div>
                        {[...processedData.project]
                            .filter(item => item.billable > 0 || item.diffHours !== 0)
                            .sort((a, b) => b.billable - a.billable)
                            .map((item, idx) => {
                                const isInc = item.diffHours > 0;
                                return (
                                <div key={item.name} className="flex items-center px-1 py-[clamp(0.15rem,0.3vh,0.25rem)] rounded hover:bg-gray-50/50 transition-colors">
                                    {/* 1. 순위 (9%) */}
                                    <div className="w-[9%] text-center font-bold text-gray-400 text-[clamp(12px,0.8vw,13px)]">{idx + 1}위</div>
                                    
                                    {/* 2. 항목명과 색상점 (29%) */}
                                    <div className="w-[29%] flex items-center gap-1.5 pl-1 pr-1">
                                        <span className="w-[clamp(0.35rem,0.5vw,0.5rem)] h-[clamp(0.35rem,0.5vw,0.5rem)] rounded-full shrink-0" style={{ background: CATEGORY_COLORS[item.name] }} />
                                        <span className="font-semibold text-gray-600 text-[clamp(12px,0.8vw,13px)] truncate">{item.name}</span>
                                    </div>

                                    {/* 3. 시간 (18%) */}
                                    <div className="w-[18%] text-right pr-[clamp(0.25rem,0.4vw,0.5rem)]">
                                        <span className="font-semibold text-kh-text-main text-[clamp(13px,0.9vw,14px)] leading-none">{item.billable.toLocaleString()}</span>
                                        <span className="text-[clamp(10px,0.6vw,11px)] text-gray-400 font-semibold ml-0.5">h</span>
                                    </div>

                                    {/* 4. 비중/미니바 (22%) */}
                                    <div className="w-[22%] flex items-center gap-1 pr-1">
                                        <span className="w-[clamp(1.2rem,1.5vw,1.8rem)] font-bold text-kh-text-main text-[clamp(11px,0.7vw,12px)] text-right flex-shrink-0">
                                            {processedData.totalHours > 0 ? ((item.billable / processedData.totalHours) * 100).toFixed(0) : 0}%
                                        </span>
                                        <div className="h-1.5 flex-1 bg-gray-100 rounded-sm overflow-hidden flex-shrink-1">
                                            <div 
                                                className="h-full rounded-sm transition-all duration-500"
                                                style={{ 
                                                    width: `${processedData.totalHours > 0 ? (item.billable / processedData.totalHours) * 100 : 0}%`,
                                                    background: CATEGORY_COLORS[item.name]
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* 5. 전월 대비 (22%) */}
                                    <div className="w-[22%] text-right pr-1">
                                        {item.diffHours !== 0 ? (
                                            <span className={`font-bold text-[clamp(11px,0.75vw,13px)] whitespace-nowrap tracking-tighter ${isInc ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {isInc ? '▲ +' : '▼ '}{item.diffHours.toLocaleString()}h
                                            </span>
                                        ) : (
                                            <span className="font-bold text-[clamp(11px,0.75vw,13px)] text-gray-300">-</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>



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

            {/* ═══ Team Summary Modal ═══ */}
            {showStaffDetail && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col">
                        <div className="p-5 border-b flex flex-col gap-4 bg-gray-50">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-dark">{filterDept === '전체' ? '팀별 업무 현황' : `${filterDept} 상세 현황`}</h3>
                                <button onClick={() => setShowStaffDetail(false)}><X size={24} className="text-gray-400" /></button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {['전체', '스마트기술개발팀', '디지털기술연구팀', '인프라BIM팀', 'AI응용팀'].map(dept => (
                                    <button key={dept} onClick={() => setFilterDept(dept)} className={`px-4 py-1.5 text-sm font-bold rounded-full transition-all ${filterDept === dept ? 'bg-kh-green text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}>{DEPT_DISPLAY_LABEL[dept] || dept}</button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto">
                            {filterDept === '전체' ? (
                                <table className="w-full text-sm text-center">
                                    <thead className="bg-[#1E2225] text-white sticky top-0 z-10">
                                        <tr>
                                            <th className="p-4 border-r border-white/10">팀</th>
                                            <th className="p-4 border-r border-white/10">인원</th>
                                            <th className="p-4 border-r border-white/10">총 시간</th>
                                            <th className="p-4 border-r border-white/10">1인당</th>
                                            {CATEGORIES.map(cat => <th key={cat} className="p-4 border-r border-white/10" style={{ borderBottom: `4px solid ${CATEGORY_COLORS[cat]}` }}>{cat}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {/* 김영근 (Department Head) row at top */}
                                        {(() => {
                                            const headData = processedData.departmentHead;
                                            if (!headData) return null;
                                            return (
                                                <tr className="hover:bg-blue-50/50 transition-colors bg-blue-50/30">
                                                    <td className="p-4 border-r border-gray-100 font-bold text-gray-800">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <span className="text-sm">{headData.name}</span>
                                                            <span className="text-[10px] text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full mt-1">센터장</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 border-r border-gray-100 text-gray-400">-</td>
                                                    <td className="p-4 border-r border-gray-100 font-bold text-lg">{Math.round(headData.hours)}h</td>
                                                    <td className="p-4 border-r border-gray-100 text-gray-400">-</td>
                                                    {CATEGORIES.map(cat => (
                                                        <td key={cat} className="p-4 border-r border-gray-100">
                                                            {headData[`${cat}_hours`] > 0 ? (
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <span className="text-xs font-bold text-gray-700">{headData[`${cat}_hours`]}h</span>
                                                                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                        <div className="h-full rounded-full" style={{ width: `${headData[cat]}%`, background: `linear-gradient(90deg, ${CATEGORY_COLORS[cat]}, ${GRADIENT_ENDS[cat]})` }} />
                                                                    </div>
                                                                    <span className="text-xs font-bold" style={{ color: CATEGORY_COLORS[cat] }}>{headData[cat]}%</span>
                                                                </div>
                                                            ) : <span className="text-gray-300">-</span>}
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        })()}
                                        {processedData.departmentRows.map((item, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setFilterDept(item.name)}>
                                                <td className="p-4 border-r border-gray-100 font-bold text-kh-green hover:underline">{item.displayLabel || item.name}</td>
                                                <td className="p-4 border-r border-gray-100 text-gray-600">{item.memberCount}명</td>
                                                <td className="p-4 border-r border-gray-100 font-bold text-lg">{Math.round(item.hours)}h</td>
                                                <td className="p-4 border-r border-gray-100 font-bold text-blue-600">{item.perPerson}h</td>
                                                {CATEGORIES.map(cat => (
                                                    <td key={cat} className="p-4 border-r border-gray-100">
                                                        {item[`${cat}_hours`] > 0 ? (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className="text-xs font-bold text-gray-700">{item[`${cat}_hours`]}h</span>
                                                                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                    <div className="h-full rounded-full" style={{ width: `${item[cat]}%`, background: `linear-gradient(90deg, ${CATEGORY_COLORS[cat]}, ${GRADIENT_ENDS[cat]})` }} />
                                                                </div>
                                                                <span className="text-xs" style={{ color: CATEGORY_COLORS[cat] }}><b>{item[`${cat}_perPerson`]}h</b>/인</span>
                                                            </div>
                                                        ) : <span className="text-gray-300">-</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="w-full text-sm text-center">
                                    <thead className="bg-[#1E2225] text-white sticky top-0 z-10">
                                        <tr>
                                            <th className="p-4 border-r border-white/10">Staff</th>
                                            <th className="p-4 border-r border-white/10">Total</th>
                                            {CATEGORIES.map(cat => <th key={cat} className="p-4 border-r border-white/10" style={{ borderBottom: `4px solid ${CATEGORY_COLORS[cat]}` }}>{cat}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {processedData.staff.filter(i => i.department === filterDept).map((item, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 border-r border-gray-100 font-medium">{item.name}</td>
                                                <td className="p-4 border-r border-gray-100 font-bold">{item.hours}h</td>
                                                {CATEGORIES.map(cat => (
                                                    <td key={cat} className="p-4 border-r border-gray-100">
                                                        {item[`${cat}_hours`] > 0 ? (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className="text-xs font-bold text-gray-700">{item[`${cat}_hours`]}h</span>
                                                                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {showManpowerAnalysis && (
                <ManpowerAnalysis onClose={() => setShowManpowerAnalysis(false)} />
            )}
        </div>
    );
};

export default Dashboard;
