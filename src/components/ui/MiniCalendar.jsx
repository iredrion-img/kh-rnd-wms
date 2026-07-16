import React from 'react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// 2026년 대한민국 공휴일 (음력 공휴일은 해당 연도 양력 날짜로 변환)
const KOREAN_HOLIDAYS_2026 = [
    '2026-01-01', // 신정
    '2026-02-16', // 설날 전날
    '2026-02-17', // 설날
    '2026-02-18', // 설날 다음날
    '2026-03-01', // 삼일절
    '2026-03-02', // 삼일절 대체공휴일 (일요일과 겹침)
    '2026-05-05', // 어린이날
    '2026-05-24', // 부처님오신날
    '2026-05-25', // 부처님오신날 대체공휴일 (일요일과 겹침)
    '2026-06-03', // 전국동시지방선거일 (임시 공휴일)
    '2026-06-06', // 현충일
    '2026-07-17', // 제헌절
    '2026-08-15', // 광복절
    '2026-09-24', // 추석 전날
    '2026-09-25', // 추석
    '2026-09-26', // 추석 다음날
    '2026-10-03', // 개천절
    '2026-10-05', // 개천절 대체공휴일 (토요일과 겹침)
    '2026-10-09', // 한글날
    '2026-12-25', // 크리스마스
];

const isHoliday = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return KOREAN_HOLIDAYS_2026.includes(dateStr);
};

const isWeekend = (date) => {
    const day = getDay(date);
    return day === 0 || day === 6; // 0=일요일, 6=토요일
};

const isHolidayOrWeekend = (date) => isWeekend(date) || isHoliday(date);

const MiniCalendar = ({ selectedDate, onDateChange, dailyData = {} }) => {
    const [currentMonth, setCurrentMonth] = React.useState(new Date());

    // Sync calendar view when selectedDate changes (e.g., from Contribution heatmap click)
    React.useEffect(() => {
        if (selectedDate && !isSameMonth(selectedDate, currentMonth)) {
            setCurrentMonth(selectedDate);
        }
    }, [selectedDate]);

    const onNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const onPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    // Helper to check if data exists for a date
    const hasData = (date) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        if (!dailyData[dateKey]) return false;
        // Check if total hours > 0
        return Object.values(dailyData[dateKey]).some(h => h > 0);
    };

    const renderHeader = () => {
        return (
            <div className="flex justify-between items-center mb-4 px-2">
                <span className="text-lg font-bold text-dark">
                    {format(currentMonth, 'yyyy년 M월', { locale: ko })}
                </span>
                <div className="flex space-x-1">
                    <button onClick={onPrevMonth} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <ChevronLeft size={18} className="text-gray-500" />
                    </button>
                    <button onClick={onNextMonth} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <ChevronRight size={18} className="text-gray-500" />
                    </button>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        return (
            <div className="grid grid-cols-7 mb-2">
                {days.map((day, i) => (
                    <div key={i} className={`text-center text-xs font-medium ${i === 0 || i === 6 ? 'text-red-500' : 'text-gray-400'}`}>
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = '';

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, 'd');
                const cloneDay = day;
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const hasWorkLog = hasData(day);
                const isRedDay = isHolidayOrWeekend(day);

                // Determine text color
                let textColorClass;
                if (!isCurrentMonth) {
                    textColorClass = isRedDay ? 'text-red-300' : 'text-gray-300';
                } else if (isSelected) {
                    textColorClass = 'bg-primary text-white shadow-md shadow-primary/30 font-bold';
                } else if (isRedDay) {
                    textColorClass = 'text-red-500 hover:bg-red-50 font-medium';
                } else {
                    textColorClass = 'text-dark hover:bg-primary/10';
                }

                days.push(
                    <div
                        key={day}
                        className={`aspect-square flex flex-col items-center justify-center cursor-pointer rounded-full transition-all duration-200 m-0.5 relative
                            ${textColorClass}
                        `}
                        onClick={() => onDateChange(cloneDay)}
                    >
                        <span className="text-sm z-10">{formattedDate}</span>
                        {/* Data Indicator Dot */}
                        {hasWorkLog && !isSelected && (
                            <div className="w-1 h-1 rounded-full bg-green-500 absolute bottom-2"></div>
                        )}
                        {hasWorkLog && isSelected && (
                            <div className="w-1 h-1 rounded-full bg-white absolute bottom-2"></div>
                        )}
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7" key={day}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="space-y-1">{rows}</div>;
    };

    return (
        <div className="p-4 bg-white rounded-xl shadow-sm border border-neutral/10">
            {renderHeader()}
            {renderDays()}
            {renderCells()}
        </div>
    );
};

export default MiniCalendar;
