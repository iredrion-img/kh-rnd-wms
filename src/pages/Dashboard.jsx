import React, { useState, useEffect, useMemo } from 'react';
import { Users, Clock, TrendingUp, ChevronLeft, ChevronRight, Percent, BarChart2 } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine, LabelList } from 'recharts';
import { format, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears, startOfWeek, endOfWeek, parseISO, isSameWeek, isSameMonth, isSameYear, addDays, getDay, getWeekOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';

const CATEGORIES = ['AI', 'BIM', 'Digital Technology', 'Smart R&D', 'Etc'];
const CATEGORY_COLORS = {
    'AI': '#8CC63F', // kh-lime
    'BIM': '#009245', // kh-green
    'Smart R&D': '#006837', // Deep Green
    'Digital Technology': '#546E7A', // Slate Blue
    'Etc': '#9E9E9E' // Neutral Grey
};

// ... (getCategory function remains same) ...

return (
    <div className="h-full w-full flex flex-col bg-kh-bg-main overflow-hidden p-6 gap-4">
        {/* Header Area: 5% Height */}
        <header className="flex justify-between items-center shrink-0 h-[5%]">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-kh-text-main fluid-text">R&D Center Dashboard</h2>
                <p className="text-sm text-gray-400 font-medium">{formatDateLabel()}</p>
            </div>

            <div className="flex items-center gap-4">
                {/* Time Range Selector */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                    {['weekly', 'monthly', 'yearly'].map((range) => (
                        <button
                            key={range}
                            onClick={() => {
                                setTimeRange(range);
                                if (range !== 'monthly') setViewMode('hours');
                            }}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${timeRange === range
                                ? 'bg-white text-kh-green shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {range === 'weekly' ? 'WEEK' : range === 'monthly' ? 'MONTH' : 'YEAR'}
                        </button>
                    ))}
                </div>

                {/* Check Overtime Button */}
                <button
                    onClick={() => setShowOvertimeModal(true)}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 transition-colors flex items-center gap-2"
                >
                    <Users size={16} />
                    Overtime
                </button>
            </div>
        </header>

        {/* Bento Grid: 95% Height */}
        <main className="flex-1 grid grid-cols-12 grid-rows-12 gap-4 min-h-0">

            {/* KPI Cards: Row 1-2 (approx 16%) */}
            <div className="col-span-12 row-span-2 grid grid-cols-3 gap-4">
                {processedData.stats.map((stat, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">{stat.title}</p>
                            <p className="text-3xl font-extrabold text-kh-text-main">{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-xl bg-gray-50 ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Chart (Area/Bar): Col 1-8, Row 3-8 (approx 50%) */}
            <div className="col-span-8 row-span-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm relative flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-kh-text-main">Time Trends</h3>
                    {/* Monthly View Toggles */}
                    {timeRange === 'monthly' && (
                        <div className="flex bg-gray-50 rounded-lg p-1 text-xs font-bold">
                            <button onClick={() => setViewMode('hours')} className={`px-2 py-1 rounded ${viewMode === 'hours' ? 'bg-white shadow' : 'text-gray-400'}`}>Hrs</button>
                            <button onClick={() => setViewMode('percent')} className={`px-2 py-1 rounded ${viewMode === 'percent' ? 'bg-white shadow' : 'text-gray-400'}`}>%</button>
                        </div>
                    )}
                </div>
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        {timeRange === 'weekly' ? (
                            <BarChart data={processedData.areaChartData.filter(d => { const day = getDay(new Date(d.date || d.key)); return day >= 1 && day <= 5; })} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="displayDate" stroke="#9CA3AF" fontSize={11} tickMargin={5} />
                                <YAxis stroke="#9CA3AF" fontSize={11} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#F9FAFB' }} />
                                {processedData.CATEGORIES.map((cat, i) => (
                                    <Bar key={cat} dataKey={cat} stackId="a" fill={processedData.CATEGORY_COLORS[cat]} radius={i === processedData.CATEGORIES.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                                ))}
                            </BarChart>
                        ) : (
                            <AreaChart data={processedData.areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    {processedData.CATEGORIES.map((cat, i) => (
                                        <linearGradient key={cat} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={processedData.CATEGORY_COLORS[cat]} stopOpacity={0.8} />
                                            <stop offset="95%" stopColor={processedData.CATEGORY_COLORS[cat]} stopOpacity={0} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <XAxis dataKey="displayDate" stroke="#9CA3AF" fontSize={11} tickMargin={5} />
                                <YAxis stroke="#9CA3AF" fontSize={11} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                {processedData.CATEGORIES.map((cat, i) => (
                                    <Area key={cat} type="monotone" dataKey={cat} stackId="1" stroke={processedData.CATEGORY_COLORS[cat]} fill={`url(#grad${i})`} fillOpacity={0.6} />
                                ))}
                            </AreaChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Composition Chart: Col 9-12, Row 3-8 (approx 50%) */}
            <div className="col-span-4 row-span-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col">
                <h3 className="text-lg font-bold text-kh-text-main mb-4">Work Composition</h3>
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={processedData.project} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                            <XAxis type="number" stroke="#9CA3AF" fontSize={11} />
                            <YAxis dataKey="name" type="category" hide />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#F9FAFB' }} />
                            <Bar dataKey="billable" stackId="a" radius={[0, 4, 4, 0]} barSize={32}>
                                {processedData.project.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={processedData.CATEGORY_COLORS[entry.name]} />
                                ))}
                                <LabelList dataKey="name" position="insideRight" style={{ fill: '#fff', fontSize: '11px', fontWeight: 'bold' }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Team Table: Row 9-12 (approx 33%) */}
            <div className="col-span-12 row-span-4 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                    <h3 className="text-lg font-bold text-kh-text-main">Category Breakdown (%)</h3>
                    <button onClick={() => { setShowStaffDetail(true); setFilterDept('전체'); }} className="text-sm text-kh-lime font-bold hover:text-green-700 transition-colors">View Details</button>
                </div>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#2e3236] text-white sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-5 py-3 font-semibold text-center border-r border-white/10">Department</th>
                                <th className="px-5 py-3 font-semibold text-center border-r border-white/10 w-[10%]">Total</th>
                                {processedData.CATEGORIES.map(cat => (
                                    <th key={cat} className="px-4 py-3 text-center font-bold border-r border-white/10 last:border-none w-[12%]" style={{ borderBottom: `4px solid ${processedData.CATEGORY_COLORS[cat]}` }}>
                                        {cat}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {processedData.departmentRows && processedData.departmentRows.map(dept => (
                                <tr key={dept.name} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3 font-bold text-gray-700 text-center border-r border-gray-50">{dept.name}</td>
                                    <td className="px-5 py-3 font-bold text-kh-text-main text-center border-r border-gray-50">{dept.hours.toLocaleString()}h</td>
                                    {processedData.CATEGORIES.map(cat => (
                                        <td key={cat} className="px-4 py-3 text-center border-r border-gray-50 last:border-none">
                                            <span
                                                className={`px-2 py-1 rounded-md text-xs font-bold block w-full ${dept[cat] > 0 ? '' : 'text-gray-300'}`}
                                                style={dept[cat] > 0 ? { backgroundColor: `${processedData.CATEGORY_COLORS[cat]}20`, color: processedData.CATEGORY_COLORS[cat] } : {}}
                                            >
                                                {dept[cat] > 0 ? `${dept[cat]}%` : '-'}
                                            </span>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </main>

        {/* Overtime Modal */}
        {showOvertimeModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                {/* ... (Keep existing modal logic, just update styling if needed, but for now just wrapping it) ... */}
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                    <div className="p-6 border-b flex justify-between items-center">
                        <h3 className="text-xl font-bold text-dark">Overtime Analysis</h3>
                        <button onClick={() => setShowOvertimeModal(false)}><X size={24} className="text-gray-400" /></button>
                    </div>
                    <div className="p-6 overflow-y-auto">
                        {/* Reusing existing logic for overtime list... */}
                        {processedData.overtimeList.length > 0 ? (
                            <div className="space-y-6">
                                <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={processedData.overtimeList.slice(0, 5)} layout="vertical"><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={60} /><Bar dataKey="hours" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20} /></BarChart></ResponsiveContainer></div>
                                <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="p-2">Name</th><th className="p-2 text-right">Hours</th></tr></thead><tbody>{processedData.overtimeList.map((item, i) => <tr key={i} className="border-b"><td className="p-2">{item.name}</td><td className="p-2 text-right font-bold text-orange-600">+{item.hours}h</td></tr>)}</tbody></table>
                            </div>
                        ) : <div className="text-center py-10 text-gray-500">No overtime recorded.</div>}
                    </div>
                </div>
            </div>
        )}

        {/* Staff Details Modal */}
        {showStaffDetail && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                    <div className="p-5 border-b flex flex-col gap-4 bg-gray-50">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-dark">Staff Details</h3>
                            <button onClick={() => setShowStaffDetail(false)}><X size={24} className="text-gray-400" /></button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {['전체', ...processedData.departmentRows.map(d => d.name)].map((dept) => (
                                <button key={dept} onClick={() => setFilterDept(dept)} className={`px-4 py-1.5 text-sm font-bold rounded-full transition-all ${filterDept === dept ? 'bg-kh-green text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}>{dept}</button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto p-0">
                        <table className="w-full text-sm text-center">
                            <thead className="bg-[#2e3236] text-white sticky top-0 z-10">
                                <tr>
                                    <th className="p-4 border-r border-white/10">Staff</th>
                                    <th className="p-4 border-r border-white/10">Dept</th>
                                    <th className="p-4 border-r border-white/10">Total</th>
                                    {processedData.CATEGORIES.map(cat => <th key={cat} className="p-4 border-r border-white/10" style={{ borderBottom: `4px solid ${processedData.CATEGORY_COLORS[cat]}` }}>{cat}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {processedData.staff.filter(i => filterDept === '전체' || i.department === filterDept).map((item, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="p-4 border-r border-gray-100 font-medium">{item.name}</td>
                                        <td className="p-4 border-r border-gray-100 text-gray-500">{item.department}</td>
                                        <td className="p-4 border-r border-gray-100 font-bold">{item.hours}h</td>
                                        {processedData.CATEGORIES.map(cat => (
                                            <td key={cat} className="p-4 border-r border-gray-100"><span className={`px-2 py-1 rounded font-bold block ${item[cat] > 0 ? '' : 'text-gray-300'}`} style={item[cat] > 0 ? { backgroundColor: `${processedData.CATEGORY_COLORS[cat]}20`, color: processedData.CATEGORY_COLORS[cat] } : {}}>{item[cat] > 0 ? `${item[cat]}%` : '-'}</span></td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}
    </div>
);
};

export default Dashboard;
