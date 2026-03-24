import React, { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { getDay } from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ChartBoardShell from './ChartBoardShell';
import { CATEGORIES, CATEGORY_COLORS, GRADIENT_ENDS, GlassTooltip, CustomLegend } from './ChartUtils';

const WeeklyChartBoard = ({ data, totalHours, isDisplayBoardMode }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Filter to Mon-Fri and calculate row totals
    const weeklyData = data
        .filter(d => {
            const dy = getDay(new Date(d.date || d.key));
            return dy >= 1 && dy <= 5;
        })
        .map(d => ({ ...d, _total: CATEGORIES.reduce((s, c) => s + (d[c] || 0), 0) }));

    const toggleAccordion = () => setIsExpanded(!isExpanded);

    // Calculate quick insight summary
    const highestDay = [...weeklyData].sort((a, b) => b._total - a._total)[0];
    
    return (
        <ChartBoardShell
            title="주간 업무 현황"
            subtitle="시간 흐름에 따른 업무 비중의 변화를 확인하세요."
            isDisplayBoardMode={isDisplayBoardMode}
        >
            <div style={{ minHeight: '320px' }} className="w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData} margin={{ top: 15, right: 5, left: -15, bottom: 0 }}>
                        <defs>
                            {CATEGORIES.map((cat, i) => (
                                <linearGradient key={cat} id={`barG-${i}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={CATEGORY_COLORS[cat]} />
                                    <stop offset="100%" stopColor={GRADIENT_ENDS[cat]} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" strokeOpacity={0.5} />
                        <XAxis dataKey="displayDate" stroke="#9CA3AF" fontSize="clamp(10px, 0.9vw, 16px)" tickMargin={6} axisLine={false} tickLine={false} />
                        <YAxis stroke="#9CA3AF" fontSize="clamp(10px, 0.9vw, 16px)" axisLine={false} tickLine={false} />
                        <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                        <Legend verticalAlign="top" align="right" content={<CustomLegend />} />
                        {[...CATEGORIES].reverse().map((cat, ri) => {
                            const origIdx = CATEGORIES.indexOf(cat);
                            return (
                                <Bar key={cat} dataKey={cat} stackId="a" fill={`url(#barG-${origIdx})`}
                                    radius={ri === CATEGORIES.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0]} barSize={44}
                                    label={ri === CATEGORIES.length - 1 ? (props) => {
                                        const { x, y, width, index } = props;
                                        const row = weeklyData[index];
                                        if (!row || !row._total) return null;
                                        return (
                                            <text x={x + width / 2} y={y - 8} textAnchor="middle" fill="#6B7280" fontSize="clamp(10px, 0.9vw, 13px)" fontWeight="bold">
                                                {Math.round(row._total).toLocaleString()}h
                                            </text>
                                        );
                                    } : false}
                                />
                            );
                        })}
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Insight Chip & Accordion Toggle */}
            <div className="mt-[clamp(0.5rem,1vh,1rem)] flex flex-col items-center">
                <div className="flex flex-wrap gap-3 text-[12px] text-gray-500 mb-3 justify-center items-center font-medium bg-gray-50/80 px-4 py-1.5 rounded-full border border-gray-100">
                    <span className="flex items-center gap-1.5">
                        <span className="text-[14px]">💡</span> 
                        이번 주 총 근무시간 <strong className="text-kh-text-main font-black">{Math.round(totalHours).toLocaleString()}h</strong>
                    </span>
                    {highestDay && highestDay._total > 0 && (
                        <>
                            <span className="text-gray-300">|</span>
                            <span>업무량 최고일: <strong>{highestDay.displayDate} ({Math.round(highestDay._total)}h)</strong></span>
                        </>
                    )}
                </div>
                {!isDisplayBoardMode && (
                    <button
                        onClick={toggleAccordion}
                        aria-expanded={isExpanded}
                        aria-controls="weekly-data-table"
                        className="px-4 py-1.5 border border-gray-200 bg-white rounded-full text-[12px] font-bold text-gray-500 hover:bg-gray-50 hover:text-gray-800 flex items-center gap-1 transition-all shadow-sm"
                    >
                        상세 데이터 표 보기
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                )}
            </div>

            {/* Accessible Accordion Table Wrapper */}
            <div 
                id="weekly-data-table"
                className="transition-[grid-template-rows] duration-500 ease-in-out grid"
                style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
            >
                <div className="overflow-hidden">
                    <div className="pt-4 pb-2 w-full max-h-[35vh] overflow-y-auto pr-1">
                        <div className="border border-white/60 bg-white/40 backdrop-blur-md rounded-xl overflow-x-auto shadow-sm">
                            <table className="w-full text-[clamp(10px,0.8vw,13px)] text-left whitespace-nowrap table-fixed">
                                <thead className="bg-white/60 backdrop-blur-sm">
                                    <tr className="text-gray-500 border-b border-white/80">
                                        <th className="font-extrabold py-2.5 px-3 text-kh-text-main w-[15%]">일자</th>
                                        <th className="font-extrabold py-2.5 px-3 text-right text-kh-text-main border-r border-white/80 w-[10%]">총시간</th>
                                        {CATEGORIES.map(cat => (
                                            <th key={cat} className="font-bold py-2.5 px-3 text-right w-[15%]">
                                                <div className="flex items-center justify-end gap-1.5 align-middle">
                                                    <span className="w-2 h-2 rounded-full mb-[1px]" style={{ background: CATEGORY_COLORS[cat] }} />
                                                    {cat}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {weeklyData.map((row, i) => {
                                        const total = row._total;
                                        if (total === 0) return null;
                                        return (
                                            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                                <td className="py-2.5 px-3 font-bold text-gray-500">{row.displayDate}</td>
                                                <td className="py-2.5 px-3 text-right font-black text-kh-text-main border-r border-gray-100 pr-4">
                                                    {Math.round(total).toLocaleString()}h
                                                </td>
                                                {CATEGORIES.map(cat => {
                                                    const val = row[cat] || 0;
                                                    const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                                                    return (
                                                        <td key={cat} className="py-2.5 px-3 text-right text-gray-500 font-semibold">
                                                            {val > 0 ? (
                                                                <div className="flex items-center justify-end space-x-1.5">
                                                                    <span>{Math.round(val).toLocaleString()}h</span>
                                                                    <span className="text-[10px] text-gray-400 font-normal w-[24px]">({pct}%)</span>
                                                                </div>
                                                            ) : '-'}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </ChartBoardShell>
    );
};

export default WeeklyChartBoard;
