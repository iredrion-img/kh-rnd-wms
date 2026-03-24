import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import ChartBoardShell from './ChartBoardShell';
import { CATEGORIES, CATEGORY_COLORS, GlassTooltip, CustomLegend } from './ChartUtils';

const YEARLY_ROW_MIN_HEIGHT = 45;

const YearlyChartBoard = ({ data, activeViewMode, setViewMode, isDisplayBoardMode }) => {
    const toggleViewMode = (mode) => {
        if (setViewMode) setViewMode(mode);
    };

    const yearlyData = data.map(d => {
        const total = CATEGORIES.reduce((s, c) => s + (d[c] || 0), 0);
        return { ...d, _total: total };
    });

    const validMonths = yearlyData;
    const highestMonth = [...validMonths].sort((a, b) => b._total - a._total)[0];
    const highestStrategicMonth = [...validMonths].sort((a, b) => {
        const aTech = (a['AI'] || 0) + (a['BIM'] || 0) + (a['Smart R&D'] || 0);
        const bTech = (b['AI'] || 0) + (b['BIM'] || 0) + (b['Smart R&D'] || 0);
        return bTech - aTech;
    })[0];

    const headerRight = (
        <div className="flex bg-gray-50 rounded-xl p-1 text-[clamp(0.6rem,0.8vw,1rem)] font-bold pointer-events-auto border border-gray-100 items-center justify-center h-[34px]">
            <button onClick={() => toggleViewMode('hours')} className={`px-3 flex items-center justify-center rounded-lg transition-all h-full ${activeViewMode === 'hours' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>Hrs</button>
            <button onClick={() => toggleViewMode('percent')} className={`px-3 flex items-center justify-center rounded-lg transition-all h-full ${activeViewMode === 'percent' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>%</button>
        </div>
    );

    const headerMiddle = (
        <span className="hidden sm:inline-flex text-[clamp(0.55rem,0.7vw,0.8rem)] text-gray-400 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100 flex-shrink-0 mt-1 italic items-center">
            현재 집계 기준: 데이터가 존재하는 월만 표시됩니다
        </span>
    );

    const insightFooter = (
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-[13px] text-gray-600 justify-start items-center font-medium bg-gray-50/50 px-5 py-3.5 rounded-xl border border-gray-100 mt-2">
            <div className="w-full flex justify-between items-center border-b border-gray-200 pb-2 mb-1">
                <span className="text-[13px] font-bold text-kh-text-main">💡 연간 추세 요약</span>
                {!isDisplayBoardMode && <span className="text-[10px] font-bold tracking-wider bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-400">DATA TABLE DISABLED</span>}
            </div>
            {highestMonth && highestMonth._total > 0 && (
                <span className="flex items-center gap-1.5 break-keep">
                    <span className="text-[16px]">🏆</span> 최고 업무량: <strong className="text-kh-text-main font-black">{highestMonth.displayDate} ({Math.round(highestMonth._total).toLocaleString()}h)</strong>
                </span>
            )}
            {highestStrategicMonth && (highestStrategicMonth['AI'] || highestStrategicMonth['BIM'] || highestStrategicMonth['Smart R&D']) > 0 && (
                <span className="flex items-center gap-1.5 break-keep">
                    <span className="text-[16px]">🎯</span> 전략업무 비중 최고: <strong className="text-kh-text-main font-black">{highestStrategicMonth.displayDate}</strong>
                </span>
            )}
            <div className="w-full text-right mt-1 pt-2 border-t border-gray-200/50">
                <span className="text-[11px] text-gray-400 font-medium">* 상세 로우(Raw) 데이터는 상단 우측의 <strong className="text-kh-text-main">상세 현황 보기</strong> 메뉴를 이용바랍니다.</span>
            </div>
        </div>
    );

    const dynamicMinHeight = Math.max(300, validMonths.length * YEARLY_ROW_MIN_HEIGHT);

    return (
        <ChartBoardShell
            title="연간 업무 현황"
            subtitle="시간 흐름에 따른 업무 비중의 변화를 확인하세요."
            headerMiddle={headerMiddle}
            headerRight={headerRight}
            footer={insightFooter}
            isDisplayBoardMode={isDisplayBoardMode}
        >
            <div style={{ minHeight: `${dynamicMinHeight}px` }} className="w-full flex-1 relative pt-2">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                        data={validMonths} 
                        layout="vertical" 
                        stackOffset={activeViewMode === 'percent' ? 'expand' : 'none'}
                        margin={{ top: 0, right: 30, left: -20, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" strokeOpacity={0.5} />
                        <XAxis 
                            type="number" 
                            hide={activeViewMode === 'percent'} 
                            domain={activeViewMode === 'percent' ? [0, 1] : [0, 'dataMax']} 
                            stroke="#9CA3AF" fontSize={11} tickMargin={6} axisLine={false} tickLine={false} 
                        />
                        <YAxis dataKey="displayDate" type="category" stroke="#6B7280" fontSize="clamp(10px, 0.9vw, 13px)" fontWeight="700" tickMargin={12} axisLine={false} tickLine={false} />
                        <Tooltip 
                            content={<GlassTooltip formatter={(val) => activeViewMode === 'percent' ? `${(val * 100).toFixed(1)}%` : `${Math.round(val).toLocaleString()}h`} />} 
                            cursor={{ fill: 'rgba(0,0,0,0.03)' }} 
                        />
                        <Legend verticalAlign="top" align="right" content={<CustomLegend />} />

                        {CATEGORIES.map((cat, i) => {
                            const isLast = i === CATEGORIES.length - 1;
                            return (
                                <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[cat]} radius={isLast ? [0, 8, 8, 0] : [0, 0, 0, 0]} barSize={Math.min(28, YEARLY_ROW_MIN_HEIGHT * 0.8)} />
                            );
                        })}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </ChartBoardShell>
    );
};

export default YearlyChartBoard;
