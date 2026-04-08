import React from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

const WeekNavigator = ({ currentWeek, onWeekChange, availableWeeks, isAdmin }) => {
  // ISO 주차 계산 헬퍼 함수
  const getISOWeek = (dateStr) => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const getKoreanDateStr = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const getWeekOffset = (dateStr, offsetDays) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };

  const handlePrev = () => {
    onWeekChange(getWeekOffset(currentWeek, -7));
  };

  const handleNext = () => {
    onWeekChange(getWeekOffset(currentWeek, 7));
  };

  return (
    <div className="flex items-center gap-3 bg-white p-1.5 px-3 rounded-full border border-gray-200 shadow-sm">
      <CalendarDays className="w-4 h-4 text-primary ml-1" />
      
      <button 
        onClick={handlePrev}
        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
      >
        <ChevronLeft className="w-4 h-4 text-gray-600" />
      </button>
      
      <span className="text-sm font-semibold text-gray-800 min-w-[140px] text-center select-none tracking-tight">
        {displayLabel}
      </span>
      
      <button 
        onClick={handleNext}
        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
      >
        <ChevronRight className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  );
};

export default WeekNavigator;
