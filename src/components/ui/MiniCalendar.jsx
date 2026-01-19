import React from 'react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MiniCalendar = ({ selectedDate, onDateChange, dailyData = {} }) => {
    const [currentMonth, setCurrentMonth] = React.useState(new Date());

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
                    <div key={i} className={`text-center text-xs font-medium ${i === 0 ? 'text-red-500' : 'text-gray-400'}`}>
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

                days.push(
                    <div
                        key={day}
                        className={`aspect-square flex flex-col items-center justify-center cursor-pointer rounded-full transition-all duration-200 m-0.5 relative
                            ${!isCurrentMonth ? 'text-gray-300' : isSelected ? 'bg-primary text-white shadow-md shadow-primary/30 font-bold' : 'text-dark hover:bg-primary/10'}
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
