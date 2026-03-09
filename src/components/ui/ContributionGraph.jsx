import React from 'react';
import { format, eachDayOfInterval, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';

/* ═══════════════════════════════════════════
   Category Color Map
   ═══════════════════════════════════════════ */
const CATEGORY_COLORS = {
    'AI': { base: '#B06ED3', shades: ['#EDE0F5', '#CFA8E3', '#BD89DB', '#B06ED3'] },
    'BIM': { base: '#2673CA', shades: ['#D4E4F7', '#7FAEE0', '#4D90D5', '#2673CA'] },
    'Smart R&D': { base: '#189631', shades: ['#D0EDDA', '#6DC488', '#3DAD5C', '#189631'] },
    'Digital Technology': { base: '#E6773C', shades: ['#FCDECF', '#F2B38A', '#EC9560', '#E6773C'] },
    '기타 (Etc)': { base: '#9E9E9E', shades: ['#E5E7EB', '#D1D5DB', '#B0B5BB', '#9E9E9E'] },
    'Etc': { base: '#9E9E9E', shades: ['#E5E7EB', '#D1D5DB', '#B0B5BB', '#9E9E9E'] },
    '연차': { base: '#A5B4FC', shades: ['#E8ECFF', '#C7D2FE', '#B4BFFC', '#A5B4FC'] },
    '반차': { base: '#FCD34D', shades: ['#FEF9C3', '#FDE68A', '#FCD34D', '#FBBF24'] },
};

// Fallback for unmatched category names: find best match
const resolveColor = (catName) => {
    if (CATEGORY_COLORS[catName]) return CATEGORY_COLORS[catName];
    const upper = (catName || '').toUpperCase();
    if (upper.includes('연차')) return CATEGORY_COLORS['연차'];
    if (upper.includes('반차') || upper.includes('오전반차') || upper.includes('오후반차')) return CATEGORY_COLORS['반차'];
    if (upper.includes('AI')) return CATEGORY_COLORS['AI'];
    if (upper.includes('BIM')) return CATEGORY_COLORS['BIM'];
    if (upper.includes('R&D') || upper.includes('SMART')) return CATEGORY_COLORS['Smart R&D'];
    if (upper.includes('DIGITAL') || upper.includes('TECHNOLOGY')) return CATEGORY_COLORS['Digital Technology'];
    return CATEGORY_COLORS['Etc'];
};

const LEAVE_LABELS = ['연차', '반차', '오전반차', '오후반차'];

/* ═══════════════════════════════════════════
   2026 Korean Public Holidays
   ═══════════════════════════════════════════ */
const KOREAN_HOLIDAYS_2026 = {
    '2026-01-01': '신정',
    '2026-02-15': '설날 연휴',
    '2026-02-16': '설날',
    '2026-02-17': '설날 연휴',
    '2026-02-18': '설날 대체공휴일',
    '2026-03-01': '삼일절',
    '2026-03-02': '삼일절 대체공휴일',
    '2026-05-05': '어린이날',
    '2026-05-24': '부처님오신날',
    '2026-05-25': '부처님오신날 대체공휴일',
    '2026-06-03': '지방선거일',
    '2026-06-06': '현충일',
    '2026-07-17': '제헌절',
    '2026-08-15': '광복절',
    '2026-08-17': '광복절 대체공휴일',
    '2026-09-24': '추석 연휴',
    '2026-09-25': '추석',
    '2026-09-26': '추석 연휴',
    '2026-10-03': '개천절',
    '2026-10-05': '개천절 대체공휴일',
    '2026-10-09': '한글날',
    '2026-12-25': '크리스마스',
};

const ContributionGraph = ({ dailyData = {}, year = 2026, onDateClick }) => {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

    /* ─── Derive dominant category + total hours ─── */
    const getDayInfo = (dateStr) => {
        const dayData = dailyData[dateStr];
        if (!dayData) return { total: 0, dominant: null, hasLeave: null, workDominant: null, workTotal: 0 };

        let total = 0, maxCat = null, maxHrs = 0;
        let hasLeave = null, workDominant = null, workMaxHrs = 0, workTotal = 0;

        Object.entries(dayData).forEach(([cat, hrs]) => {
            total += hrs;
            if (hrs > maxHrs) { maxHrs = hrs; maxCat = cat; }

            if (LEAVE_LABELS.includes(cat)) {
                if (cat === '연차') hasLeave = '연차';
                else if (!hasLeave) hasLeave = '반차'; // 반차/오전반차/오후반차
            } else {
                workTotal += hrs;
                if (hrs > workMaxHrs) { workMaxHrs = hrs; workDominant = cat; }
            }
        });
        return { total, dominant: maxCat, hasLeave, workDominant, workTotal };
    };

    /* ─── Pick color: dominant category color with intensity by hours ─── */
    const getCellStyle = (dateStr) => {
        const isHoliday = !!KOREAN_HOLIDAYS_2026[dateStr];
        const { total, dominant, hasLeave, workDominant, workTotal } = getDayInfo(dateStr);

        // If there's data
        if (total > 0) {
            // 연차 (full day leave) — soft lavender
            if (hasLeave === '연차') {
                return { backgroundColor: '#C7D2FE' };
            }

            // 반차 + work — split cell (top: work color, bottom: amber)
            if (hasLeave === '반차' && workTotal > 0) {
                const workPalette = resolveColor(workDominant);
                let shadeIdx;
                if (workTotal <= 2) shadeIdx = 1;
                else if (workTotal <= 4) shadeIdx = 2;
                else shadeIdx = 3;
                const workColor = workPalette.shades[shadeIdx];
                return {
                    background: `linear-gradient(to bottom, ${workColor} 50%, #FBBF24 50%)`,
                };
            }

            // 반차 only (no work logged) — solid amber
            if (hasLeave === '반차') {
                return { backgroundColor: '#FBBF24' };
            }

            // Normal work — show work color
            const palette = resolveColor(dominant);
            let shadeIdx;
            if (total <= 2) shadeIdx = 0;
            else if (total <= 5) shadeIdx = 1;
            else if (total <= 8) shadeIdx = 2;
            else shadeIdx = 3;
            return { backgroundColor: palette.shades[shadeIdx] };
        }

        // Holiday with no work: show distinct red/pink
        if (isHoliday) {
            return { backgroundColor: '#FEE2E2', backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 2px, #FECACA 2px, #FECACA 3px)' };
        }

        return { backgroundColor: '#F3F4F6' }; // normal empty day
    };

    /* ─── Build tooltip content ─── */
    const getTooltipContent = (dateStr) => {
        const dayData = dailyData[dateStr];
        if (!dayData) return null;
        const sorted = Object.entries(dayData)
            .filter(([_, h]) => h > 0)
            .sort(([, a], [, b]) => b - a);
        if (sorted.length === 0) return null;
        return sorted;
    };

    /* ─── Group dates by weeks (Mon start) ─── */
    const weeks = [];
    let currentWeek = [];
    const dayOfWeek = getDay(startDate);
    const startDay = (dayOfWeek + 6) % 7;
    for (let i = 0; i < startDay; i++) currentWeek.push(null);
    dateRange.forEach((date) => {
        currentWeek.push(date);
        if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
    });
    if (currentWeek.length > 0) weeks.push(currentWeek);

    /* ─── Unique legend entries from data ─── */
    const legendCats = new Set();
    Object.values(dailyData).forEach(dayData => {
        Object.entries(dayData).forEach(([cat, hrs]) => {
            if (hrs > 0) legendCats.add(cat);
        });
    });
    // Order: known cats first, then others
    const orderedLegend = ['AI', 'BIM', 'Smart R&D', 'Digital Technology', '기타 (Etc)', 'Etc']
        .filter(c => legendCats.has(c));

    return (
        <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-neutral/10 w-full">
            <h3 className="text-sm font-bold text-dark mb-1 group flex items-center gap-2">
                연간 업무 활동 (Contribution)
                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    {year}
                </span>
            </h3>

            {/* Grid */}
            <div className="w-full pb-0">
                <div className="w-full flex gap-0">
                    <div className="flex flex-col w-full min-w-0 flex-1">
                        <div className="grid w-full gap-0.5"
                            style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
                            {weeks.map((week, wIndex) => {
                                const workWeek = week.slice(0, 5);
                                return (
                                    <div key={wIndex} className="flex flex-col gap-0.5 w-full">
                                        {workWeek.map((date, dIndex) => {
                                            if (!date) return <div key={dIndex} className="w-full aspect-square" />;

                                            const dateStr = format(date, 'yyyy-MM-dd');
                                            const { total, dominant } = getDayInfo(dateStr);
                                            const tooltipItems = getTooltipContent(dateStr);

                                            return (
                                                <div key={dateStr}
                                                    onClick={() => onDateClick && onDateClick(date)}
                                                    className="w-full aspect-square rounded-[2px] transition-all duration-150 cursor-pointer relative group"
                                                    style={getCellStyle(dateStr)}>
                                                    {/* Hover ring */}
                                                    <div className="absolute inset-0 rounded-[2px] opacity-0 group-hover:opacity-100 ring-2 ring-gray-400 ring-offset-1 pointer-events-none z-10" />

                                                    {/* Tooltip */}
                                                    <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900/90 text-white text-[10px] rounded-lg shadow-xl whitespace-nowrap z-50 backdrop-blur-sm border border-white/10"
                                                        style={{ minWidth: '110px' }}>
                                                        <div className="font-semibold text-gray-200 mb-1">
                                                            {format(date, 'M월 d일 (EEE)', { locale: ko })}
                                                        </div>
                                                        {KOREAN_HOLIDAYS_2026[dateStr] && (
                                                            <div className="flex items-center gap-1.5 py-0.5 mb-1 text-red-300">
                                                                <span>🔴</span>
                                                                <span className="font-semibold">{KOREAN_HOLIDAYS_2026[dateStr]}</span>
                                                            </div>
                                                        )}
                                                        {tooltipItems ? (
                                                            <>
                                                                {tooltipItems.map(([cat, hrs]) => (
                                                                    <div key={cat} className="flex items-center gap-1.5 py-0.5">
                                                                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                                            style={{ backgroundColor: resolveColor(cat).base }} />
                                                                        <span className="text-gray-300">{cat}</span>
                                                                        <span className="ml-auto font-bold">{hrs}h</span>
                                                                    </div>
                                                                ))}
                                                                <div className="border-t border-white/15 mt-1 pt-1 font-bold text-right">
                                                                    합계 {total}h
                                                                </div>
                                                            </>
                                                        ) : (
                                                            !KOREAN_HOLIDAYS_2026[dateStr] && <span className="text-gray-400">기록 없음</span>
                                                        )}
                                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900/90" />
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

            {/* Legend: Category-based */}
            <div className="flex items-center justify-end text-[10px] text-gray-400 gap-3 mt-1 flex-wrap">
                <span className="mr-1">카테고리:</span>
                {orderedLegend.map(cat => (
                    <div key={cat} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-[1px]" style={{ backgroundColor: resolveColor(cat).base }} />
                        <span>{cat}</span>
                    </div>
                ))}
                <span className="mx-1 text-gray-200">|</span>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-[1px]" style={{ backgroundColor: '#C7D2FE' }} />
                    <span>연차</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-[1px]" style={{ background: 'linear-gradient(to bottom, #9E9E9E 50%, #FBBF24 50%)' }} />
                    <span>반차</span>
                </div>
                <span className="mx-1 text-gray-200">|</span>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-[1px]" style={{ backgroundColor: '#FEE2E2', backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 1px, #FECACA 1px, #FECACA 2px)' }} />
                    <span>공휴일</span>
                </div>
                <span className="mx-1 text-gray-200">|</span>
                <span>밝기 = 시간</span>
                <div className="flex gap-0.5 items-center">
                    <span>Less</span>
                    <div className="w-2 h-2 rounded-[1px]" style={{ backgroundColor: '#EDE0F5' }} />
                    <div className="w-2 h-2 rounded-[1px]" style={{ backgroundColor: '#CFA8E3' }} />
                    <div className="w-2 h-2 rounded-[1px]" style={{ backgroundColor: '#BD89DB' }} />
                    <div className="w-2 h-2 rounded-[1px]" style={{ backgroundColor: '#B06ED3' }} />
                    <span>More</span>
                </div>
            </div>
        </div>
    );
};

export default ContributionGraph;
