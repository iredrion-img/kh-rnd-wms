import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Save, Calendar as CalendarIcon, PieChart as PieChartIcon, Palmtree, Sun, Sunrise, Sunset, Building2 } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Cell, XAxis, PieChart, Pie, Tooltip } from 'recharts';
import MiniCalendar from '../components/ui/MiniCalendar';
import DailyWorkCard from '../components/ui/DailyWorkCard';
import ContributionGraph from '../components/ui/ContributionGraph';
import TaskFormModal from '../components/weeklyMeeting/TaskFormModal';

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
    const [dailyData, setDailyData] = useState({}); // { 'yyyy-MM-dd': { 'CategoryLabel': hours } }
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [myWeeklyTasks, setMyWeeklyTasks] = useState([]);

    const openTaskModal = (task = null) => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
    };

    // Categories config
    const leaveCategories = [
        { id: 'vacation', label: '연차', icon: Palmtree, color: 'bg-emerald-500', hex: '#10b981ad' },
        { id: 'half', label: '반차', icon: Sun, color: 'bg-amber-500', hex: '#f59e0bad' },
    ];

    const workCategories = [
        { id: 'ai', label: 'AI', icon: Building2, color: 'bg-cat-ai', hex: '#b06ed3ad' },
        { id: 'bim', label: 'BIM', icon: Building2, color: 'bg-cat-bim', hex: '#2673cac9' },
        { id: 'smart', label: 'Smart R&D', icon: Building2, color: 'bg-cat-smart', hex: '#1896319a' },
        { id: 'dt', label: 'Digital Technology', icon: Building2, color: 'bg-cat-dt', hex: '#e6773cb9' },
        { id: 'etc', label: '기타 (Etc)', icon: Building2, color: 'bg-cat-etc', hex: '#9E9E9E' },
    ];

    const categories = [...leaveCategories, ...workCategories];

    // Categories config


    // Initialize daily data helper
    const getHours = (date, categoryLabel) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        return dailyData[dateKey]?.[categoryLabel] || 0;
    };

    const handleLeaveToggle = (type) => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');

        if (type === 'full') {
            if (!window.confirm('연차(8h)를 설정하시겠습니까? 다른 모든 업무 입력이 초기화됩니다.')) {
                return;
            }
        } else if (type === 'half') {
            const currentDayData = dailyData[dateKey] || {};
            const workLabels = Object.keys(currentDayData).filter(k => !['연차', '반차'].includes(k));
            const currentWorkTotal = workLabels.reduce((sum, k) => sum + (currentDayData[k] || 0), 0);

            if (currentWorkTotal > 4) {
                if (!window.confirm('반차 설정 시 업무시간은 최대 4시간입니다. 기존 업무시간을 초기화하시겠습니까?')) {
                    return;
                }
            }
        }

        setDailyData(prev => {
            const currentDayData = { ...(prev[dateKey] || {}) };

            // Remove existing leaves
            delete currentDayData['연차'];
            delete currentDayData['반차'];

            if (type === 'full') {
                return { ...prev, [dateKey]: { '연차': 8 } };
            } else if (type === 'half') {
                const workLabels = Object.keys(currentDayData).filter(k => !['연차', '반차'].includes(k));
                const currentWorkTotal = workLabels.reduce((sum, k) => sum + (currentDayData[k] || 0), 0);

                if (currentWorkTotal > 4) {
                    workLabels.forEach(k => delete currentDayData[k]);
                }
                currentDayData['반차'] = 4;
                return { ...prev, [dateKey]: currentDayData };
            }

            // type === 'none'
            return { ...prev, [dateKey]: currentDayData };
        });
    };

    // Handler for hour change (Work categories only)
    const updateHours = (categoryLabel, change) => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');

        setDailyData(prev => {
            const currentDayData = { ...(prev[dateKey] || {}) };
            const currentHours = currentDayData[categoryLabel] || 0;

            // Check if Vacation is active
            if (currentDayData['연차'] > 0) {
                alert('연차 중에는 업무를 기록할 수 없습니다. 휴가 설정을 번경해주세요.');
                return prev;
            }

            // Check Half Day limit
            const isHalfDayActive = (currentDayData['반차'] > 0);
            const dailyMax = isHalfDayActive ? 4 : 24;

            // Calculate current TOTAL work (excluding leaves)
            const workLabels = Object.keys(currentDayData).filter(k => !['연차', '반차'].includes(k));
            const currentTotalWork = workLabels.reduce((sum, k) => sum + (currentDayData[k] || 0), 0);

            // We are changing THIS category. 
            // projectedWork = (Total - currentCat) + newCat
            const projectedWork = (currentTotalWork - currentHours) + (currentHours + change);

            if (projectedWork > dailyMax) {
                alert(isHalfDayActive ? '반차 시 업무시간은 최대 4시간입니다.' : '하루 24시간을 초과할 수 없습니다.');
                return prev;
            }

            if (projectedWork < 0) return prev; // Should not happen with min 0 check but safe

            const newHours = Math.max(0, currentHours + change);

            // Update
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
        const dateKey = format(date, 'yyyy-MM-dd');
        const dayData = dailyData[dateKey] || {};
        return Object.values(dayData).reduce((a, b) => a + b, 0);
    };

    const dailyTotal = getDailyTotalForDate(selectedDate);
    // Work only total for reference if needed, but Total is mostly what matters for display
    // const workOnlyTotal = ...

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
                // Fetch timesheets and weekly tasks concurrently
                const weekStr = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                const [tsResponse, wtResponse] = await Promise.all([
                    fetch('/api/timesheets'),
                    fetch(`/api/weekly-tasks?week=${weekStr}`)
                ]);

                if (wtResponse.ok) {
                    const allWeekly = await wtResponse.json();
                    const mine = allWeekly.filter(t => t.assignees && t.assignees.includes(currentUser.name));
                    setMyWeeklyTasks(mine);
                }

                if (tsResponse.ok) {
                    const allRecords = await tsResponse.json();

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
                                let projectName = record.project_name;
                                if (projectName === '오전반차' || projectName === '오후반차') {
                                    projectName = '반차';
                                }
                                newDailyData[dateKey][projectName] = (newDailyData[dateKey][projectName] || 0) + hours;
                            }
                        });
                    });

                    // Merge with existing dailyData
                    setDailyData(prev => {
                        return { ...prev, ...newDailyData };
                    });

                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
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

                // Only include if there is ANY data for this category in the week?
                // Or custom filtering? server filters empty rows usually?
                // Actually server logic: "newRecords = rows.map..." -> it takes all rows.
                // But it filters out 0 totals?
                // "total: Object.values(row.hours).reduce..."
                // It doesn't filter empty rows explicitly in the map, but it might be okay.
                // Let's send all categories including Leave types.

                return {
                    id: index + 1,
                    project: cat.label,
                    code: ['연차', '반차'].includes(cat.label) ? 'LEAVE' : '',
                    hours: hours
                };
            });

            // Filter out rows with 0 total hours across the week to save space?
            // The backend replaces records for the week. 
            // If we omit a row, does it mean it's deleted?
            // "filteredRecords = existingRecords.filter(record => !(record.employee === employee && record.week_start === weekStart))"
            // Yes, it deletes OLD records for this week and inserts NEW ones.
            // So if we don't send a row, it's effectively deleted.
            // So we should filter out rows with 0 hours to keep DB clean.
            const allRows = rows.filter(row => Object.values(row.hours).some(h => h > 0));

            const response = await fetch('/api/timesheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rows: allRows,
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

    const handleSaveWeeklyTask = async (taskData) => {
        try {
            const payload = {
                ...taskData,
                team: taskData.team || currentUser.department || '공통업무&행정',
                week_start: taskData.week_start || format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
            };
            if (!payload.assignees) {
                payload.assignees = currentUser.name;
            }

            const res = await fetch('/api/weekly-tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsTaskModalOpen(false);
                setEditingTask(null);
                alert('주간 업무가 저장되었습니다.');
                
                // Refresh my tasks
                const weekStr = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                const wtRes = await fetch(`/api/weekly-tasks?week=${weekStr}`);
                if (wtRes.ok) {
                    const allWeekly = await wtRes.json();
                    setMyWeeklyTasks(allWeekly.filter(t => t.assignees && t.assignees.includes(currentUser.name)));
                }
            } else {
                alert('저장에 실패했습니다.');
            }
        } catch (e) {
            console.error(e);
            alert('오류가 발생했습니다.');
        }
    };

    // Calculate weekly total
    const weeklyTotal = weeklyChartData.reduce((acc, day) => acc + day.total, 0);

    return (
        <div className="flex flex-col lg:flex-row-reverse lg:h-full gap-4 p-4">
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
            <div className="flex-1 flex flex-col gap-3 min-h-0">
                {/* Header */}
                <div className="flex-none flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center">
                            <CalendarIcon className="mr-2 text-primary" size={20} />
                            업무 기록 입력
                        </h2>
                        <p className="text-gray-400 text-sm mt-0.5">해당 날짜의 업무 시간을 항목별로 입력해주세요.</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => openTaskModal(null)}
                            className="px-4 py-2 bg-gradient-to-r from-primary to-primary-light text-white rounded-lg hover:shadow-lg transition-all text-sm font-bold flex items-center gap-1"
                        >
                            + 주간 업무 추가
                        </button>

                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-400">휴가 설정</span>
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            {['없음', '반차', '연차'].map(t => {
                                const isActive =
                                    t === '연차' ? getHours(selectedDate, '연차') > 0 :
                                        t === '반차' ? getHours(selectedDate, '반차') > 0 :
                                            (getHours(selectedDate, '연차') === 0 && getHours(selectedDate, '반차') === 0);

                                return (
                                    <button
                                        key={t}
                                        onClick={() => handleLeaveToggle(t === '연차' ? 'full' : t === '반차' ? 'half' : 'none')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${isActive ? 'bg-white text-kh-green shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        {t}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    </div>
                </div>

                {/* Category Cards Grid */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 min-h-0 overflow-y-auto lg:overflow-y-visible pr-1 pb-2">
                    {workCategories.map((cat) => (
                        <DailyWorkCard
                            key={cat.id}
                            category={cat.label}
                            icon={cat.icon}
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
                        <div className="w-full flex-1 mt-4 relative min-h-[100px]">
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

                {/* My Weekly Tasks Section */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral/10 flex flex-col min-h-[160px]">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                           <CalendarIcon size={16} className="text-primary"/> 이번 주 나의 업무 현황
                        </h3>
                    </div>
                    {myWeeklyTasks.length > 0 ? (
                        <div className="flex flex-col gap-2 overflow-y-auto max-h-48 pr-1">
                            {myWeeklyTasks.map(task => (
                               <div key={task.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                  <div className="flex flex-col">
                                     <span className="text-xs font-bold text-primary mb-0.5">{task.task_code || '일반 업무'}</span>
                                     <span className="text-sm text-gray-800 font-medium">{task.content}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                     <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${task.status === '완료' ? 'bg-green-100 text-green-700' : task.status === '보류' ? 'bg-orange-100 text-orange-700' : 'bg-primary/10 text-primary'}`}>
                                         {task.status || '진행 중'}
                                     </span>
                                     <button onClick={() => openTaskModal(task)} className="text-xs font-medium text-gray-400 hover:text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm transition-all hover:shadow">
                                         수정
                                     </button>
                                  </div>
                               </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-sm font-medium text-gray-400 p-4 border border-dashed border-gray-200 rounded-xl bg-gray-50">
                            이번 주에 등록된 주간 업무가 없습니다. 상단의 '+ 업무 추가'를 클릭하세요.
                        </div>
                    )}
                </div>

                {/* Save Button */}
                <div className="z-10 flex-none sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:static lg:bg-transparent lg:backdrop-filter-none">
                    <button
                        onClick={handleSave}
                        className="w-full py-3 rounded-xl font-bold text-base transition-all shadow-lg flex items-center justify-center space-x-2 bg-neutral text-white hover:bg-neutral/80 shadow-neutral/30 active:scale-[0.98]"
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

            {isTaskModalOpen && (
                <TaskFormModal
                    team={editingTask ? editingTask.team : (currentUser.department || '공통업무&행정')}
                    task={editingTask}
                    onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
                    onSave={handleSaveWeeklyTask}
                    currentWeek={format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')}
                />
            )}
        </div >
    );
};

export default Timesheet;
