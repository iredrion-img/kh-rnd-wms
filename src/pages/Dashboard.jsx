import React, { useState, useEffect, useMemo } from 'react';
import { Users, Clock, TrendingUp, ChevronLeft, ChevronRight, Percent, BarChart2, X } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine, LabelList } from 'recharts';
import { format, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears, startOfWeek, endOfWeek, parseISO, isSameWeek, isSameMonth, isSameYear, addDays, getDay, getWeekOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';

const CATEGORIES = ['AI', 'BIM', 'Digital Technology', 'Smart R&D', 'Etc'];
const CATEGORY_COLORS = {
    'AI': '#8CC63F', // kh-lime
    'BIM': '#009245', // kh-green
    'Smart R&D': '#006837', // Deep Green
    'Digital Technology': '#546E7A', // Slate Blue
    'Etc': '#9E9E9E' // Neutral Grey
};

// Helper to map project names to categories
const getCategory = (pName) => {
    if (!pName) return 'Etc';
    const name = pName.trim();
    const upperName = name.toUpperCase();

    // Exact matches based on keywords
    if (upperName.includes('AI')) return 'AI';
    if (upperName.includes('BIM')) return 'BIM';
    if (upperName.includes('DIGITAL') || upperName.includes('TECHNOLOGY')) return 'Digital Technology';
    if (upperName.includes('R&D') || upperName.includes('SMART')) return 'Smart R&D';
    if (upperName.includes('기타') || upperName.includes('ETC')) return 'Etc';

    return 'Etc'; // Default fallback
};

const Dashboard = () => {
    const [timeRange, setTimeRange] = useState('weekly'); // 'weekly', 'monthly', 'yearly'
    const [currentDate, setCurrentDate] = useState(new Date());
    const [rawTimesheets, setRawTimesheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showOvertimeModal, setShowOvertimeModal] = useState(false);
    const [viewMode, setViewMode] = useState('hours'); // 'hours' | 'percent' specifically for monthly view
    const [showStaffDetail, setShowStaffDetail] = useState(false);
    const [filterDept, setFilterDept] = useState('전체');

    // Fetch Data on Mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/timesheets');
                if (response.ok) {
                    const data = await response.json();
                    setRawTimesheets(data);
                }
            } catch (error) {
                console.error("Failed to fetch timesheets:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handlePrev = () => {
        if (timeRange === 'weekly') setCurrentDate(subWeeks(currentDate, 1));
        else if (timeRange === 'monthly') setCurrentDate(subMonths(currentDate, 1));
        else if (timeRange === 'yearly') setCurrentDate(subYears(currentDate, 1));
    };

    const handleNext = () => {
        if (timeRange === 'weekly') setCurrentDate(addWeeks(currentDate, 1));
        else if (timeRange === 'monthly') setCurrentDate(addMonths(currentDate, 1));
        else if (timeRange === 'yearly') setCurrentDate(addYears(currentDate, 1));
    };

    const formatDateLabel = () => {
        if (timeRange === 'weekly') {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            const end = endOfWeek(currentDate, { weekStartsOn: 1 });
            return `${format(start, 'M월 d일', { locale: ko })} - ${format(end, 'M월 d일', { locale: ko })}`;
        } else if (timeRange === 'monthly') {
            return format(currentDate, 'yyyy년 M월', { locale: ko });
        } else if (timeRange === 'yearly') {
            return format(currentDate, 'yyyy년', { locale: ko });
        }
        return '';
    };

    // Process and Aggregate Data
    const processedData = useMemo(() => {
        if (!rawTimesheets.length) return { project: [], staff: [], stats: [], overtimeList: [], areaChartData: [], CATEGORIES, CATEGORY_COLORS, departmentRows: [] };

        // 1. Filter Data by Time Range
        const filteredData = rawTimesheets.filter(item => {
            const itemDate = parseISO(item.week_start);
            if (timeRange === 'weekly') {
                return isSameWeek(itemDate, currentDate, { weekStartsOn: 1 });
            } else if (timeRange === 'monthly') {
                return isSameMonth(itemDate, currentDate);
            } else if (timeRange === 'yearly') {
                return isSameYear(itemDate, currentDate);
            }
            return false;
        });

        // 2. Aggregate Projects by Category (Fixed Order)
        const projectMap = {};
        CATEGORIES.forEach(cat => projectMap[cat] = 0);

        filteredData.forEach(item => {
            const category = getCategory(item.project_name);
            projectMap[category] += parseFloat(item.total || 0);
        });

        const project = CATEGORIES.map(name => ({
            name,
            billable: projectMap[name]
        }));

        // 3. Aggregate Staff & Department
        const staffMap = {};
        const departmentMap = {};

        filteredData.forEach(item => {
            const empName = item.employee || 'Unknown';
            const deptName = item.department || '미소속';
            const category = getCategory(item.project_name);
            const hours = parseFloat(item.total || 0);

            // Staff Aggregation
            if (!staffMap[empName]) {
                staffMap[empName] = { total: 0, department: deptName };
                CATEGORIES.forEach(c => staffMap[empName][c] = 0);
            }
            staffMap[empName].total += hours;
            staffMap[empName][category] += hours;

            // Department Aggregation
            if (!departmentMap[deptName]) {
                departmentMap[deptName] = { total: 0 };
                CATEGORIES.forEach(c => departmentMap[deptName][c] = 0);
            }
            departmentMap[deptName].total += hours;
            departmentMap[deptName][category] += hours;
        });

        // Convert Staff Map to Array
        const staff = Object.entries(staffMap).map(([name, data]) => {
            const person = { name, hours: data.total, department: data.department };
            CATEGORIES.forEach(cat => {
                const catHours = data[cat];
                const ratio = data.total > 0 ? (catHours / data.total) * 100 : 0;
                person[cat] = Math.round(ratio);
            });
            return person;
        }).sort((a, b) => b.hours - a.hours);

        // Convert Department Map to Array
        const departmentRows = Object.entries(departmentMap).map(([name, data]) => {
            const row = { name, hours: data.total };
            CATEGORIES.forEach(cat => {
                const catHours = data[cat];
                const ratio = data.total > 0 ? (catHours / data.total) * 100 : 0;
                row[cat] = Math.round(ratio);
            });
            return row;
        }).sort((a, b) => b.hours - a.hours);

        // 4. Calculate Stats
        const totalHours = filteredData.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);

        // Simple Overtime: >40h per week per person
        const userWeekMap = {};
        filteredData.forEach(item => {
            const key = `${item.employee}-${item.week_start}`;
            if (!userWeekMap[key]) userWeekMap[key] = 0;
            userWeekMap[key] += parseFloat(item.total || 0);
        });

        let totalOvertime = 0;
        Object.values(userWeekMap).forEach(hours => {
            if (hours > 40) totalOvertime += (hours - 40);
        });

        const strategicHours = filteredData.reduce((sum, item) => {
            const cat = getCategory(item.project_name);
            if (cat === 'AI' || cat === 'BIM' || cat === 'Smart R&D') {
                return sum + parseFloat(item.total || 0);
            }
            return sum;
        }, 0);
        const strategicRatio = totalHours > 0 ? Math.round((strategicHours / totalHours) * 100) : 0;

        const stats = [
            { title: '총 근무 시간', value: `${totalHours.toLocaleString()} h`, color: 'text-kh-text-main', icon: Clock },
            { title: '전략 업무 비중', value: `${strategicRatio}%`, color: 'text-green-600', icon: TrendingUp },
            { title: '총 초과 근무', value: `${Math.round(totalOvertime).toLocaleString()} h`, color: 'text-orange-500', icon: Users }
        ];

        const overtimeList = Object.entries(userWeekMap)
            .filter(([_, hours]) => hours > 40)
            .map(([key, hours]) => ({ name: key.split('-')[0], hours: Math.round(hours - 40) }))
            .sort((a, b) => b.hours - a.hours);

        // 5. Area Chart Data
        const areaMap = {};
        filteredData.forEach(item => {
            const startDate = parseISO(item.week_start);
            const category = getCategory(item.project_name);
            const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

            days.forEach((day, index) => {
                const dateObj = addDays(startDate, index);
                const hours = parseFloat(item[day] || 0);
                if (hours > 0) {
                    let key, display;
                    if (timeRange === 'yearly') {
                        key = format(dateObj, 'yyyy-MM');
                        display = format(dateObj, 'M월', { locale: ko });
                    } else if (timeRange === 'monthly') {
                        const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
                        const weekNum = getWeekOfMonth(dateObj, { weekStartsOn: 1 });
                        key = format(weekStart, 'yyyy-MM-dd');
                        display = `${weekNum}주차`;
                    } else {
                        key = format(dateObj, 'yyyy-MM-dd');
                        display = format(dateObj, 'M/d(eee)', { locale: ko });
                    }

                    if (!areaMap[key]) {
                        areaMap[key] = { key, displayDate: display };
                        CATEGORIES.forEach(c => areaMap[key][c] = 0);
                    }
                    areaMap[key][category] += hours;
                }
            });
        });
        const areaChartData = Object.values(areaMap).sort((a, b) => a.key.localeCompare(b.key));

        return { project, staff, stats, overtimeList, areaChartData, CATEGORIES, CATEGORY_COLORS, departmentRows };

    }, [rawTimesheets, timeRange, currentDate]);

    if (loading) return <div className="p-10 text-center text-gray-500">Loading...</div>;

    return (
        <div className="h-full w-full flex flex-col bg-kh-bg-main overflow-hidden p-6 gap-4">
            {/* Header Area: 5% Height */}
            <header className="flex justify-between items-center shrink-0 h-[5%]">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-kh-text-main fluid-text">R&D Center Dashboard</h2>
                    <p className="text-sm text-gray-400 font-medium">{formatDateLabel()}</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Time Range Selector */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {['weekly', 'monthly', 'yearly'].map((range) => (
                            <button
                                key={range}
                                onClick={() => {
                                    setTimeRange(range);
                                    if (range !== 'monthly') setViewMode('hours');
                                }}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${timeRange === range
                                    ? 'bg-white text-kh-green shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                {range === 'weekly' ? 'WEEK' : range === 'monthly' ? 'MONTH' : 'YEAR'}
                            </button>
                        ))}
                    </div>

                    {/* Date Nav */}
                    <div className="flex items-center space-x-2 bg-white px-3 py-1.5 border border-gray-100 rounded-lg text-sm text-gray-500 shadow-sm">
                        <button onClick={handlePrev} className="p-1 hover:text-kh-text-main hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={16} /></button>
                        <span className="min-w-[140px] text-center font-medium text-kh-text-main">{formatDateLabel()}</span>
                        <button onClick={handleNext} className="p-1 hover:text-kh-text-main hover:bg-gray-100 rounded-full transition-colors"><ChevronRight size={16} /></button>
                    </div>

                    {/* Check Overtime Button */}
                    <button
                        onClick={() => setShowOvertimeModal(true)}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 transition-colors flex items-center gap-2"
                    >
                        <Users size={16} />
                    </button>
                </div>
            </header>

            {/* Bento Grid: 95% Height */}
            <main className="flex-1 grid grid-cols-12 grid-rows-12 gap-4 min-h-0">

                {/* KPI Cards: Row 1-2 (approx 16%) */}
                <div className="col-span-12 row-span-2 grid grid-cols-3 gap-4">
                    {processedData.stats.map((stat, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                            <div>
                                <p className="text-sm font-semibold text-gray-500 mb-1">{stat.title}</p>
                                <p className="text-3xl font-extrabold text-kh-text-main">{stat.value}</p>
                                <p className="text-xs text-gray-400 mt-1">분석 기간: {timeRange === 'weekly' ? '이번 주' : timeRange === 'monthly' ? '이번 달' : '올해'}</p>
                            </div>
                            <div className={`p-3 rounded-xl bg-gray-50 ${stat.color}`}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Chart (Area/Bar): Col 1-8, Row 3-8 (approx 50%) */}
                <div className="col-span-8 row-span-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm relative flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-kh-text-main">주간 업무 현황</h3>
                            <p className="text-xs text-gray-400">시간 흐름에 따른 업무 비중의 변화를 확인하세요.</p>
                        </div>
                        {/* Monthly View Toggles */}
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
                                <BarChart data={processedData.areaChartData.filter(d => { const day = getDay(new Date(d.date || d.key)); return day >= 1 && day <= 5; })} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <filter id="glass-shadow" x="-50%" y="-50%" width="200%" height="200%">
                                            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.15" />
                                        </filter>
                                        {processedData.CATEGORIES.map((cat, i) => (
                                            <linearGradient key={cat} id={`glass-bar-${i}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={processedData.CATEGORY_COLORS[cat]} stopOpacity={0.9} />
                                                <stop offset="100%" stopColor={processedData.CATEGORY_COLORS[cat]} stopOpacity={0.4} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" strokeOpacity={0.5} />
                                    <XAxis dataKey="displayDate" stroke="#9CA3AF" fontSize={11} tickMargin={5} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#9CA3AF" fontSize={11} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                                        contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', backdropFilter: 'blur(8px)', backgroundColor: 'rgba(255,255,255,0.9)' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                                    {processedData.CATEGORIES.map((cat, i) => (
                                        <Bar
                                            key={cat}
                                            dataKey={cat}
                                            stackId="a"
                                            fill={`url(#glass-bar-${i})`}
                                            stroke={processedData.CATEGORY_COLORS[cat]}
                                            strokeWidth={1}
                                            radius={i === processedData.CATEGORIES.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                                            filter="url(#glass-shadow)"
                                        />
                                    ))}
                                </BarChart>
                            ) : (
                                <AreaChart data={processedData.areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <filter id="glass-glow" x="-50%" y="-50%" width="200%" height="200%">
                                            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                                            <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 18 -7" result="goo" />
                                            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                                        </filter>
                                        <filter id="shadow-line" height="200%">
                                            <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#000" floodOpacity="0.2" />
                                        </filter>
                                        {processedData.CATEGORIES.map((cat, i) => (
                                            <linearGradient key={cat} id={`glass-area-${i}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={processedData.CATEGORY_COLORS[cat]} stopOpacity={0.6} />
                                                <stop offset="90%" stopColor={processedData.CATEGORY_COLORS[cat]} stopOpacity={0.05} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <XAxis dataKey="displayDate" stroke="#9CA3AF" fontSize={11} tickMargin={5} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#9CA3AF" fontSize={11} axisLine={false} tickLine={false} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" strokeOpacity={0.5} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', backdropFilter: 'blur(8px)', backgroundColor: 'rgba(255,255,255,0.9)' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                                    {processedData.CATEGORIES.map((cat, i) => (
                                        <Area
                                            key={cat}
                                            type="monotone"
                                            dataKey={cat}
                                            stackId="1"
                                            stroke={processedData.CATEGORY_COLORS[cat]}
                                            strokeWidth={2}
                                            fill={`url(#glass-area-${i})`}
                                            filter="url(#shadow-line)"
                                        />
                                    ))}
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Composition Chart: Col 9-12, Row 3-8 (approx 50%) */}
                <div className="col-span-4 row-span-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-kh-text-main mb-4">업무별 시간 비중</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={processedData.project} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                <XAxis type="number" stroke="#9CA3AF" fontSize={11} />
                                <YAxis dataKey="name" type="category" hide />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#F9FAFB' }} />
                                <Bar dataKey="billable" name="업무 시간" stackId="a" radius={[0, 4, 4, 0]} barSize={32}>
                                    {processedData.project.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={processedData.CATEGORY_COLORS[entry.name]} />
                                    ))}
                                    <LabelList dataKey="name" position="insideRight" style={{ fill: '#fff', fontSize: '11px', fontWeight: 'bold' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Team Table: Row 9-12 (approx 33%) */}
                <div className="col-span-12 row-span-4 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                        <h3 className="text-lg font-bold text-kh-text-main">팀원별 상세 현황</h3>
                        <button onClick={() => { setShowStaffDetail(true); setFilterDept('전체'); }} className="text-sm text-kh-lime font-bold hover:text-green-700 transition-colors">전체 보기</button>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[#2e3236] text-white sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-5 py-3 font-semibold text-center border-r border-white/10">직원명</th>
                                    <th className="px-5 py-3 font-semibold text-center border-r border-white/10 w-[10%]">총 업무 시간</th>
                                    {processedData.CATEGORIES.map(cat => (
                                        <th key={cat} className="px-4 py-3 text-center font-bold border-r border-white/10 last:border-none w-[12%]" style={{ borderBottom: `4px solid ${processedData.CATEGORY_COLORS[cat]}` }}>
                                            {cat}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {processedData.departmentRows && processedData.departmentRows.map(dept => (
                                    <tr key={dept.name} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-3 font-bold text-gray-700 text-center border-r border-gray-50">{dept.name}</td>
                                        <td className="px-5 py-3 font-bold text-kh-text-main text-center border-r border-gray-50">{dept.hours.toLocaleString()}h</td>
                                        {processedData.CATEGORIES.map(cat => (
                                            <td key={cat} className="px-4 py-3 text-center border-r border-gray-50 last:border-none">
                                                <span
                                                    className={`px-2 py-1 rounded-md text-xs font-bold block w-full ${dept[cat] > 0 ? '' : 'text-gray-300'}`}
                                                    style={dept[cat] > 0 ? { backgroundColor: `${processedData.CATEGORY_COLORS[cat]}20`, color: processedData.CATEGORY_COLORS[cat] } : {}}
                                                >
                                                    {dept[cat] > 0 ? `${dept[cat]}%` : '-'}
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>

            {/* Overtime Modal */}
            {showOvertimeModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="text-xl font-bold text-dark">Overtime Analysis</h3>
                            <button onClick={() => setShowOvertimeModal(false)}><X size={24} className="text-gray-400" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            {processedData.overtimeList.length > 0 ? (
                                <div className="space-y-6">
                                    <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={processedData.overtimeList.slice(0, 5)} layout="vertical"><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={60} /><Bar dataKey="hours" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20} /></BarChart></ResponsiveContainer></div>
                                    <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="p-2">Name</th><th className="p-2 text-right">Hours</th></tr></thead><tbody>{processedData.overtimeList.map((item, i) => <tr key={i} className="border-b"><td className="p-2">{item.name}</td><td className="p-2 text-right font-bold text-orange-600">+{item.hours}h</td></tr>)}</tbody></table>
                                </div>
                            ) : <div className="text-center py-10 text-gray-500">No overtime recorded.</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* Staff Details Modal */}
            {showStaffDetail && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b flex flex-col gap-4 bg-gray-50">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-dark">Staff Details</h3>
                                <button onClick={() => setShowStaffDetail(false)}><X size={24} className="text-gray-400" /></button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {['전체', ...processedData.departmentRows.map(d => d.name)].map((dept) => (
                                    <button key={dept} onClick={() => setFilterDept(dept)} className={`px-4 py-1.5 text-sm font-bold rounded-full transition-all ${filterDept === dept ? 'bg-kh-green text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}>{dept}</button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-0">
                            <table className="w-full text-sm text-center">
                                <thead className="bg-[#2e3236] text-white sticky top-0 z-10">
                                    <tr>
                                        <th className="p-4 border-r border-white/10">Staff</th>
                                        <th className="p-4 border-r border-white/10">Dept</th>
                                        <th className="p-4 border-r border-white/10">Total</th>
                                        {processedData.CATEGORIES.map(cat => <th key={cat} className="p-4 border-r border-white/10" style={{ borderBottom: `4px solid ${processedData.CATEGORY_COLORS[cat]}` }}>{cat}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {processedData.staff.filter(i => filterDept === '전체' || i.department === filterDept).map((item, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="p-4 border-r border-gray-100 font-medium">{item.name}</td>
                                            <td className="p-4 border-r border-gray-100 text-gray-500">{item.department}</td>
                                            <td className="p-4 border-r border-gray-100 font-bold">{item.hours}h</td>
                                            {processedData.CATEGORIES.map(cat => (
                                                <td key={cat} className="p-4 border-r border-gray-100"><span className={`px-2 py-1 rounded font-bold block ${item[cat] > 0 ? '' : 'text-gray-300'}`} style={item[cat] > 0 ? { backgroundColor: `${processedData.CATEGORY_COLORS[cat]}20`, color: processedData.CATEGORY_COLORS[cat] } : {}}>{item[cat] > 0 ? `${item[cat]}%` : '-'}</span></td>
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
