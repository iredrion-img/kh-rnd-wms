import React, { useState, useEffect, useRef, useCallback } from 'react';
import Chatbot from './Chatbot';
import ChartPreview from './ChartPreview';
import { X, PanelRightClose, PanelRight, GripHorizontal, GripVertical } from 'lucide-react';

/**
 * ChatModal — Draggable, Resizable floating window with toggleable chart preview
 */

const MIN_WIDTH = 420;
const MIN_HEIGHT = 350;
const DEFAULT_WIDTH = 900;
const DEFAULT_HEIGHT_RATIO = 0.78; // 78vh

export default function ChatModal({ isOpen, onClose, currentUser }) {
    const [chartData, setChartData] = useState(null);
    const [isChartOpen, setIsChartOpen] = useState(true);

    // ── Position & Size ──
    const [pos, setPos] = useState({ x: -1, y: -1 }); // -1 = not initialised
    const [size, setSize] = useState({ w: DEFAULT_WIDTH, h: 0 });

    // ── Split ratio (0–1, fraction for chat area) ──
    const [splitRatio, setSplitRatio] = useState(0.65);
    const [isSplitting, setIsSplitting] = useState(false);

    // Refs for drag / resize / split
    const dragRef = useRef(null);   // { startX, startY, origX, origY }
    const resizeRef = useRef(null); // { startX, startY, origW, origH }
    const splitRef = useRef(null);  // { startX, origRatio }
    const containerRef = useRef(null);

    // ── Centre on first open ──
    useEffect(() => {
        if (isOpen && pos.x === -1) {
            const w = Math.min(DEFAULT_WIDTH, window.innerWidth - 40);
            const h = Math.round(window.innerHeight * DEFAULT_HEIGHT_RATIO);
            setSize({ w, h });
            setPos({
                x: Math.round((window.innerWidth - w) / 2),
                y: Math.round((window.innerHeight - h) / 2),
            });
        }
    }, [isOpen]);

    // ── ESC to close ──
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // ── Drag handlers ──
    const onDragStart = useCallback((e) => {
        // Ignore if clicking a button inside header
        if (e.target.closest('button')) return;
        e.preventDefault();
        dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
        document.body.style.userSelect = 'none';

        const onMove = (ev) => {
            if (!dragRef.current) return;
            const dx = ev.clientX - dragRef.current.startX;
            const dy = ev.clientY - dragRef.current.startY;
            let nx = dragRef.current.origX + dx;
            let ny = dragRef.current.origY + dy;
            // Clamp so title bar stays visible
            nx = Math.max(-size.w + 120, Math.min(window.innerWidth - 120, nx));
            ny = Math.max(0, Math.min(window.innerHeight - 40, ny));
            setPos({ x: nx, y: ny });
        };
        const onUp = () => {
            dragRef.current = null;
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [pos, size.w]);

    // ── Resize handlers ──
    const onResizeStart = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: size.w, origH: size.h };
        document.body.style.userSelect = 'none';

        const onMove = (ev) => {
            if (!resizeRef.current) return;
            const dx = ev.clientX - resizeRef.current.startX;
            const dy = ev.clientY - resizeRef.current.startY;
            setSize({
                w: Math.max(MIN_WIDTH, resizeRef.current.origW + dx),
                h: Math.max(MIN_HEIGHT, resizeRef.current.origH + dy),
            });
        };
        const onUp = () => {
            resizeRef.current = null;
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [size]);

    // ── Split handle handlers ──
    const onSplitStart = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        splitRef.current = { startX: e.clientX, origRatio: splitRatio };
        setIsSplitting(true);
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';

        const onMove = (ev) => {
            if (!splitRef.current || !containerRef.current) return;
            const containerWidth = containerRef.current.offsetWidth;
            const dx = ev.clientX - splitRef.current.startX;
            const deltaRatio = dx / containerWidth;
            let newRatio = splitRef.current.origRatio + deltaRatio;
            // Clamp between 30% and 85%
            newRatio = Math.max(0.30, Math.min(0.85, newRatio));
            setSplitRatio(newRatio);
        };
        const onUp = () => {
            splitRef.current = null;
            setIsSplitting(false);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [splitRatio]);

    // ── Chart data handler ──
    const handleChartUpdate = (data) => {
        setChartData(data);
        if (!isChartOpen) setIsChartOpen(true); // Auto-open chart panel
    };

    if (!isOpen || pos.x === -1) return null;

    return (
        <div
            ref={containerRef}
            className="fixed z-50 flex flex-col rounded-xl shadow-2xl overflow-hidden border border-white/10"
            style={{
                left: pos.x,
                top: pos.y,
                width: size.w,
                height: size.h,
                background: 'rgba(18, 20, 23, 0.95)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
            }}
        >
            {/* ─── Title Bar (Drag Handle) ─── */}
            <div
                className="flex-none flex items-center justify-between px-4 py-2.5 bg-[#1A1D21]/80 border-b border-white/5 cursor-move select-none"
                onMouseDown={onDragStart}
            >
                <div className="flex items-center gap-2">
                    {/* Traffic-light style dots */}
                    <div className="flex gap-1.5 mr-2">
                        <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors" title="닫기" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-50" />
                        <div className="w-3 h-3 rounded-full bg-green-500 opacity-50" />
                    </div>
                    <span className="text-sm font-semibold text-white/80 tracking-tight">하나(HANA) — AI 어시스턴트</span>
                </div>

                <div className="flex items-center gap-1">
                    {/* Chart panel toggle */}
                    <button
                        onClick={() => setIsChartOpen(!isChartOpen)}
                        className={`p-1.5 rounded-lg transition-all duration-200 ${isChartOpen ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                        title={isChartOpen ? '차트 미리보기 닫기' : '차트 미리보기 열기'}
                    >
                        {isChartOpen ? <PanelRightClose size={16} /> : <PanelRight size={16} />}
                    </button>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                        title="닫기 (ESC)"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* ─── Content Area ─── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Chatbot area */}
                <div
                    className="min-w-0 overflow-hidden"
                    style={{
                        width: isChartOpen ? `${splitRatio * 100}%` : '100%',
                        transition: isSplitting ? 'none' : 'width 0.3s ease',
                    }}
                >
                    <Chatbot currentUser={currentUser} onChartUpdate={handleChartUpdate} />
                </div>

                {/* ─── Split Handle ─── */}
                {isChartOpen && (
                    <div
                        className="flex-none flex items-center justify-center cursor-col-resize group hover:bg-white/5 active:bg-blue-500/10 transition-colors z-10 relative"
                        style={{ width: '8px' }}
                        onMouseDown={onSplitStart}
                        title="패널 비율 조절"
                    >
                        {/* Visual grip indicator */}
                        <div className={`w-1 rounded-full transition-all duration-200 ${isSplitting ? 'h-12 bg-blue-400' : 'h-8 bg-white/15 group-hover:bg-white/30 group-hover:h-12'}`} />
                    </div>
                )}

                {/* Chart preview panel */}
                <div
                    className={`overflow-hidden bg-gradient-to-b from-[#1A1D21] to-[#16191D] ${isChartOpen ? 'p-4 overflow-y-auto' : 'p-0'}`}
                    style={{
                        width: isChartOpen ? `${(1 - splitRatio) * 100}%` : '0px',
                        transition: isSplitting ? 'none' : 'width 0.3s ease, padding 0.3s ease',
                    }}
                >
                    {isChartOpen && (
                        <div className="animate-in fade-in duration-300">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">차트 미리보기</h3>
                            </div>
                            {chartData ? (
                                <ChartPreview data={chartData} />
                            ) : (
                                <div className="text-gray-500 text-sm text-center mt-16 px-4 leading-relaxed">
                                    <div className="mb-2 text-2xl">📊</div>
                                    시각화 요청 시<br />차트가 이곳에<br />표시됩니다.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Resize handle (bottom-right corner) ─── */}
            <div
                className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize group z-10 flex items-center justify-center"
                onMouseDown={onResizeStart}
                title="크기 조절"
            >
                <GripHorizontal size={12} className="text-gray-600 group-hover:text-gray-400 transition-colors rotate-[-45deg]" />
            </div>
        </div>
    );
}
