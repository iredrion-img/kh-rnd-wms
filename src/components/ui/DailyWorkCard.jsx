import React from 'react';
import { Plus, Minus, Clock } from 'lucide-react';

const DailyWorkCard = ({ category, hours, onIncrease, onDecrease, colorClass = "bg-primary", icon: Icon }) => {
    return (
        <div className={`bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-neutral/10 hover:shadow-md transition-all duration-300 flex flex-col items-center justify-between h-full min-h-[160px] relative group overflow-hidden`}>
            {/* Background Decoration */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-5 ${colorClass}`}></div>

            {/* Header */}
            <div className="w-full text-center z-10 flex flex-col items-center">
                {Icon && <Icon size={24} className={`mb-2 ${colorClass.replace('bg-', 'text-').replace('500', '600')}`} />}
                <h3 className="text-lg font-bold text-dark">{category}</h3>
                <p className="text-xs text-gray-400 mt-1">업무 시간 기록</p>
            </div>

            {/* Counter Control */}
            <div className="flex items-center justify-center gap-2 sm:gap-6 z-10 w-full flex-wrap">
                <button
                    onClick={onDecrease}
                    className="w-12 h-12 shrink-0 rounded-full border border-neutral/20 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-dark hover:border-dark/30 transition-all active:scale-95"
                >
                    <Minus size={24} />
                </button>

                <div className="text-center w-24">
                    <span className={`text-4xl font-black ${hours > 0 ? colorClass.replace('bg-', 'text-') : 'text-gray-300'}`}>
                        {hours}
                    </span>
                    <span className="text-sm text-gray-400 ml-1 font-medium">h</span>
                </div>

                <button
                    onClick={onIncrease}
                    className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-95
                        ${colorClass} hover:opacity-90 shadow-${colorClass.replace('bg-', '')}/30`}
                >
                    <Plus size={24} />
                </button>
            </div>

            {/* Footer / Status */}
            <div className="w-full flex justify-center z-10">
                <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium 
                    ${hours > 0 ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                    <Clock size={12} />
                    <span>{hours > 0 ? '기록됨' : '미입력'}</span>
                </div>
            </div>

            {/* Progress Bar (Visual Feedback) */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-100">
                <div
                    className={`h-full transition-all duration-500 ${colorClass}`}
                    style={{ width: `${Math.min((hours / 8) * 100, 100)}%` }}
                ></div>
            </div>
        </div>
    );
};

export default DailyWorkCard;
