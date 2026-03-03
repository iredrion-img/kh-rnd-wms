import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

/**
 * ChartPreview
 * Props:
 *   - data: array of { name, time } objects
 */
export default function ChartPreview({ data }) {
    if (!data || data.length === 0) return null;
    return (
        <div className="h-64 bg-white/5 p-4 rounded-xl border border-white/10">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
                    <XAxis dataKey="name" stroke="#aaa" fontSize={11} tickMargin={8} />
                    <YAxis stroke="#aaa" fontSize={11} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#25282B', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="time" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
