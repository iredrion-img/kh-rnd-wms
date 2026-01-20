import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Save, Calendar as CalendarIcon, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Cell, XAxis, PieChart, Pie, Tooltip } from 'recharts';
import MiniCalendar from '../components/ui/MiniCalendar';
import DailyWorkCard from '../components/ui/DailyWorkCard';
import ContributionGraph from '../components/ui/ContributionGraph';

// Custom Tick Component for X-Axis
const CustomXAxisTick = ({ x, y, payload }) => {
    if (!payload || !payload.value) return null;

    // Value format: "1/20 (Mon)" or "1/20 (월)"
    const parts = payload.value.split(' (');
    const date = parts[0];
    const day = parts[1] ? parts[1].replace(')', '') : '';

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={12} textAnchor="middle" fill="#9ca3af" fontSize={10}>
                <tspan x="0" dy="0">{date}</tspan>
                <tspan x="0" dy="14">{day}</tspan>
            </text>
        </g>
    );
};

const Timesheet = ({ currentUser }) => {
    // ... existing code ...

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [dailyData, setDailyData] = useState({}); // { 'yyyy-MM-dd': { 'AI': 0, 'BIM': 0, ... } }

    // Categories config
    const categories = [
        { id: 'ai', label: 'AI', color: 'bg-blue-500', hex: '#3b82f6' },
        { id: 'bim', label: 'BIM', color: 'bg-green-500', hex: '#22c55e' },
        { id: 'dt', label: 'Digital Technology', color: 'bg-purple-500', hex: '#a855f7' },
        { id: 'smart', label: 'Smart R&D', color: 'bg-orange-500', hex: '#f97316' },
        { id: 'etc', label: '기타 (Etc)', color: 'bg-gray-500', hex: '#6b7280' },
    ];

    // Initialize daily data helper
    const getHours = (date, categoryLabel) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        return dailyData[dateKey]?.[categoryLabel] || 0;
    };

    // Handler for hour change
    const updateHours = (categoryLabel, change) => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');

        setDailyData(prev => {
            const currentDayData = prev[dateKey] || {};
            const currentHours = currentDayData[categoryLabel] || 0;
            const newHours = Math.max(0, Math.min(24, currentHours + change)); // 0-24 range logic preserved

            // Optimization: If decreasing (change < 0), always allow
            if (change < 0) {
                return {
                    ...prev,
                    [dateKey]: {
                        ...currentDayData,
                        [categoryLabel]: newHours
                    }
                };
            }

            // Daily Limit Check: Calculate Daily Total
            // Sum all other categories for this day
            let projectedDailyTotal = newHours;
            categories.forEach(cat => {
                if (cat.label !== categoryLabel) {
                    projectedDailyTotal += (currentDayData[cat.label] || 0);
                }
            });

            if (projectedDailyTotal > 24) {
                alert('하루 24시간을 초과할 수 없습니다.');
                return prev;
            }

            // Legal Limit Check: Calculate Weekly Total
            const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
            let currentWeeklyTotal = 0;

            // Sum hours for all 7 days
            for (let i = 0; i < 7; i++) {
                const dayDate = addDays(weekStart, i);
                const dKey = format(dayDate, 'yyyy-MM-dd');
                const dayData = prev[dKey] || {};

                // Sum all categories for this day
                categories.forEach(cat => {
                    // Be careful not to double count the value we are changing
                    if (dKey === dateKey && cat.label === categoryLabel) {
                        // Skip current value, we will add newHours later
                    } else {
                        currentWeeklyTotal += (dayData[cat.label] || 0);
                    }
                });
            }

            // Check if adding newHours exceeds 52
            if (currentWeeklyTotal + newHours > 52) {
                alert('법정 근로시간(주 52시간)을 초과할 수 없습니다.');
                return prev; // Return previous state unchanged
            }

            return {
                ...prev,
                [dateKey]: {
                    ...currentDayData,
                    [categoryLabel]: newHours
                }
            };
        });
    };

    // Calculate daily total
    const getDailyTotalForDate = (date) => {
        return categories.reduce((acc, cat) => acc + getHours(date, cat.label), 0);
    };

    const dailyTotal = getDailyTotalForDate(selectedDate);

    // Prepare chart data (Weekly)
    const getWeeklyChartData = () => {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const data = [];
        for (let i = 0; i < 7; i++) {
            const dayDate = addDays(weekStart, i);
            const dayData = {
                name: format(dayDate, 'EEE', { locale: ko }),
                date: format(dayDate, 'M/d'),
                label: `${format(dayDate, 'M/d')} (${format(dayDate, 'EEE', { locale: ko })})`,
                total: 0
            };

            // Populate category hours
            categories.forEach(cat => {
                const h = getHours(dayDate, cat.label);
                dayData[cat.id] = h;
                dayData.total += h;
            });

            data.push(dayData);
        }
        return data;
    };

    const weeklyChartData = getWeeklyChartData();

    // Map dailyData to array for Heatmap
    // Not actually needed as prop, we pass dailyData object directly

    // Load Data on Mount or Date Change
    useEffect(() => {
        if (!currentUser) return;

        const fetchData = async () => {
            try {
                const response = await fetch('/api/timesheets');
                if (response.ok) {
                    const allRecords = await response.json();

                    // Filter for current user (Load ALL history for Heatmap)
                    const userRecords = allRecords.filter(r => r.employee === currentUser.name);

                    // Transform to dailyData map
                    const newDailyData = {};

                    // Days mapping
                    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

                    userRecords.forEach(record => {
                        const recWeekStart = new Date(record.week_start);

                        days.forEach((day, index) => {
                            const dateVal = addDays(recWeekStart, index);
                            const dateKey = format(dateVal, 'yyyy-MM-dd');
                            const hours = parseFloat(record[day]) || 0;

                            if (hours > 0) {
                                if (!newDailyData[dateKey]) newDailyData[dateKey] = {};
                                newDailyData[dateKey][record.project_name] = hours;
                            }
                        });
                    });

                    // Merge with existing dailyData or set fresh? 
                    // Set fresh to ensure sync with DB, but careful not to wipe user input if they just typed? 
                    // Actually, if we load on date change, we should replace.

                    // However, we only have one state `dailyData` for ALL dates?
                    // The state structure is Global. 
                    // If we fetch ONLY the current week, we might wipe data for other weeks if we blindly replace.
                    // So we should merge.

                    setDailyData(prev => {
                        // Deep merge logic or simple spread?
                        // Simple spread of dates is safest.
                        return { ...prev, ...newDailyData };
                    });

                }
            } catch (error) {
                console.error("Failed to fetch timesheet:", error);
            }
        };

        fetchData();
    }, [currentUser, selectedDate]); // Dependency on selectedDate implies refetch on week change? 
    // Wait, selectedDate changes daily. fetching every day change is spammy but safe.
    // Optimization: Only fetch when week changes? 
    // For now, simple is better. Fetching is cheap.

    // Save Logic (Converts daily map to weekly rows for backend compatibility)
    const handleSave = async () => {
        if (!currentUser) {
            alert('로그인이 필요합니다. 사이드바에서 로그인해주세요.');
            return;
        }

        try {
            // Determine current week
            const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
            const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

            // Construct rows for backend
            const rows = categories.map((cat, index) => {
                const hours = {};
                days.forEach((day, i) => {
                    const date = addDays(weekStart, i);
                    const dateKey = format(date, 'yyyy-MM-dd');
                    hours[day] = dailyData[dateKey]?.[cat.label] || 0;
                });

                return {
                    id: index + 1,
                    project: cat.label,
                    code: '',
                    hours: hours
                };
            });

            const response = await fetch('/api/timesheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rows,
                    weekStart: format(weekStart, 'yyyy-MM-dd'),
                    employee: currentUser.name,
                    department: currentUser.department
                }),
            });

            if (response.ok) {
                alert('저장되었습니다.');
            } else {
                alert('저장에 실패했습니다.');
            }
        } catch (error) {
            console.error('Error saving:', error);
            alert('서버 오류가 발생했습니다.');
        }
    };

    // Calculate weekly total
    const weeklyTotal = weeklyChartData.reduce((acc, day) => acc + day.total, 0);

    return (
        <div className="flex flex-col lg:flex-row-reverse lg:h-[calc(100vh-theme(spacing.24))] gap-6">
            {/* Left Sidebar: Calendar & Stats - Bottom on Mobile, Left on Desktop */}
            <div className="w-full lg:w-80 flex flex-col space-y-6 flex-none">
                <MiniCalendar
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    dailyData={dailyData}
                />

                {/* Weekly Stat Card (Changed from Daily) */}
                <div className="bg-white p-6 rounded-xl shadow-lg shadow-black/5 flex flex-col justify-between flex-1 relative overflow-hidden text-dark border border-neutral/10">
                    <div className="z-10">
                        <h4 className="text-gray-400 text-sm font-medium mb-1">이번 주 업무 분포</h4>
                        <h2 className="text-2xl font-bold">{format(selectedDate, 'M월 d일 (EEE)', { locale: ko })}</h2>
                    </div>

                    <div className="z-10 mt-8 text-center">
                        {/* Circular Progress Indicator for Weekly Total */}
                        <div className="relative w-40 h-40 mx-auto mb-6 flex items-center justify-center">
                            {/* SVG Circle */}
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                {/* Track */}
                                <circle
                                    className="stroke-gray-100"
                                    strokeWidth="8"
                                    fill="transparent"
                                    r="44"
                                    cx="50"
                                    cy="50"
                                />
                                {/* Progress */}
                                <circle
                                    className={`transition-all duration-1000 ease-out ${weeklyTotal >= 41 ? 'stroke-orange-500' : 'stroke-primary'
                                        }`}
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    fill="transparent"
                                    r="44"
                                    cx="50"
                                    cy="50"
                                    strokeDasharray={`${2 * Math.PI * 44}`}
                                    strokeDashoffset={`${2 * Math.PI * 44 * (1 - Math.min(weeklyTotal / 52, 1))}`}
                                />
                            </svg>
                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-4xl font-bold ${weeklyTotal >= 41 ? 'text-orange-500' : 'text-primary'}`}>
                                    {weeklyTotal}
                                </span>
                                <span className="text-xs text-gray-400 uppercase tracking-widest mt-1">Weekly Total</span>
                            </div>
                        </div>

                        {/* Status Message */}
                        <div>
                            {weeklyTotal >= 52 ? (
                                <p className="text-red-500 font-bold text-sm">주간 초과 근무 발생!</p>
                            ) : weeklyTotal >= 41 ? (
                                <p className="text-orange-500 font-bold text-sm">초과 근무 주의</p>
                            ) : (
                                <p className="text-gray-400 text-sm">정상 근무 중입니다</p>
                            )}
                        </div>
                    </div>

                    {/* Weekly Bar Chart */}
                    <div className="h-24 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyChartData} margin={{ bottom: 10 }}>
                                <XAxis
                                    dataKey="label"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={CustomXAxisTick}
                                    interval={0}
                                    height={40}
                                />
                                <Bar dataKey="total" radius={[2, 2, 0, 0]}>
                                    {weeklyChartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.date === format(selectedDate, 'M/d') ? '#3b82f6' : '#e5e7eb'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Bg Decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl translate-x-10 -translate-y-10"></div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col gap-6">
                {/* Header */}
                <div className="flex-none flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-dark flex items-center">
                            <CalendarIcon className="mr-2 text-primary" size={20} />
                            업무 기록 입력
                        </h2>
                        <p className="text-gray-500 text-xs mt-1">해당 날짜의 업무 시간을 항목별로 입력해주세요.</p>
                    </div>
                </div>

                {/* Input Grid */}
                <div
                    className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 min-h-0 overflow-y-auto lg:overflow-y-visible pr-1 pb-4"
                >
                    {categories.map((cat) => (
                        <DailyWorkCard
                            key={cat.id}
                            category={cat.label}
                            hours={getHours(selectedDate, cat.label)}
                            onIncrease={() => updateHours(cat.label, 1)}
                            onDecrease={() => updateHours(cat.label, -1)}
                            colorClass={cat.color}
                        />
                    ))}

                    {/* Summary / Tip Card - Donut Chart */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral/10 flex flex-col items-center justify-center relative h-full min-h-[160px]">
                        {/* Header */}
                        <div className="absolute top-4 left-4 flex items-center space-x-2">
                            <PieChartIcon size={18} className="text-gray-400" />
                            <h3 className="text-gray-500 font-medium text-sm">오늘의 업무 분포</h3>
                        </div>

                        {/* Donut Chart */}
                        <div className="w-full h-full mt-4 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categories.map(cat => ({
                                            id: cat.id,
                                            name: cat.label,
                                            value: getHours(selectedDate, cat.label),
                                            fill: cat.hex
                                        })).filter(d => d.value > 0)}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {categories.map(cat => ({
                                            value: getHours(selectedDate, cat.label),
                                            hex: cat.hex
                                        })).filter(d => d.value > 0).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.hex} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value, name) => [`${value}h`, name]}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className={`text-3xl font-bold transition-colors duration-300 ${dailyTotal < 8 ? 'text-gray-400' :
                                    dailyTotal === 8 ? 'text-green-500' :
                                        'text-orange-500'
                                    }`}>
                                    {dailyTotal}
                                </span>
                                <span className="text-xs text-gray-400 font-medium">Daily Total</span>
                            </div>
                        </div>
                    </div>


                </div>

                {/* Save Button - Sticky Footer (Mobile Only) / Static (Desktop) */}
                <div className="z-10 flex-none pt-2 sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:static lg:bg-transparent lg:backdrop-filter-none lg:pt-6">
                    <button
                        onClick={handleSave}
                        className="w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center space-x-2 bg-neutral text-white hover:bg-neutral/80 shadow-neutral/30 active:scale-[0.98]"
                    >
                        <Save size={20} />
                        <span>저장하기</span>
                    </button>
                </div>

                {/* Contribution Graph Section */}
                <div className="flex-none h-auto">
                    <ContributionGraph dailyData={dailyData} onDateClick={setSelectedDate} />
                </div>
            </div>
            {/* Bg Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        </div >
    );
};

export default Timesheet;
