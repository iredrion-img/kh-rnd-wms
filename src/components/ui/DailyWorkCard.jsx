import React from 'react';
import { Plus, Minus, Clock } from 'lucide-react';

const DailyWorkCard = ({ category, hours, onChange, onIncrease, onDecrease, colorClass = "cat-ai", icon: Icon }) => {
    // Static mapping for Tailwind classes (enables literal strings for build-time scanning)
    const colorMap = {
        'cat-ai': { bg: 'bg-cat-ai', text: 'text-cat-ai', shadow: 'shadow-cat-ai/30' },
        'cat-bim': { bg: 'bg-cat-bim', text: 'text-cat-bim', shadow: 'shadow-cat-bim/30' },
        'cat-smart': { bg: 'bg-cat-smart', text: 'text-cat-smart', shadow: 'shadow-cat-smart/30' },
        'cat-dt': { bg: 'bg-cat-dt', text: 'text-cat-dt', shadow: 'shadow-cat-dt/30' },
        'cat-etc': { bg: 'bg-cat-etc', text: 'text-cat-etc', shadow: 'shadow-cat-etc/30' }
    };

    const activeColors = colorMap[colorClass.replace('bg-', '')] || colorMap['cat-etc'];

    return (
        <div className={`bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-neutral/10 hover:shadow-md transition-all duration-300 flex flex-col items-center justify-between h-full min-h-[160px] relative group overflow-hidden`}>
            {/* Background Decoration */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-5 ${activeColors.bg}`}></div>

            {/* Header */}
            <div className="w-full text-center z-10 flex flex-col items-center">
                {Icon && <Icon size={24} className={`mb-2 ${activeColors.text}`} />}
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

                <div className="text-center w-24 flex items-center justify-center">
                    <input
                        type="number"
                        min="0"
                        max="24"
                        value={hours || ''}
                        placeholder="0"
                        onChange={(e) => {
                            let val = parseInt(e.target.value);
                            if (isNaN(val)) val = 0;
                            onChange && onChange(val);
                        }}
                        className={`w-16 text-center text-4xl font-black bg-transparent outline-none ${hours > 0 ? activeColors.text : 'text-gray-300'} placeholder:text-gray-200 hide-arrows`}
                    />
                    <span className="text-sm text-gray-400 font-medium">h</span>
                </div>

                <button
                    onClick={onIncrease}
                    className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-95
                        ${activeColors.bg} hover:opacity-90 ${activeColors.shadow}`}
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
                    className={`h-full transition-all duration-500 ${activeColors.bg}`}
                    style={{ width: `${Math.min((hours / 8) * 100, 100)}%` }}
                ></div>
            </div>
        </div>
    );
};

export default DailyWorkCard;
