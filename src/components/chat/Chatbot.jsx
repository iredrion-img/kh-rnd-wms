import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Sparkles } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, Cell, LabelList, PieChart, Pie
} from 'recharts';

// 우리 그래프-RAG 백엔드 (CORS 허용). 배포 시 window.__HANA_API__ 로 주소 교체 가능.
const API_BASE = (typeof window !== 'undefined' && window.__HANA_API__) || 'http://localhost:8000';
const ASK_URL = API_BASE + '/ask';

// WMS 분야 고유색
const FIELD_COLOR = {
    'AI': '#a78bfa', 'BIM': '#60a5fa', 'Smart R&D': '#4ade80',
    'Digital Technology': '#fb923c', '기타': '#9ca3af', '기타 (Etc)': '#9ca3af',
};
const PERSON_A = '#4ade80', PERSON_B = '#22d3ee';
const STARTER = ['팀별 AI 투입시간', '분야별 비중', '월별 투입 추이', '2분기 팀별 분포', '직원별 투입시간'];

// 색 → 그라데이션 정의
const GRADS = {
    '#a78bfa': 'gAI', '#60a5fa': 'gBIM', '#4ade80': 'gSR', '#fb923c': 'gDT',
    '#9ca3af': 'gEtc', '#22d3ee': 'gPB', '#94a3b8': 'gGray',
};
function gradFill(hex) { return GRADS[hex] ? `url(#${GRADS[hex]})` : hex; }
function ChartDefs() {
    return (
        <defs>
            {Object.entries(GRADS).map(([hex, id]) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={hex} stopOpacity={0.98} />
                    <stop offset="100%" stopColor={hex} stopOpacity={0.5} />
                </linearGradient>
            ))}
        </defs>
    );
}
function colorFor(label, fallback) {
    if (label) for (const k of Object.keys(FIELD_COLOR)) if (label.startsWith(k)) return FIELD_COLOR[k];
    return fallback || '#60a5fa';
}

// ── 차트 렌더러: 우리 /ask 응답의 chart 스펙을 recharts로 (애니메이션 기본 ON) ──
function ChatChart({ chart }) {
    if (!chart || !chart.kind) return null;

    if (chart.kind === 'donut') {
        const data = (chart.items || []).map(it => ({ name: it.l, value: it.v, c: FIELD_COLOR[it.c] || it.c || colorFor(it.l) }));
        const total = data.reduce((s, d) => s + d.value, 0) || 1;
        return (
            <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer>
                    <PieChart>
                        <ChartDefs />
                        <Pie data={data} dataKey="value" nameKey="name" cx="42%" cy="50%"
                            innerRadius={52} outerRadius={84} paddingAngle={2}
                            animationDuration={900} animationBegin={100}
                            label={({ name, value }) => `${value}h`}>
                            {data.map((d, i) => <Cell key={i} fill={gradFill(d.c)} stroke="#1A1D21" />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [`${v}h (${(v / total * 100).toFixed(0)}%)`, n]}
                            contentStyle={{ backgroundColor: '#25282B', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
                        <Legend verticalAlign="middle" align="right" layout="vertical"
                            formatter={(val) => <span style={{ color: '#cbd5e1', fontSize: 12 }}>{val}</span>} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (chart.kind === 'compare') {
        const a = chart.a || 'A', b = chart.b || 'B';
        const data = (chart.rows || []).map(r => ({ name: r.label, [a]: r.va, [b]: r.vb }));
        return (
            <div style={{ width: '100%', height: 270 }}>
                <ResponsiveContainer>
                    <BarChart data={data} margin={{ top: 24, right: 10, left: -10, bottom: 0 }} barGap={4}>
                        <ChartDefs />
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="name" stroke="#9aa" fontSize={11} tickMargin={8} />
                        <YAxis stroke="#9aa" fontSize={11} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                            contentStyle={{ backgroundColor: '#25282B', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
                        <Legend formatter={(val) => <span style={{ color: '#cbd5e1', fontSize: 12 }}>{val}</span>} />
                        <Bar dataKey={a} fill={gradFill(PERSON_A)} radius={[4, 4, 0, 0]} animationDuration={800}>
                            <LabelList dataKey={a} position="top" fill="#cbd5e1" fontSize={10} formatter={(v) => `${v}h`} />
                        </Bar>
                        <Bar dataKey={b} fill={gradFill(PERSON_B)} radius={[4, 4, 0, 0]} animationDuration={800} animationBegin={150}>
                            <LabelList dataKey={b} position="top" fill="#cbd5e1" fontSize={10} formatter={(v) => `${v}h`} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }

    // 기본: 세로 막대 (분야 색 + 값(%) 라벨 + 애니메이션)
    const items = chart.items || [];
    const total = items.reduce((s, it) => s + it.v, 0) || 1;
    const data = items.map(it => {
        const c = FIELD_COLOR[it.c] || it.c || colorFor(it.l);
        const pct = Math.round(it.v / total * 100);
        // 구성비 차트만 (%) 표기, 순위·추이형(chart.pct===false)은 시간(h)만
        const label = chart.pct === false ? `${it.v}h` : `${it.v} (${pct}%)`;
        return { name: it.l, value: it.v, c, label };
    });
    return (
        <div style={{ width: '100%', height: Math.max(250, 60 + data.length * 8) }}>
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 28, right: 10, left: -10, bottom: 0 }}>
                    <ChartDefs />
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" stroke="#9aa" fontSize={11} tickMargin={8} interval={0} />
                    <YAxis stroke="#9aa" fontSize={11} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        contentStyle={{ backgroundColor: '#25282B', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={900}>
                        {data.map((d, i) => <Cell key={i} fill={gradFill(d.c)} />)}
                        <LabelList dataKey="label" position="top" fill="#e5e7eb" fontSize={11} fontWeight={600} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export default function Chatbot({ currentUser }) {
    const [messages, setMessages] = useState([{
        id: 1, sender: 'bot',
        text: `안녕하세요, ${currentUser?.name || '사용자'}님! 업무 기록 데이터 어시스턴트 '하나(HANA)'입니다. 어떤 데이터가 궁금하신가요? (예: "팀별 AI 투입시간", "분야별 비중")`,
        timestamp: new Date().toISOString(), follow: STARTER,
    }]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [model, setModel] = useState('qwen2.5:7b');
    const [thinking, setThinking] = useState(true);
    const endRef = useRef(null);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

    const send = async (textArg) => {
        const text = (typeof textArg === 'string' ? textArg : input).trim();
        if (!text || isTyping) return;
        setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text, timestamp: new Date().toISOString() }]);
        setInput('');
        setIsTyping(true);
        try {
            const res = await fetch(ASK_URL, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: text, model, thinking: thinking ? 'auto' : 'off' }),
            });
            if (!res.ok) throw new Error('http');
            const data = await res.json();
            setMessages(prev => [...prev, {
                id: Date.now() + 1, sender: 'bot', text: data.answer || '(빈 응답)',
                chart: data.chart, follow: data.follow, sources: data.sources,
                llmUsed: data.llm_used, timestamp: new Date().toISOString(),
            }]);
        } catch (e) {
            setMessages(prev => [...prev, {
                id: Date.now() + 1, sender: 'bot',
                text: '백엔드(localhost:8000)에 연결하지 못했습니다. 어시스턴트 서버가 켜져 있는지 확인해 주세요.',
                timestamp: new Date().toISOString(),
            }]);
        } finally { setIsTyping(false); }
    };

    const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

    return (
        <div className="flex flex-col h-full bg-[#121417]">
            {/* Header */}
            <div className="flex-none p-6 bg-[#1A1D21] border-b border-white/5 shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-xl"><Bot size={28} className="text-blue-400" /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">하나(HANA)</h1>
                        <p className="text-sm text-gray-400 font-medium tracking-wide">R&D Center의 AI 어시스트</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gradient-to-b from-[#121417] to-[#16191d]">
                {messages.map((msg) => {
                    const isUser = msg.sender === 'user';
                    return (
                        <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                            <div className={`flex max-w-[88%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-4 items-start`}>
                                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${isUser ? 'bg-gradient-to-br from-kh-green to-teal-500' : 'bg-gradient-to-br from-blue-600 to-indigo-600'}`}>
                                    {isUser ? <User size={20} className="text-white" /> : <Bot size={20} className="text-white" />}
                                </div>
                                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} min-w-0`}>
                                    <div className="flex items-center gap-2 mb-1.5 px-1">
                                        <span className="text-sm font-semibold text-gray-300">{isUser ? currentUser?.name : 'AI 하나(HANA)'}</span>
                                        <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        {!isUser && msg.llmUsed && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300" title="복잡한 질문이라 LLM 추론을 사용했습니다">🧠 추론</span>
                                        )}
                                    </div>
                                    <div className={`p-4 rounded-2xl shadow-md w-full ${isUser ? 'bg-kh-green/20 border border-kh-green/30 text-white rounded-tr-sm' : 'bg-[#1A1D21] border border-white/10 text-gray-200 rounded-tl-sm'}`}>
                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                        {msg.chart && (
                                            <div className="mt-3 bg-white/5 rounded-xl border border-white/10 p-2">
                                                <ChatChart chart={msg.chart} />
                                            </div>
                                        )}
                                        {msg.sources && msg.sources.length > 0 && (
                                            <p className="mt-2 text-[11px] text-gray-500">출처: {msg.sources.join(', ')}</p>
                                        )}
                                    </div>
                                    {!isUser && msg.follow && msg.follow.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2 px-1">
                                            {msg.follow.slice(0, 5).map((c, i) => (
                                                <button key={i} onClick={() => send(c)}
                                                    className="text-xs px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition-colors">
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {isTyping && (
                    <div className="flex justify-start w-full animate-in fade-in duration-300">
                        <div className="flex gap-4 items-start">
                            <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600"><Bot size={20} className="text-white" /></div>
                            <div className="p-4 rounded-2xl bg-[#1A1D21] border border-white/10 text-gray-400 flex items-center gap-2">
                                <Loader2 size={18} className="animate-spin text-blue-400" /><span>데이터를 분석하고 있습니다...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            {/* Input + options */}
            <div className="flex-none p-4 bg-[#1A1D21] border-t border-white/5 relative z-10">
                <div className="flex items-center gap-3 mb-2 px-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Sparkles size={13} className="text-purple-400" /> 답변 모델</span>
                    <select value={model} onChange={(e) => setModel(e.target.value)}
                        className="bg-[#121417] border border-white/10 rounded px-2 py-1 text-gray-200 focus:outline-none">
                        <option>qwen2.5:7b</option><option>qwen2.5:3b</option><option>qwen2.5:14b</option>
                    </select>
                    <button onClick={() => setThinking(t => !t)}
                        title={thinking ? 'AUTO: 단순 질문은 즉시 계산, 복잡한 질문만 자동으로 LLM 추론' : 'OFF: 빠른 모드 — LLM 추론을 생략하고 계산·검색 결과만'}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors ${thinking ? 'border-purple-500/40 bg-purple-500/15 text-purple-300' : 'border-white/10 text-gray-500'}`}>
                        Thinking {thinking ? 'AUTO' : 'OFF'}
                    </button>
                </div>
                <div className="relative group">
                    <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
                        placeholder="업무 기록에 대해 궁금한 점을 질문하거나 시각화를 요청해 보세요... (Enter 전송, Shift+Enter 줄바꿈)"
                        className="w-full bg-[#121417] text-white border border-white/10 rounded-2xl py-4 pl-5 pr-16 resize-none focus:outline-none focus:border-blue-500/50 transition-all overflow-hidden font-medium placeholder:text-gray-500"
                        rows={1} style={{ minHeight: '60px', maxHeight: '150px' }} />
                    <button onClick={() => send()} disabled={!input.trim() || isTyping}
                        className={`absolute right-3 bottom-0 top-0 my-auto h-[44px] w-[44px] flex items-center justify-center rounded-xl transition-all ${!input.trim() || isTyping ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95'}`}>
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
