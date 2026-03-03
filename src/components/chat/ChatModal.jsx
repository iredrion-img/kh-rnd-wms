import React, { useState, useEffect } from 'react';
import Chatbot from './Chatbot';
import ChartPreview from './ChartPreview';

/**
 * ChatModal
 * Props:
 *   - isOpen: boolean to control visibility
 *   - onClose: function to close the modal
 *   - currentUser: user object passed to Chatbot
 */
export default function ChatModal({ isOpen, onClose, currentUser }) {
    const [chartData, setChartData] = useState(null);

    // Close on Escape key
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    if (!isOpen) return null;

    const handleChartUpdate = (data) => {
        setChartData(data);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50" onClick={onClose}>
            <div className="bg-[#121417] backdrop-filter backdrop-blur-xl bg-opacity-90 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Left side: Chatbot */}
                <div className="flex-1 border-r border-white/10 overflow-y-auto">
                    <Chatbot currentUser={currentUser} onChartUpdate={handleChartUpdate} />
                </div>
                {/* Right side: Chart preview */}
                <div className="w-1/3 bg-gradient-to-b from-[#1A1D21] to-[#16191D] p-4 overflow-y-auto">
                    {chartData ? (
                        <ChartPreview data={chartData} />
                    ) : (
                        <div className="text-gray-400 text-center mt-20">차트 미리보기가 여기 표시됩니다.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
