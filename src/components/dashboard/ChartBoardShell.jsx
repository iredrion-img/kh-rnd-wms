import React from 'react';

const ChartBoardShell = ({ title, subtitle, headerMiddle, headerRight, children, footer, isDisplayBoardMode }) => {
    return (
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-2xl rounded-3xl border border-white p-[clamp(0.75rem,1.5vw,2rem)] shadow-[0_12px_40px_rgba(0,0,0,0.04)] flex flex-col">
            <div className="flex-none flex justify-between items-center mb-[clamp(0.25rem,0.5vh,0.75rem)] min-h-[44px]">
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-[clamp(1rem,1.5vw,2rem)] font-extrabold tracking-tight text-kh-text-main">{title}</h3>
                            {subtitle && (
                                <p className="text-[clamp(0.6rem,0.8vw,1rem)] text-gray-400 mt-0.5 font-medium">{subtitle}</p>
                            )}
                        </div>
                        {headerMiddle}
                    </div>
                </div>
                {headerRight && (
                    <div className="flex-none ml-4 pointer-events-auto flex items-center">
                        {headerRight}
                    </div>
                )}
            </div>
            <div className="flex-1 relative flex flex-col" style={{ pointerEvents: isDisplayBoardMode ? 'none' : 'auto' }}>
                {children}
            </div>
            {footer && (
                <div className="flex-none mt-[clamp(0.5rem,1vh,1rem)] w-full">
                    {footer}
                </div>
            )}
        </div>
    );
};

export default ChartBoardShell;
