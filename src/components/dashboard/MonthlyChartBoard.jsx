import React, { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { BarChart2, Table as TableIcon } from 'lucide-react';
import ChartBoardShell from './ChartBoardShell';
import { CATEGORIES, CATEGORY_COLORS, GlassTooltip, CustomLegend } from './ChartUtils';

const MonthlyChartBoard = ({ data, activeViewMode, setViewMode, isDisplayBoardMode }) => {
    const [activeTab, setActiveTab] = useState('chart');

    const toggleViewMode = (mode) => {
        if (setViewMode) setViewMode(mode);
    };

    const monthlyData = data.map(d => {
        const total = CATEGORIES.reduce((s, c) => s + (d[c] || 0), 0);
        return { ...d, _total: total };
    });

    const highestWeek = [...monthlyData].sort((a, b) => b._total - a._total)[0];
    const highestStrategicWeek = [...monthlyData].sort((a, b) => {
        const aTech = (a['AI'] || 0) + (a['BIM'] || 0) + (a['Smart R&D'] || 0);
        const bTech = (b['AI'] || 0) + (b['BIM'] || 0) + (b['Smart R&D'] || 0);
        return bTech - aTech;
    })[0];

    // Toggle Buttons for Header Right
    const headerRight = (
        <div className="flex gap-2">
            {!isDisplayBoardMode && (
                <div className="flex bg-gray-50 rounded-xl p-1 text-[clamp(0.6rem,0.8vw,1rem)] font-bold pointer-events-auto border border-gray-100 items-center justify-center h-[34px]">
                    <button aria-label="차트 보기" onClick={() => setActiveTab('chart')} className={`px-2 py-1 flex items-center justify-center rounded-lg transition-all ${activeTab === 'chart' ? 'bg-white shadow text-kh-logo-green' : 'text-gray-400 hover:text-gray-600'}`}>
                        <BarChart2 size={16} />
                    </button>
                    <button aria-label="표 보기" onClick={() => setActiveTab('table')} className={`px-2 py-1 flex items-center justify-center rounded-lg transition-all ${activeTab === 'table' ? 'bg-white shadow text-kh-logo-green' : 'text-gray-400 hover:text-gray-600'}`}>
                        <TableIcon size={16} />
                    </button>
                </div>
            )}
            <div className="flex bg-gray-50 rounded-xl p-1 text-[clamp(0.6rem,0.8vw,1rem)] font-bold pointer-events-auto border border-gray-100 items-center justify-center h-[34px]">
                <button onClick={() => toggleViewMode('hours')} className={`px-3 flex items-center justify-center rounded-lg transition-all h-full ${activeViewMode === 'hours' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>Hrs</button>
                <button onClick={() => toggleViewMode('percent')} className={`px-3 flex items-center justify-center rounded-lg transition-all h-full ${activeViewMode === 'percent' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>%</button>
            </div>
        </div>
    );

    const insightFooter = (
        <div className="flex flex-wrap gap-4 text-[13px] text-gray-600 justify-start items-center font-medium bg-gray-50/50 px-4 py-3 rounded-xl">
            {highestWeek && highestWeek._total > 0 && (
                <span className="flex items-center gap-1.5">
                    <span className="text-[16px]">🏆</span> 
                    <span>최대 업무량 주차: <strong className="text-kh-text-main font-black underline decoration-gray-300 underline-offset-4">{highestWeek.displayDate} ({Math.round(highestWeek._total)}h)</strong></span>
                </span>
            )}
            {highestStrategicWeek && (highestStrategicWeek['AI'] || highestStrategicWeek['BIM'] || highestStrategicWeek['Smart R&D']) > 0 && (
                <>
                    <div className="w-[1px] h-3 bg-gray-300 hidden sm:block"></div>
                    <span className="flex items-center gap-1.5">
                        <span className="text-[16px]">🎯</span> 
                        <span>전략업무 통합 최고: <strong className="text-kh-text-main font-black underline decoration-gray-300 underline-offset-4">{highestStrategicWeek.displayDate}</strong></span>
                    </span>
                </>
            )}
        </div>
    );

    // Chart Renderer
    const renderChart = () => (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart 
                data={monthlyData} 
                layout="vertical" 
                stackOffset={activeViewMode === 'percent' ? 'expand' : 'none'}
                margin={{ top: 0, right: 30, left: -20, bottom: 20 }}
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
                    content={<GlassTooltip formatter={(val) => activeViewMode === 'percent' ? `${(val * 100).toFixed(1)}%` : `${Math.round(val)}h`} />} 
                    cursor={{ fill: 'rgba(0,0,0,0.03)' }} 
                />
                <Legend verticalAlign="top" align="right" content={<CustomLegend />} />

                {CATEGORIES.map((cat, i) => {
                    const isLast = i === CATEGORIES.length - 1;
                    return (
                        <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[cat]} radius={isLast ? [0, 8, 8, 0] : [0, 0, 0, 0]} barSize={28} />
                    );
                })}
            </BarChart>
        </ResponsiveContainer>
    );

    // Table Renderer
    const renderTable = () => (
        <div className="absolute inset-x-0 top-0 bottom-4 overflow-y-auto w-full lg:max-h-[350px] rounded-xl border border-gray-100 shadow-sm bg-white">
            <table className="w-full text-[clamp(10px,0.8vw,13px)] text-left whitespace-nowrap table-fixed">
                <thead className="bg-gray-50 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <tr className="text-gray-400 border-b border-gray-200">
                        <th className="font-extrabold py-3 px-4 text-kh-text-main w-[15%]">주차</th>
                        <th className="font-extrabold py-3 px-4 text-right text-kh-text-main border-r border-gray-100 w-[12%]">총시간</th>
                        {CATEGORIES.map(cat => (
                            <th key={cat} className="font-bold py-3 px-3 text-right w-[14%]">
                                <div className="flex items-center justify-end gap-1.5 align-middle">
                                    <span className="w-2.5 h-2.5 rounded-full mb-[1px] shadow-sm" style={{ background: CATEGORY_COLORS[cat] }} />
                                    {cat}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {monthlyData.map((row, i) => {
                        const total = row._total;
                        if (total === 0) return null;
                        return (
                            <tr key={i} className="hover:bg-gray-50/80 transition-colors">
                                <td className="py-3.5 px-4 font-bold text-gray-600">{row.displayDate}</td>
                                <td className="py-3.5 px-4 text-right font-black text-kh-text-main border-r border-gray-100 pr-5">
                                    {Math.round(total).toLocaleString()}h
                                </td>
                                {CATEGORIES.map(cat => {
                                    const val = row[cat] || 0;
                                    const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                                    return (
                                        <td key={cat} className="py-3.5 px-3 text-right text-gray-500 font-semibold">
                                            {val > 0 ? (
                                                <div className="flex items-center justify-end space-x-1.5">
                                                    <span>{Math.round(val).toLocaleString()}h</span>
                                                    <span className="text-[10px] text-gray-400 font-normal w-[26px]">({pct}%)</span>
                                                </div>
                                            ) : <span className="text-gray-300">-</span>}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    return (
        <ChartBoardShell
            title="월간 업무 현황"
            subtitle="시간 흐름에 따른 업무 비중의 변화를 확인하세요."
            headerRight={headerRight}
            footer={insightFooter}
            isDisplayBoardMode={isDisplayBoardMode}
        >
            <div style={{ minHeight: '380px' }} className="w-full h-full flex-1 relative flex items-start justify-center pt-2">
                {activeTab === 'chart' ? renderChart() : renderTable()}
            </div>
        </ChartBoardShell>
    );
};

export default MonthlyChartBoard;
