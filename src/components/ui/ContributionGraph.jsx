import React from 'react';
import { format, eachDayOfInterval, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';

/* ═══════════════════════════════════════════
   Category Color Map
   ═══════════════════════════════════════════ */
const CATEGORY_COLORS = {
    'AI': { base: '#367FF6', shades: ['#D6E6FE', '#93B8FC', '#5E96F9', '#367FF6'] },
    'BIM': { base: '#22C55E', shades: ['#CFFCD8', '#6EE7A0', '#3DD875', '#22C55E'] },
    'Smart R&D': { base: '#F97316', shades: ['#FEE9D5', '#FDBA74', '#FB923C', '#F97316'] },
    'Digital Technology': { base: '#A855F7', shades: ['#EDE3FE', '#D8B4FE', '#C084FC', '#A855F7'] },
    '기타 (Etc)': { base: '#9E9E9E', shades: ['#E5E7EB', '#D1D5DB', '#B0B5BB', '#9E9E9E'] },
    'Etc': { base: '#9E9E9E', shades: ['#E5E7EB', '#D1D5DB', '#B0B5BB', '#9E9E9E'] },
};

// Fallback for unmatched category names: find best match
const resolveColor = (catName) => {
    if (CATEGORY_COLORS[catName]) return CATEGORY_COLORS[catName];
    const upper = (catName || '').toUpperCase();
    if (upper.includes('AI')) return CATEGORY_COLORS['AI'];
    if (upper.includes('BIM')) return CATEGORY_COLORS['BIM'];
    if (upper.includes('R&D') || upper.includes('SMART')) return CATEGORY_COLORS['Smart R&D'];
    if (upper.includes('DIGITAL') || upper.includes('TECHNOLOGY')) return CATEGORY_COLORS['Digital Technology'];
    return CATEGORY_COLORS['Etc'];
};

const ContributionGraph = ({ dailyData = {}, year = 2026, onDateClick }) => {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

    /* ─── Derive dominant category + total hours ─── */
    const getDayInfo = (dateStr) => {
        const dayData = dailyData[dateStr];
        if (!dayData) return { total: 0, dominant: null };

        let total = 0, maxCat = null, maxHrs = 0;
        Object.entries(dayData).forEach(([cat, hrs]) => {
            total += hrs;
            if (hrs > maxHrs) { maxHrs = hrs; maxCat = cat; }
        });
        return { total, dominant: maxCat };
    };

    /* ─── Pick color: dominant category color with intensity by hours ─── */
    const getCellStyle = (dateStr) => {
        const { total, dominant } = getDayInfo(dateStr);
        if (!total || total === 0) return { backgroundColor: '#F3F4F6' }; // gray-100

        const palette = resolveColor(dominant);
        let shadeIdx;
        if (total <= 2) shadeIdx = 0;
        else if (total <= 5) shadeIdx = 1;
        else if (total <= 8) shadeIdx = 2;
        else shadeIdx = 3;

        return { backgroundColor: palette.shades[shadeIdx] };
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
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-neutral/10 w-full">
            <h3 className="text-sm font-bold text-dark mb-2 group flex items-center gap-2">
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
                                                            <span className="text-gray-400">기록 없음</span>
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
            <div className="flex items-center justify-end text-[10px] text-gray-400 gap-3 mt-4 flex-wrap">
                <span className="mr-1">카테고리:</span>
                {orderedLegend.map(cat => (
                    <div key={cat} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-[1px]" style={{ backgroundColor: resolveColor(cat).base }} />
                        <span>{cat}</span>
                    </div>
                ))}
                <span className="mx-1 text-gray-200">|</span>
                <span>밝기 = 시간</span>
                <div className="flex gap-0.5 items-center">
                    <span>Less</span>
                    <div className="w-2 h-2 rounded-[1px]" style={{ backgroundColor: '#D6E6FE' }} />
                    <div className="w-2 h-2 rounded-[1px]" style={{ backgroundColor: '#93B8FC' }} />
                    <div className="w-2 h-2 rounded-[1px]" style={{ backgroundColor: '#5E96F9' }} />
                    <div className="w-2 h-2 rounded-[1px]" style={{ backgroundColor: '#367FF6' }} />
                    <span>More</span>
                </div>
            </div>
        </div>
    );
};

export default ContributionGraph;
