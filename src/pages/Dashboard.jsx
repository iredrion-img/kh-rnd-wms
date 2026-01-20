import React, { useState, useEffect, useMemo } from 'react';
import { Users, Clock, TrendingUp, ChevronLeft, ChevronRight, Percent, BarChart2 } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine, LabelList } from 'recharts';
import { format, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears, startOfWeek, endOfWeek, parseISO, isSameWeek, isSameMonth, isSameYear, addDays, getDay, getWeekOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';

const CATEGORIES = ['AI', 'BIM', 'Digital Technology', 'Smart R&D', 'Etc'];
const CATEGORY_COLORS = {
    'AI': '#6366f1', // Indigo-500: Primary, Tech-focused
    'BIM': '#0ea5e9', // Sky-500: Clean, Structural, Blue-ish Cyan
    'Smart R&D': '#f59e0b', // Amber-500: Innovation, Bright but not harsh
    'Digital Technology': '#ec4899', // Pink-500: Distinct, Modern
    'Etc': '#94a3b8' // Slate-400: Neutral, unobtrusive
};

// Helper to map project names to categories
const getCategory = (pName) => {
    if (!pName) return 'Etc';
    const name = pName.trim();
    // Case insensitive check for 'etc' mapping
    if (name.toLowerCase().includes('기타') || name.toLowerCase().includes('etc')) return 'Etc';

    // Exact matches based on user request
    if (name === 'AI') return 'AI';
    if (name === 'BIM') return 'BIM';
    if (name === 'Digital Technology') return 'Digital Technology';
    if (name === 'Smart R&D') return 'Smart R&D';

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
        // Debug Log
        console.log(`[Dashboard] Raw: ${rawTimesheets.length}, Range: ${timeRange}, CurrentDate: ${format(currentDate, 'yyyy-MM-dd')}`);

        if (!rawTimesheets.length) return { project: [], staff: [], stats: [], overtimeList: [], areaChartData: [], heatmapData: [], CATEGORIES: [], CATEGORY_COLORS: {}, WEEKDAYS: [] };

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
            billable: projectMap[name],
            overtime: 0
        })); // Preserves CATEGORIES order (AI -> BIM -> ...)

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
                person[`${cat}_hours`] = catHours;
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
                row[`${cat}_hours`] = catHours;
            });
            return row;
        }).sort((a, b) => b.hours - a.hours);

        // 4. Calculate Stats
        const totalHours = filteredData.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);

        // Simple Overtime Calculation: 
        // Group by (User, Week). If sum(User, Week) > 40, difference is overtime.
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

        // Metric: Strategic Work Proportion = ((AI + BIM + R&D) / Total) * 100
        const strategicHours = filteredData.reduce((sum, item) => {
            const pName = (item.project_name || '').toUpperCase();
            if (pName.includes('AI') || pName.includes('BIM') || pName.includes('R&D')) {
                return sum + parseFloat(item.total || 0);
            }
            return sum;
        }, 0);

        const strategicRatio = totalHours > 0 ? Math.round((strategicHours / totalHours) * 100) : 0;

        const stats = [
            { title: '총 근무 시간', value: `${totalHours.toLocaleString()} h`, change: '-', icon: Clock, color: 'text-primary' },
            { title: '전략 업무 비중', value: `${strategicRatio}%`, change: '-', icon: TrendingUp, color: 'text-secondary' },
            {
                title: '총 초과 근무',
                value: `${Math.round(totalOvertime).toLocaleString()} h`,
                change: '-',
                icon: Users,
                color: 'text-orange-500',
                isClickable: true,
                onClick: () => setShowOvertimeModal(true)
            },
        ];

        // Detailed Overtime Data for Modal
        const overtimeByPerson = Object.entries(userWeekMap).reduce((acc, [key, hours]) => {
            const [name, week] = key.split('-');
            if (hours > 40) {
                if (!acc[name]) acc[name] = 0;
                acc[name] += (hours - 40);
            }
            return acc;
        }, {});

        const overtimeList = Object.entries(overtimeByPerson)
            .map(([name, hours]) => ({ name, hours: Math.round(hours) }))
            .sort((a, b) => b.hours - a.hours);

        // --- New Visualizations Data Preparation ---

        // 1. Stacked Area Chart Data (Trends with Aggregation)
        const areaMap = {}; // Key: Date/Week/Month Key -> { display, key (sortable), AI:0, BIM:0... }

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
                        // Aggregate by Month
                        key = format(dateObj, 'yyyy-MM');
                        display = format(dateObj, 'M월', { locale: ko });
                    } else if (timeRange === 'monthly') {
                        // Aggregate by Week
                        // Find the start of the week for this date to align weekly buckets
                        const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
                        const weekNum = getWeekOfMonth(dateObj, { weekStartsOn: 1 });
                        key = format(weekStart, 'yyyy-MM-dd');
                        display = `${weekNum}주차`;
                    } else {
                        // Weekly view: Keep Daily
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

        // Fill gaps if necessary? For now, just sort what we have.
        // For AreaChart, gaps are okay. For Weekly Bar, we might miss days if no work.
        // We can optionally fill missing weekdays if needed, but for now strict data view.
        const areaChartData = Object.values(areaMap).sort((a, b) => a.key.localeCompare(b.key));

        // 2. Weekly Pattern Heatmap (Day of Week vs Category)
        const heatmapMap = {}; // { 'Mon-AI': 0, 'Tue-BIM': 0 ... }
        const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']; // Ignore Sat/Sun

        // Initialize map
        CATEGORIES.forEach(cat => {
            WEEKDAYS.forEach(day => {
                heatmapMap[`${day}-${cat}`] = 0;
            });
        });

        filteredData.forEach(item => {
            const category = getCategory(item.project_name);
            const days = ['mon', 'tue', 'wed', 'thu', 'fri']; // columns in csv
            const displayDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']; // Display labels

            days.forEach((dayKey, idx) => {
                const hours = parseFloat(item[dayKey] || 0);
                if (hours > 0) {
                    const displayDay = displayDays[idx];
                    const key = `${displayDay}-${category}`;
                    if (heatmapMap[key] !== undefined) {
                        heatmapMap[key] += hours;
                    }
                }
            });
        });

        const heatmapData = CATEGORIES.map(cat => {
            return {
                category: cat,
                data: WEEKDAYS.map(day => ({
                    day,
                    value: heatmapMap[`${day}-${cat}`]
                }))
            };
        });

        // Calculate max value for dynamic heatmap scaling
        let maxHeatmapValue = 0;
        Object.values(heatmapMap).forEach(val => {
            if (val > maxHeatmapValue) maxHeatmapValue = val;
        });

        return { project, staff, stats, overtimeList, areaChartData, heatmapData, maxHeatmapValue, CATEGORIES, CATEGORY_COLORS, WEEKDAYS, departmentRows };

    }, [rawTimesheets, timeRange, currentDate]);

    if (loading) return <div className="p-10 text-center text-gray-500">데이터 로딩 중...</div>;

    // Percent formatting for tooltips and axis
    const toPercent = (decimal, fixed = 0) => `${(decimal * 100).toFixed(fixed)}%`;

    const renderCustomTooltip = (props) => {
        const { active, payload, label } = props;
        if (active && payload && payload.length) {
            // Calculate total for the current stack (week)
            const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

            return (
                <div style={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff', padding: '10px' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>{label}</p>
                    {payload.map((item, index) => {
                        let displayValue;
                        if (viewMode === 'percent' && timeRange === 'monthly') {
                            // Calculate percentage relative to this week's total
                            const ratio = total > 0 ? item.value / total : 0;
                            displayValue = toPercent(ratio, 1);
                        } else {
                            displayValue = `${Math.round(item.value)}h`;
                        }

                        return (
                            <div key={index} style={{ color: item.color, fontSize: '12px' }}>
                                {`${item.name}: ${displayValue}`}
                            </div>
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 relative">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-dark">R&D 업무현황 대시보드</h2>
                <div className="flex items-center space-x-4">
                    <div className="flex bg-neutral/10 rounded-lg p-1">
                        {['weekly', 'monthly', 'yearly'].map((range) => (
                            <button
                                key={range}
                                onClick={() => {
                                    setTimeRange(range);
                                    // Reset view mode when changing ranges if needed? No, user might prefer persistence.
                                    // But 'percent' only makes sense for monthly/stacked views, so let's default to hours if irrelevant
                                    if (range !== 'monthly') setViewMode('hours');
                                }}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${timeRange === range
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-gray-500 hover:text-dark'
                                    }`}
                            >
                                {range === 'weekly' ? '주간' : range === 'monthly' ? '월간' : '연간'}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center space-x-2 bg-white px-3 py-1.5 border border-neutral/20 rounded-lg text-sm text-gray-500 shadow-sm">
                        <button
                            onClick={handlePrev}
                            className="p-1 hover:text-dark hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="min-w-[140px] text-center font-medium text-dark">{formatDateLabel()}</span>
                        <button
                            onClick={handleNext}
                            className="p-1 hover:text-dark hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {processedData.stats.length > 0 ? processedData.stats.map((stat, index) => (
                    <div
                        key={index}
                        onClick={stat.onClick}
                        className={`bg-surface p-6 rounded-xl shadow-sm border border-neutral/10 hover:shadow-md transition-shadow ${stat.isClickable ? 'cursor-pointer' : ''}`}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                                <h3 className="text-2xl font-bold text-dark mt-1">{stat.value}</h3>
                            </div>
                            <div className={`p-2 rounded-lg bg-gray-50 ${stat.color}`}>
                                <stat.icon size={20} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-xs">
                            <span className="text-gray-400">분석 기간: {timeRange === 'weekly' ? '이번 주' : timeRange === 'monthly' ? '이번 달' : '올해'}</span>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-3 text-center py-10 text-gray-500">데이터가 없습니다.</div>
                )}
            </div>

            {/* NEW: Central Advanced Visualization Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Stacked Area/Bar Chart (Trends) - Spans 2 Columns */}
                <div className="lg:col-span-2 bg-surface p-6 rounded-xl shadow-sm border border-neutral/10">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-dark mb-1">
                                {timeRange === 'weekly' ? '주간 업무 현황' : timeRange === 'monthly' ? '월간 업무 현황' : '연간 업무 흐름'}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {timeRange === 'monthly' ? '주차별 업무 비중과 변화를 확인하세요.' : '시간 흐름에 따른 업무 비중의 변화를 확인하세요.'}
                            </p>
                        </div>

                        {/* Monthly View Toggle */}
                        {timeRange === 'monthly' && (
                            <div className="flex bg-gray-100 rounded-lg p-1 text-xs font-medium">
                                <button
                                    onClick={() => setViewMode('hours')}
                                    className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-all ${viewMode === 'hours' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    <Clock size={12} />
                                    시간(hr)
                                </button>
                                <button
                                    onClick={() => setViewMode('percent')}
                                    className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-all ${viewMode === 'percent' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    <Percent size={12} />
                                    비중(%)
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            {timeRange === 'weekly' ? (
                                <BarChart
                                    data={processedData.areaChartData.filter(d => {
                                        const date = new Date(d.date || d.key);
                                        const day = getDay(date);
                                        return day >= 1 && day <= 5;
                                    })}
                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="displayDate" stroke="#9CA3AF" fontSize={12} tickMargin={10} />
                                    <YAxis stroke="#9CA3AF" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        cursor={{ fill: '#F3F4F6' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                    {processedData.CATEGORIES.map((cat, i) => (
                                        <Bar
                                            key={cat}
                                            dataKey={cat}
                                            stackId="a"
                                            fill={processedData.CATEGORY_COLORS[cat]}
                                            radius={i === processedData.CATEGORIES.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                        />
                                    ))}
                                </BarChart>
                            ) : timeRange === 'monthly' ? (
                                <BarChart
                                    data={processedData.areaChartData}
                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                    stackOffset={viewMode === 'percent' ? 'expand' : 'none'}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="displayDate" stroke="#9CA3AF" fontSize={12} tickMargin={10} />
                                    <YAxis
                                        stroke="#9CA3AF"
                                        fontSize={12}
                                        tickFormatter={viewMode === 'percent' ? toPercent : undefined}
                                    />
                                    <Tooltip content={renderCustomTooltip} cursor={{ fill: '#F3F4F6' }} />
                                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                    {processedData.CATEGORIES.map((cat, i) => (
                                        <Bar
                                            key={cat}
                                            dataKey={cat}
                                            stackId="a"
                                            fill={processedData.CATEGORY_COLORS[cat]}
                                        // Radius only on top bar if not expanded? Actually expanded bars utilize full height, radius might look odd if intermediate. 
                                        // Let's keep it simple.
                                        />
                                    ))}
                                </BarChart>
                            ) : (
                                <AreaChart data={processedData.areaChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        {processedData.CATEGORIES.map((cat, i) => (
                                            <linearGradient key={cat} id={`color${i}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={processedData.CATEGORY_COLORS[cat]} stopOpacity={0.8} />
                                                <stop offset="95%" stopColor={processedData.CATEGORY_COLORS[cat]} stopOpacity={0} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <XAxis dataKey="displayDate" stroke="#9CA3AF" fontSize={12} tickMargin={10} />
                                    <YAxis stroke="#9CA3AF" fontSize={12} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                    {processedData.CATEGORIES.map((cat, i) => (
                                        <Area
                                            key={cat}
                                            type="monotone"
                                            dataKey={cat}
                                            stackId="1"
                                            stroke={processedData.CATEGORY_COLORS[cat]}
                                            fillOpacity={0.4}
                                            strokeOpacity={1}
                                            fill={`url(#color${i})`}
                                        />
                                    ))}
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Project Proportion Chart - Spans 1 Column (Moved from bottom) */}
                <div className="bg-surface p-6 rounded-xl shadow-sm border border-neutral/10 flex flex-col">
                    <h3 className="text-lg font-bold text-dark mb-6">업무별 시간 비중</h3>
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={processedData.project} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                                <YAxis dataKey="name" type="category" hide />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#F3F4F6' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                                <Bar dataKey="billable" name="업무 시간" stackId="a" fill="#009540" radius={[0, 4, 4, 0]} barSize={20}>
                                    <LabelList dataKey="name" position="insideRight" style={{ fill: '#fff', fontSize: '11px', fontWeight: 'bold' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Team Summary Table (Main View) */}
            <div className="bg-surface rounded-xl shadow-sm border border-neutral/10 overflow-hidden">
                <div className="p-6 border-b border-neutral/10 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-dark">팀별 업무 현황 (항목별 비중 %)</h3>
                    <button
                        onClick={() => { setShowStaffDetail(true); setFilterDept('전체'); }}
                        className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                        상세 보기
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-800 text-white font-medium">
                            <tr>
                                <th className="px-6 py-4 whitespace-nowrap text-center text-gray-300 font-medium border-r border-slate-700/50">구분</th>
                                <th className="px-6 py-4 whitespace-nowrap text-center text-gray-300 font-medium border-r border-slate-700/50 w-[12%]">총 시간</th>
                                {processedData.CATEGORIES.map(cat => (
                                    <th key={cat} className="px-4 py-4 text-center text-xs lg:text-sm whitespace-nowrap border-r border-slate-700/50 last:border-r-0 w-[12%] font-bold text-white" style={{ borderBottom: `3px solid ${processedData.CATEGORY_COLORS[cat]}` }}>
                                        {cat}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {/* Department Rows */}
                            {processedData.departmentRows && processedData.departmentRows.map(dept => (
                                <tr key={dept.name} className="bg-white transition-colors hover:bg-slate-50">
                                    <td className="px-6 py-4 font-bold text-gray-800 whitespace-nowrap text-center border-r border-gray-100 text-sm">{dept.name}</td>
                                    <td className="px-6 py-4 font-bold text-gray-800 whitespace-nowrap text-center border-r border-gray-100 text-sm">{dept.hours.toLocaleString()}h</td>
                                    {processedData.CATEGORIES.map(cat => (
                                        <td key={cat} className="px-4 py-4 text-center border-r border-gray-100 last:border-r-0">
                                            <span
                                                className={`px-2 py-1 rounded-md text-xs font-bold block w-full transition-all ${dept[cat] > 0 ? '' : 'text-gray-300 bg-gray-50'}`}
                                                style={dept[cat] > 0 ? {
                                                    backgroundColor: `${processedData.CATEGORY_COLORS[cat]}15`,
                                                    color: processedData.CATEGORY_COLORS[cat]
                                                } : {}}
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

            {/* Overtime Details Modal */}
            {
                showOvertimeModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        {/* ... (Existing Overtime Modal Content - Kept generic for brevity, assumed unchanged logic but just ensuring structure) ... */}
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">초과 근무 상세 분석</h3>
                                    <p className="text-sm text-gray-500 mt-1">{formatDateLabel()}</p>
                                </div>
                                <button onClick={() => setShowOvertimeModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto">
                                {processedData.overtimeList.length > 0 ? (
                                    <div className="space-y-8">
                                        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                                            <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center"><Users size={16} className="mr-2 text-orange-500" />초과 근무 상위 5명</h4>
                                            <div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={processedData.overtimeList.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} /><Bar dataKey="hours" fill="#f97316" radius={[0, 4, 4, 0]} barSize={24} /></BarChart></ResponsiveContainer></div>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-700 mb-4">전체 명단</h4>
                                            <div className="border rounded-lg overflow-hidden">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-gray-50 text-gray-500"><tr><th className="px-4 py-3 font-medium">순위</th><th className="px-4 py-3 font-medium">이름</th><th className="px-4 py-3 font-medium text-right">초과 시간</th></tr></thead>
                                                    <tbody className="divide-y divide-gray-100">{processedData.overtimeList.map((item, idx) => (<tr key={idx} className="hover:bg-gray-50 transition-colors"><td className="px-4 py-3 text-gray-500 w-16">{idx + 1}</td><td className="px-4 py-3 font-medium text-gray-900">{item.name}</td><td className="px-4 py-3 text-right font-bold text-orange-600">+{item.hours}h</td></tr>))}</tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                ) : (<div className="text-center py-12"><div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Clock className="text-green-600" size={32} /></div><h3 className="text-lg font-medium text-gray-900">초과 근무자가 없습니다</h3><p className="text-gray-500 mt-2">선택한 기간 동안 모든 직원이 정규 시간 내에 업무를 완료했습니다.</p></div>)}
                            </div>
                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                                <button onClick={() => setShowOvertimeModal(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm">닫기</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Staff Details Modal (New) */}
            {
                showStaffDetail && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-gray-100 flex flex-col gap-4 bg-gray-50/50">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">팀원별 업무 상세 현황</h3>
                                        <p className="text-sm text-gray-500 mt-1">{formatDateLabel()}</p>
                                    </div>
                                    <button onClick={() => setShowStaffDetail(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>

                                {/* Department Tabs */}
                                <div className="flex flex-wrap gap-2">
                                    {['전체', ...processedData.departmentRows.map(d => d.name)].map((dept) => (
                                        <button
                                            key={dept}
                                            onClick={() => setFilterDept(dept)}
                                            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${filterDept === dept
                                                ? 'bg-primary text-white shadow-sm'
                                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            {dept}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-0 overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-800 text-white font-medium sticky top-0 z-10 shadow-md">
                                        <tr>
                                            <th className="px-6 py-4 whitespace-nowrap text-center text-gray-300 font-medium border-r border-slate-700/50">직원명</th>
                                            <th className="px-6 py-4 whitespace-nowrap text-center text-gray-300 font-medium border-r border-slate-700/50">소속</th>
                                            <th className="px-6 py-4 whitespace-nowrap text-center text-gray-300 font-medium border-r border-slate-700/50 w-[12%]">총 시간</th>
                                            {processedData.CATEGORIES.map(cat => (
                                                <th key={cat} className="px-4 py-4 text-center text-xs lg:text-sm whitespace-nowrap border-r border-slate-700/50 last:border-r-0 w-[12%] font-bold text-white" style={{ borderBottom: `3px solid ${processedData.CATEGORY_COLORS[cat]}` }}>
                                                    {cat}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {processedData.staff
                                            .filter(item => filterDept === '전체' || item.department === filterDept)
                                            .map((item, i) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-800 whitespace-nowrap text-center border-r border-gray-100">{item.name}</td>
                                                    <td className="px-6 py-4 text-gray-500 font-medium whitespace-nowrap text-center border-r border-gray-100">{item.department}</td>
                                                    <td className="px-6 py-4 font-bold text-gray-800 whitespace-nowrap text-center border-r border-gray-100">{item.hours}h</td>
                                                    {processedData.CATEGORIES.map(cat => (
                                                        <td key={cat} className="px-4 py-4 text-center border-r border-gray-100 last:border-r-0">
                                                            <span
                                                                className={`px-2 py-1 rounded-md text-xs font-bold block w-full transition-all ${item[cat] > 0 ? '' : 'text-gray-300 bg-gray-50'}`}
                                                                style={item[cat] > 0 ? {
                                                                    backgroundColor: `${processedData.CATEGORY_COLORS[cat]}15`,
                                                                    color: processedData.CATEGORY_COLORS[cat]
                                                                } : {}}
                                                            >
                                                                {item[cat] > 0 ? `${item[cat]}%` : '-'}
                                                            </span>
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                                <button onClick={() => setShowStaffDetail(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm">닫기</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Dashboard;
