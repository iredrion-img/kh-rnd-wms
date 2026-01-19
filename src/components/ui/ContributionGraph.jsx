import React from 'react';
import { format, subDays, eachDayOfInterval, startOfWeek, getDay, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';

const ContributionGraph = ({ dailyData = {}, year = 2026 }) => {
    // Generate dates for the specific year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

    // Determine color based on hours
    const getColor = (hours) => {
        if (!hours || hours === 0) return 'bg-gray-100';
        if (hours <= 2) return 'bg-green-200';
        if (hours <= 5) return 'bg-green-300';
        if (hours <= 8) return 'bg-green-500';
        return 'bg-green-700';
    };

    // Calculate total daily hours from the dailyData object
    const getTotalHours = (dateStr) => {
        const dayData = dailyData[dateStr];
        if (!dayData) return 0;
        return Object.values(dayData).reduce((acc, curr) => acc + curr, 0);
    };

    // Group dates by weeks (Monday start)
    const weeks = [];
    let currentWeek = [];

    // Pad the first week if startDate is not Monday
    // getDay(): 0=Sun, 1=Mon, ..., 6=Sat
    // We want Mon=0, ..., Sun=6
    const dayOfWeek = getDay(startDate);
    const startDay = (dayOfWeek + 6) % 7;

    for (let i = 0; i < startDay; i++) {
        currentWeek.push(null);
    }

    dateRange.forEach((date) => {
        currentWeek.push(date);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });

    // Push remaining days
    if (currentWeek.length > 0) {
        weeks.push(currentWeek);
    }

    // Month labels logic
    const monthLabels = [];
    let lastMonth = null;
    weeks.forEach((week, index) => {
        const firstDayOfWeek = week.find(d => d !== null);
        if (!firstDayOfWeek) return;

        const month = format(firstDayOfWeek, 'MMM', { locale: ko });
        if (month !== lastMonth) {
            monthLabels.push({ index, label: month });
            lastMonth = month;
        }
    });

    return (
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-neutral/10 w-full">
            <h3 className="text-sm font-bold text-dark mb-2 group flex items-center gap-2">
                연간 업무 활동 (Contribution)
                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    2026
                </span>
            </h3>

            {/* Minimized Grid Container */}
            <div className="w-full pb-0">
                <div className="w-full flex gap-0">

                    {/* Right Side: Grid Only (No Labels) */}
                    <div className="flex flex-col w-full min-w-0 flex-1">

                        {/* The Grid (Weeks) - FLUID WIDTH, SQUARE CELLS, MON-REI Only */}
                        <div
                            className="grid w-full gap-0.5"
                            style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
                        >
                            {weeks.map((week, wIndex) => {
                                // Filter to show only Mon(0) to Fri(4)
                                const workWeek = week.slice(0, 5);
                                return (
                                    <div key={wIndex} className="flex flex-col gap-0.5 w-full">
                                        {/* Day Cells - Aspect Square */}
                                        {workWeek.map((date, dIndex) => {
                                            // Handle null padding or date
                                            if (!date) return <div key={dIndex} className="w-full aspect-square" />;

                                            const dateStr = format(date, 'yyyy-MM-dd');
                                            const hours = getTotalHours(dateStr);
                                            const color = getColor(hours);

                                            return (
                                                <div
                                                    key={dateStr}
                                                    className={`w-full aspect-square rounded-[2px] ${color} transition-all duration-150 cursor-pointer relative group`}
                                                >
                                                    {/* Hover Ring Effect */}
                                                    <div className="absolute inset-0 rounded-[2px] opacity-0 group-hover:opacity-100 ring-2 ring-gray-400 ring-offset-1 pointer-events-none z-10"></div>

                                                    {/* Tooltip */}
                                                    <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900/90 text-white text-[10px] rounded shadow-xl whitespace-nowrap z-50 backdrop-blur-sm border border-white/10">
                                                        <span className="font-semibold text-gray-200">{format(date, 'M월 d일 (EEE)', { locale: ko })}</span>
                                                        <span className="mx-1.5 opacity-30">|</span>
                                                        <span className="font-bold text-white">{hours}시간</span>
                                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900/90"></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend - Unchanged */}
            <div className="flex items-center justify-end text-[10px] text-gray-400 gap-1.5 mt-4">
                <span>Less</span>
                <div className="w-2 h-2 bg-gray-100 rounded-[1px]"></div>
                <div className="w-2 h-2 bg-green-200 rounded-[1px]"></div>
                <div className="w-2 h-2 bg-green-300 rounded-[1px]"></div>
                <div className="w-2 h-2 bg-green-500 rounded-[1px]"></div>
                <div className="w-2 h-2 bg-green-700 rounded-[1px]"></div>
                <span>More</span>
            </div>
        </div>
    );
};

export default ContributionGraph;
