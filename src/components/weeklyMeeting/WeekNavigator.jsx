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

  const currentIndex = availableWeeks.indexOf(currentWeek);
  
  // 만약 availableWeeks가 덜 로드됐거나 현재 주가 리스트에 없다면 기본 UI 표시
  const displayLabel = currentWeek 
    ? `${currentWeek.substring(0,4)}년 ${getISOWeek(currentWeek)}주차 (${getKoreanDateStr(currentWeek)})`
    : '로딩 중...';

  const handlePrev = () => {
    if (currentIndex < availableWeeks.length - 1) {
      onWeekChange(availableWeeks[currentIndex + 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex > 0) {
      onWeekChange(availableWeeks[currentIndex - 1]);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-white p-1.5 px-3 rounded-full border border-gray-200 shadow-sm">
      <CalendarDays className="w-4 h-4 text-primary ml-1" />
      
      <button 
        onClick={handlePrev}
        disabled={currentIndex >= availableWeeks.length - 1 || currentIndex === -1}
        className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ChevronLeft className="w-4 h-4 text-gray-600" />
      </button>
      
      <span className="text-sm font-semibold text-gray-800 min-w-[140px] text-center select-none tracking-tight">
        {displayLabel}
      </span>
      
      <button 
        onClick={handleNext}
        disabled={currentIndex <= 0}
        className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ChevronRight className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  );
};

export default WeekNavigator;
