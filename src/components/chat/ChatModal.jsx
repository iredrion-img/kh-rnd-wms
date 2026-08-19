import React, { useState, useEffect, useRef, useCallback } from 'react';
import Chatbot from './Chatbot';
import { X, GripHorizontal } from 'lucide-react';

/**
 * ChatModal — Draggable, resizable floating chat window.
 * Chat-only: charts render inline inside the conversation (no side preview panel).
 */

const MIN_WIDTH = 380;
const MIN_HEIGHT = 360;
const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT_RATIO = 0.80; // 80vh

export default function ChatModal({ isOpen, onClose, currentUser }) {
    const [pos, setPos] = useState({ x: -1, y: -1 });
    const [size, setSize] = useState({ w: DEFAULT_WIDTH, h: 0 });

    const dragRef = useRef(null);
    const resizeRef = useRef(null);
    const containerRef = useRef(null);

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

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const onDragStart = useCallback((e) => {
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
            {/* Title Bar (drag handle) */}
            <div
                className="flex-none flex items-center justify-between px-4 py-2.5 bg-[#1A1D21]/80 border-b border-white/5 cursor-move select-none"
                onMouseDown={onDragStart}
            >
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5 mr-2">
                        <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors" title="close" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-50" />
                        <div className="w-3 h-3 rounded-full bg-green-500 opacity-50" />
                    </div>
                    <span className="text-sm font-semibold text-white/80 tracking-tight">하나(HANA) — AI 어시스턴트</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                    title="닫기 (ESC)"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Content: chat only, charts render inline */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <Chatbot currentUser={currentUser} />
            </div>

            {/* Resize handle (bottom-right) */}
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
