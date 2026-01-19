import React from 'react';
import { Construction } from 'lucide-react';

const WeeklyMeeting = () => {
    return (
        <div className="p-8 h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white/5 p-12 rounded-3xl border border-white/10 flex flex-col items-center max-w-lg w-full shadow-2xl backdrop-blur-sm">
                <div className="w-24 h-24 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center mb-8 shadow-lg shadow-primary/30 animate-bounce-slow">
                    <Construction className="text-white w-12 h-12" />
                </div>

                <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Coming Soon</h2>
                <p className="text-gray-400 text-center mb-8 text-lg">
                    주간공정회의 기능은 현재 개발 중입니다.<br />
                    더 나은 기능을 위해 준비하고 있습니다.
                </p>

                <div className="w-full bg-white/5 rounded-full h-2 mb-4 overflow-hidden">
                    <div className="bg-gradient-to-r from-primary to-purple-500 h-full rounded-full w-2/3 animate-pulse"></div>
                </div>
                <p className="text-xs text-primary font-mono tracking-widest uppercase">Under Construction</p>
            </div>
        </div>
    );
};

export default WeeklyMeeting;
