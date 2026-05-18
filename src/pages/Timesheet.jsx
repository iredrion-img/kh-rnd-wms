import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Save, Calendar as CalendarIcon, PieChart as PieChartIcon, Palmtree, Sun, Sunrise, Sunset, Building2, Trash2, Pencil } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Cell, XAxis, PieChart, Pie, Tooltip } from 'recharts';
import MiniCalendar from '../components/ui/MiniCalendar';
import DailyWorkCard from '../components/ui/DailyWorkCard';
import ContributionGraph from '../components/ui/ContributionGraph';
import TaskFormModal from '../components/weeklyMeeting/TaskFormModal';
import WeeklyTaskHubModal from '../components/weeklyMeeting/WeeklyTaskHubModal';
import WeeklyScheduleHubModal from '../components/weeklyMeeting/WeeklyScheduleHubModal';
import StatusBoard from '../components/dashboard/StatusBoard';

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
    const [isHubModalOpen, setIsHubModalOpen] = useState(false);
    const [isScheduleHubModalOpen, setIsScheduleHubModalOpen] = useState(false);
    const [isStatusBoardOpen, setIsStatusBoardOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [myWeeklyTasks, setMyWeeklyTasks] = useState([]);
    const [noticeTasks, setNoticeTasks] = useState([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const openTaskModal = (task = null) => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
    };

    const openHubModal = () => {
        setIsHubModalOpen(true);
    };

    // Categories config
    const leaveCategories = [
        { id: 'vacation', label: '연차', icon: Palmtree, color: 'bg-emerald-500', hex: '#10b981ad' },
        { id: 'half_am', label: '오전반차', icon: Sun, color: 'bg-amber-400', hex: '#fbbf24ad' },
        { id: 'half_pm', label: '오후반차', icon: Sunset, color: 'bg-amber-400', hex: '#fbbf24ad' },
        { id: 'half', label: '반차', icon: Sun, color: 'bg-amber-500', hex: '#f59e0bad', hideFromUI: true }
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
        const currentDayData = dailyData[dateKey] || {};
        const workLabels = Object.keys(currentDayData).filter(k => !['연차', '반차', '오전반차', '오후반차'].includes(k));
        const currentWorkTotal = workLabels.reduce((sum, k) => sum + (currentDayData[k] || 0), 0);

        if (type === 'full') {
            if (currentWorkTotal > 0) {
                if (!window.confirm('연차(8h)를 설정하시겠습니까? 다른 모든 업무 입력이 초기화됩니다.')) {
                    return;
                }
            }
        } else if (type === 'half') {
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
            delete currentDayData['오전반차'];
            delete currentDayData['오후반차'];

            if (type === 'full') {
                return { ...prev, [dateKey]: { '연차': 8 } };
            } else if (type === 'half_am' || type === 'half_pm') {
                const workLabels = Object.keys(currentDayData).filter(k => !['연차', '반차', '오전반차', '오후반차'].includes(k));
                const currentWorkTotal = workLabels.reduce((sum, k) => sum + (currentDayData[k] || 0), 0);

                if (currentWorkTotal > 4) {
                    workLabels.forEach(k => delete currentDayData[k]);
                }
                currentDayData[type === 'half_am' ? '오전반차' : '오후반차'] = 4;
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
            const isHalfDayActive = (currentDayData['반차'] > 0 || currentDayData['오전반차'] > 0 || currentDayData['오후반차'] > 0);
            const dailyMax = isHalfDayActive ? 4 : 24;

            // Calculate current TOTAL work (excluding leaves)
            const workLabels = Object.keys(currentDayData).filter(k => !['연차', '반차', '오전반차', '오후반차'].includes(k));
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
        // Sum only defined categories to ensure total matches visible cards
        return categories.reduce((sum, cat) => sum + (dayData[cat.label] || 0), 0);
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
                // Fetch timesheets, weekly tasks, and weekly schedules concurrently
                const weekStr = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                const [tsResponse, wtResponse, wsResponse] = await Promise.all([
                    fetch('/api/timesheets'),
                    fetch(`/api/weekly-tasks?week=${weekStr}`),
                    fetch(`/api/weekly-schedule`) // Fetch all to cover cross-week leaves
                ]);

                if (wtResponse.ok) {
                    const allWeekly = await wtResponse.json();
                    const mine = allWeekly.filter(t => t.assignees && t.assignees.includes(currentUser.name));
                    const notices = allWeekly.filter(t => t.team === '공지사항');
                    setMyWeeklyTasks(mine);
                    setNoticeTasks(notices);
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
                                
                                // Map legacy long names to current shorthand labels for UI consistency
                                const projectMap = {
                                    'AI 기반 WMS 고도화': 'AI',
                                    'BIM 자동화 프로세스 구축': 'BIM',
                                    '스마트 건설 기술 지원': 'Smart R&D',
                                    '디지털 트윈 모니터링 테스트': 'Digital Technology',
                                    '공통업무 및 행정': '기타 (Etc)',
                                    '공통업무 & 행정': '기타 (Etc)'
                                };
                                
                                if (projectMap[projectName]) {
                                    projectName = projectMap[projectName];
                                }
                                
                                newDailyData[dateKey][projectName] = (newDailyData[dateKey][projectName] || 0) + hours;
                            }
                        });
                    });

                    // --- Weekly Schedule Leave Integration ---
                    if (wsResponse.ok) {

                        const allSchedules = await wsResponse.json();
                        const myLeaves = allSchedules.filter(s => 
                            s.schedule_type === '휴가' && 
                            s.assignees && s.assignees.includes(currentUser.name)
                        );

                        myLeaves.forEach(leave => {
                            const isMorning = leave.content && leave.content.includes('오전');
                            const isAfternoon = leave.content && leave.content.includes('오후');
                            const isHalf = leave.content && leave.content.includes('반차');

                            let leaveType = '연차';
                            let leaveHours = 8;

                            if (isMorning) {
                                leaveType = '오전반차';
                                leaveHours = 4;
                            } else if (isAfternoon) {
                                leaveType = '오후반차';
                                leaveHours = 4;
                            } else if (isHalf) {
                                leaveType = '반차';
                                leaveHours = 4;
                            }

                            const start = new Date(leave.start_date);
                            const end = leave.end_date ? new Date(leave.end_date) : new Date(start);
                            
                            // Iterate through dates from start to end
                            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                                const dStr = format(d, 'yyyy-MM-dd');
                                if (!newDailyData[dStr]) newDailyData[dStr] = {};
                                
                                // Reset existing leaves to avoid duplicates/conflicts
                                delete newDailyData[dStr]['연차'];
                                delete newDailyData[dStr]['반차'];
                                delete newDailyData[dStr]['오전반차'];
                                delete newDailyData[dStr]['오후반차'];
                                
                                if (leaveHours === 4) {
                                    newDailyData[dStr][leaveType] = 4;
                                    // If half-day is active, cap other work hours to 4
                                    const workLabels = Object.keys(newDailyData[dStr]).filter(k => !['연차', '반차', '오전반차', '오후반차'].includes(k));
                                    const workTotal = workLabels.reduce((sum, k) => sum + (newDailyData[dStr][k] || 0), 0);
                                    if (workTotal > 4) {
                                        workLabels.forEach(k => delete newDailyData[dStr][k]);
                                    }
                                } else {
                                    newDailyData[dStr] = { '연차': 8 }; // Full day wipes all other works
                                }
                            }
                        });
                    }

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
    }, [currentUser, selectedDate, refreshTrigger]); 

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
                    code: ['연차', '반차', '오전반차', '오후반차'].includes(cat.label) ? 'LEAVE' : '',
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

            // ─── Two-Way Sync for Leaves to Weekly Schedule ───
            const leaveDataToSync = [];
            days.forEach((day, i) => {
                const date = addDays(weekStart, i);
                const dateKey = format(date, 'yyyy-MM-dd');
                const fullLeave = dailyData[dateKey]?.['연차'] || 0;
                const halfLeave = dailyData[dateKey]?.['반차'] || 0;
                const halfAmLeave = dailyData[dateKey]?.['오전반차'] || 0;
                const halfPmLeave = dailyData[dateKey]?.['오후반차'] || 0;
                
                if (fullLeave > 0) leaveDataToSync.push({ date: dateKey, type: '연차' });
                else if (halfLeave > 0) leaveDataToSync.push({ date: dateKey, type: '반차' });
                else if (halfAmLeave > 0) leaveDataToSync.push({ date: dateKey, type: '오전반차' });
                else if (halfPmLeave > 0) leaveDataToSync.push({ date: dateKey, type: '오후반차' });
            });

            const syncResponse = await fetch('/api/weekly-schedule/sync-timesheet-leaves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee: currentUser.name,
                    weekStart: format(weekStart, 'yyyy-MM-dd'),
                    leaves: leaveDataToSync
                })
            });

            if (response.ok && syncResponse.ok) {
                alert('저장되었습니다.');
                setRefreshTrigger(prev => prev + 1);
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
            const availableTeams = [
                '공통업무&행정', '연구과제', '스마트 기술 개발팀', '디지털 기술 연구팀', '인프라 BIM팀', 'AI 응용팀'
            ];
            
            const dept = currentUser.department || '';
            const defaultTeam = availableTeams.includes(dept) ? dept : '공통업무&행정';

            const payload = {
                ...taskData,
                team: taskData.team || defaultTeam,
                week_start: taskData.week_start || format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
            };
            if (!payload.assignees) {
                payload.assignees = currentUser.name;
            }

            const url = payload.id ? `/api/weekly-tasks/${payload.id}` : '/api/weekly-tasks';
            const method = payload.id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsTaskModalOpen(false);
                setEditingTask(null);
                alert('주간 업무가 저장되었습니다.');
                
                // Refresh my tasks & notices
                const weekStr = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                const wtRes = await fetch(`/api/weekly-tasks?week=${weekStr}`);
                if (wtRes.ok) {
                    const allWeekly = await wtRes.json();
                    const userDept = currentUser.department || '';
                    setMyWeeklyTasks(allWeekly.filter(t => {
                        const assigns = t.assignees || '';
                        return assigns.includes(currentUser.name) || assigns.includes('All') || assigns.includes(userDept);
                    }));
                    setNoticeTasks(allWeekly.filter(t => t.team === '공지사항'));
                }
            } else {
                alert('저장에 실패했습니다.');
            }
        } catch (e) {
            console.error(e);
            alert('오류가 발생했습니다.');
        }
    };

    const handleDeleteWeeklyTask = async (task) => {
        try {
            const res = await fetch(`/api/weekly-tasks/${task.id}`, { method: 'DELETE' });
            if (!res.ok) alert('삭제에 실패했습니다.');
        } catch (e) {
            console.error(e);
            alert('삭제 도중 오류가 발생했습니다.');
        }
    };

    const handleSaveWeeklySchedule = async (scheduleData) => {
        try {
            const url = scheduleData.id ? `/api/weekly-schedule/${scheduleData.id}` : '/api/weekly-schedule';
            const method = scheduleData.id ? 'PUT' : 'POST';
            const payload = {
                ...scheduleData,
                assignees: scheduleData.assignees || currentUser.name,
                week_start: scheduleData.week_start || format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                alert('일정 저장에 실패했습니다.');
            } else {
                setRefreshTrigger(prev => prev + 1);
            }
        } catch (e) {
            console.error(e);
            alert('일정 저장 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteWeeklySchedule = async (sch) => {
        try {
            const res = await fetch(`/api/weekly-schedule/${sch.id}`, { method: 'DELETE' });
            if (!res.ok) alert('일정 삭제에 실패했습니다.');
            else setRefreshTrigger(prev => prev + 1);
        } catch (e) {
            console.error(e);
            alert('일정 삭제 중 오류가 발생했습니다.');
        }
    };

    const confirmDelete = async () => {
        if (!taskToDelete) return;
        const task = taskToDelete;
        try {
            const res = await fetch(`/api/weekly-tasks/${task.id}`, { method: 'DELETE' });
            if (res.ok) {
                // Refresh my tasks
                const weekStr = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                const wtRes = await fetch(`/api/weekly-tasks?week=${weekStr}`);
                if (wtRes.ok) {
                    const allWeekly = await wtRes.json();
                    const userDept = currentUser.department || '';
                    setMyWeeklyTasks(allWeekly.filter(t => {
                        const assigns = t.assignees || '';
                        return assigns.includes(currentUser.name) || assigns.includes('All') || assigns.includes(userDept);
                    }));
                }
            } else {
                alert('삭제에 실패했습니다.');
            }
        } catch (e) {
            console.error(e);
            alert('삭제 도중 오류가 발생했습니다.');
        } finally {
            setShowDeleteConfirm(false);
            setTaskToDelete(null);
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
                            onClick={openHubModal}
                            className="py-2 w-[100px] bg-gradient-to-r from-kh-green to-kh-green/80 text-white rounded-lg hover:shadow-lg transition-all text-sm font-bold flex items-center justify-center gap-1 shadow-sm shrink-0"
                        >
                            주간 업무
                        </button>

                        <button
                            onClick={() => setIsScheduleHubModalOpen(true)}
                            className="py-2 w-[100px] bg-gradient-to-r from-kh-green to-kh-green/80 text-white rounded-lg hover:shadow-lg transition-all text-sm font-bold flex items-center justify-center gap-1 shadow-sm shrink-0"
                        >
                            주간 일정
                        </button>

                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-400">휴가 설정</span>
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            {['없음', '오전반차', '오후반차', '연차'].map(t => {
                                const isActive =
                                    t === '연차' ? getHours(selectedDate, '연차') > 0 :
                                    t === '오전반차' ? getHours(selectedDate, '오전반차') > 0 :
                                    t === '오후반차' ? getHours(selectedDate, '오후반차') > 0 :
                                    (getHours(selectedDate, '연차') === 0 && getHours(selectedDate, '반차') === 0 && getHours(selectedDate, '오전반차') === 0 && getHours(selectedDate, '오후반차') === 0);

                                return (
                                    <button
                                        key={t}
                                        onClick={() => handleLeaveToggle(t === '연차' ? 'full' : t === '오전반차' ? 'half_am' : t === '오후반차' ? 'half_pm' : 'none')}
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

                {/* Save Button */}
                <div className="z-10 flex-none bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:bg-transparent lg:backdrop-filter-none mb-4">
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

            {isHubModalOpen && (
                <WeeklyTaskHubModal
                    onClose={() => setIsHubModalOpen(false)}
                    onSaveTask={handleSaveWeeklyTask}
                    onDeleteTask={handleDeleteWeeklyTask}
                    currentUser={currentUser}
                    currentWeek={format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')}
                    selectedDate={selectedDate}
                />
            )}

            {isScheduleHubModalOpen && (
                <WeeklyScheduleHubModal
                    onClose={() => setIsScheduleHubModalOpen(false)}
                    onSaveSchedule={handleSaveWeeklySchedule}
                    onDeleteSchedule={handleDeleteWeeklySchedule}
                    currentUser={currentUser}
                    currentWeek={format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')}
                    selectedDate={selectedDate}
                />
            )}

            {isTaskModalOpen && (
                <TaskFormModal
                    team={editingTask ? editingTask.team : (currentUser.department || '공통업무&행정')}
                    task={editingTask}
                    onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
                    onSave={handleSaveWeeklyTask}
                    currentUser={currentUser}
                    currentWeek={format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')}
                    isFromTimesheet={true}
                />
            )}

            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm transform animate-in zoom-in-95 duration-200 border border-gray-100">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                                <Trash2 className="w-7 h-7 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">업무 삭제</h3>
                            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                                정말 이 업무 구성을 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-200"
                                >
                                    삭제하기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isStatusBoardOpen && (
                <StatusBoard 
                    currentUser={currentUser} 
                    isModal={true} 
                    onClose={() => setIsStatusBoardOpen(false)} 
                />
            )}
        </div>
    );
};

export default Timesheet;
