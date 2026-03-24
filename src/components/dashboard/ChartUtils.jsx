import React from 'react';

export const CATEGORIES = ['AI', 'BIM', 'Smart R&D', 'Digital Technology', 'Etc'];

export const CATEGORY_COLORS = {
    'AI': '#b06ed3ad',
    'BIM': '#2673cac9',
    'Smart R&D': '#1896319a',
    'Digital Technology': '#e6773cb9',
    'Etc': '#9E9E9E'
};

export const GRADIENT_ENDS = {
    'AI': '#b06ed3',
    'BIM': '#2673ca',
    'Smart R&D': '#189631',
    'Digital Technology': '#e6773c',
    'Etc': '#D1D5DB'
};

export const GlassTooltip = ({ active, payload, label, formatter }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.5)', borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.10)', padding: '12px 16px', zIndex: 50
        }}>
            <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px', color: '#25282B' }}>{label}</p>
            {[...payload].filter(e => e.value > 0)
                .sort((a, b) => CATEGORIES.indexOf(a.name) - CATEGORIES.indexOf(b.name))
                .map((e, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '2px 0' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
                        <span style={{ color: '#6B7280' }}>{e.name}</span>
                        <span style={{ fontWeight: 700, marginLeft: 'auto', color: '#25282B' }}>
                            {formatter ? formatter(e.value) : `${e.value}h`}
                        </span>
                    </div>
                ))}
        </div>
    );
};

export const CustomLegend = () => (
    <div className="flex justify-end gap-4 text-[11px] pb-2">
        {CATEGORIES.map(cat => (
            <span key={cat} className="flex items-center gap-1.5 text-gray-500 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                {cat}
            </span>
        ))}
    </div>
);
