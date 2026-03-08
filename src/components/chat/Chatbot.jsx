import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, BarChart2, Loader2 } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

// Backend port is typically proxy-passed by Vite (see vite.config.js)
const API_URL = '/api/rag-chat';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Chatbot({ currentUser, onChartUpdate }) {
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: 'bot',
            text: `안녕하세요, ${currentUser?.name || '사용자'}님! 업무 기록 데이터 어시스턴트 '하나'입니다. 어떤 데이터가 궁금하신가요? (예: "이번 주 R&D 센터 업무 시간 차트로 그려줘")`,
            timestamp: new Date().toISOString()
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = {
            id: Date.now(),
            sender: 'user',
            text: input,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        try {
            // RAG 기반 자체 백엔드 API 호출
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: messages, // History
                    query: input        // Current Query
                }),
            });

            if (!response.ok) {
                throw new Error('RAG 서버 응답 오류');
            }

            const data = await response.json();

            const botResponse = {
                id: Date.now() + 1,
                sender: 'bot',
                text: data.text,
                timestamp: new Date().toISOString(),
                hasChart: data.hasChart,
                chartData: data.chartData,
            };
            // If chart data is present, notify parent to render preview
            if (data.hasChart && data.chartData) {
                onChartUpdate && onChartUpdate(data.chartData);
            }

            setMessages(prev => [...prev, botResponse]);
        } catch (e) {
            console.error('API Error:', e);
            const isChartRequest = input.includes('차트') || input.includes('시각화') || input.includes('보여줘');
            const botResponse = {
                id: Date.now() + 1,
                sender: 'bot',
                text: isChartRequest
                    ? "[서버 연결 오류] 백엔드 RAG 엔진 통신에 실패했습니다. 올바른 데이터를 불러올 수 없습니다."
                    : "[서버 오프라인 상태] 업무기록 서버 혹은 Ollama가 응답하지 않습니다.",
                timestamp: new Date().toISOString(),
                hasChart: false,
                chartData: null,
            };
            setMessages(prev => [...prev, botResponse]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const renderChart = (data) => {
        if (!data) return null;
        return (
            <div className="h-64 mt-4 bg-white/5 p-4 rounded-xl border border-white/10">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
                        <XAxis dataKey="name" stroke="#aaa" fontSize={11} tickMargin={8} />
                        <YAxis stroke="#aaa" fontSize={11} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#25282B', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="time" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[#121417]">
            {/* ─── Header ─── */}
            <div className="flex-none p-6 bg-[#1A1D21] border-b border-white/5 shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-xl">
                        <Bot size={28} className="text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">하나(HANA)</h1>
                        <p className="text-sm text-gray-400 font-medium tracking-wide">R&D Center의 AI 어시스트</p>
                    </div>
                </div>
            </div>

            {/* ─── Message List ─── */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gradient-to-b from-[#121417] to-[#16191d]">
                {messages.map((msg) => {
                    const isUser = msg.sender === 'user';
                    return (
                        <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                            <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-4 items-start`}>

                                {/* Avatar */}
                                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${isUser ? 'bg-gradient-to-br from-kh-green to-teal-500' : 'bg-gradient-to-br from-blue-600 to-indigo-600'}`}>
                                    {isUser ? <User size={20} className="text-white" /> : <Bot size={20} className="text-white" />}
                                </div>

                                {/* Bubble Container */}
                                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-2 mb-1.5 px-1">
                                        <span className="text-sm font-semibold text-gray-300">
                                            {isUser ? currentUser?.name : 'AI 하나(HANA)'}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    {/* Bubble */}
                                    <div className={`p-4 rounded-2xl shadow-md ${isUser
                                        ? 'bg-kh-green/20 border border-kh-green/30 text-white rounded-tr-sm'
                                        : 'bg-[#1A1D21] border border-white/10 text-gray-200 rounded-tl-sm'
                                        }`}>
                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                                        {/* Chart rendering moved to modal preview area */}
                                        {msg.hasChart && <span className="text-sm text-gray-400">(차트가 오른쪽에 표시됩니다)</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Typing Indicator */}
                {isTyping && (
                    <div className="flex justify-start w-full animate-in fade-in duration-300">
                        <div className="flex max-w-[85%] flex-row gap-4 items-start">
                            <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br from-blue-600 to-indigo-600">
                                <Bot size={20} className="text-white" />
                            </div>
                            <div className="flex flex-col items-start">
                                <div className="p-4 rounded-2xl shadow-md bg-[#1A1D21] border border-white/10 rounded-tl-sm text-gray-400 flex items-center gap-2">
                                    <Loader2 size={18} className="animate-spin text-blue-400" />
                                    <span>데이터를 분석하고 있습니다...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* ─── Input Area ─── */}
            <div className="flex-none p-4 bg-[#1A1D21] border-t border-white/5 relative z-10">
                <div className="max-w-5xl mx-auto relative group">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="업무 기록에 대해 궁금한 점을 질문하거나 시각화를 요청해 보세요... (Enter 키로 전송, Shift+Enter로 줄바꿈)"
                        className="w-full bg-[#121417] text-white border border-white/10 rounded-2xl py-4 pl-5 pr-16 resize-none focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all custom-scrollbar overflow-hidden shadow-inner font-medium placeholder:text-gray-500"
                        rows={1}
                        style={{ minHeight: '60px', maxHeight: '150px' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className={`absolute right-3 bottom-0 top-0 my-auto h-[44px] w-[44px] flex items-center justify-center rounded-xl transition-all duration-300
              ${!input.trim() || isTyping
                                ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-500 hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/20'
                            }`}
                    >
                        <Send size={20} className={(!input.trim() || isTyping) ? '' : 'translate-x-0.5'} />
                    </button>
                </div>
            </div>
        </div>
    );
}
