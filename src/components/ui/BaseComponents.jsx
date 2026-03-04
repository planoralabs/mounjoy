import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
    const baseStyle = "py-3 px-6 rounded-2xl font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2";
    const variants = {
        primary: "bg-gradient-to-r from-teal-600 to-teal-500 text-white hover:opacity-90",
        secondary: "bg-white text-slate-700 border border-slate-200 shadow-sm hover:border-teal-200 hover:bg-teal-50",
        ghost: "bg-transparent text-slate-500 hover:text-teal-600",
        danger: "bg-red-50 text-red-500 border border-red-100 hover:bg-red-100"
    };

    return (
        <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};

export const Card = ({ children, className = '', onClick }) => (
    <div onClick={onClick} className={`bg-white/80 backdrop-blur-md border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] p-5 ${className}`}>
        {children}
    </div>
);

export const Input = ({ label, value, onChange, type = "text", placeholder, suffix, ...props }) => (
    <div className="mb-4">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">{label}</label>
        <div className="relative">
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-300 shadow-sm"
                {...props}
            />
            {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{suffix}</span>}
        </div>
    </div>
);

export const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-0 sm:p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-lg sm:max-w-[440px] rounded-t-[40px] sm:rounded-[40px] shadow-2xl animate-slideUp max-h-[92vh] flex flex-col overflow-hidden relative transition-all duration-500 ease-in-out border border-white/20">
                {/* Robust Header: Masking rounded corners and providing a solid barrier */}
                <div className="bg-white z-20 shrink-0">
                    {/* Symmetrical Handle Area */}
                    <div className="pt-4 pb-2 flex justify-center sm:hidden">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full" />
                    </div>

                    {/* Fixed Title Area */}
                    <div className="px-6 py-5 sm:pt-8 sm:pb-5 flex justify-between items-start gap-6 bg-white shrink-0">
                        <h3 className="text-2xl font-black text-slate-800 leading-[1.2] tracking-tight">{title}</h3>
                        <button onClick={onClose} aria-label="Close modal" className="p-2.5 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none transition-all active:scale-90 shrink-0"><X size={20} /></button>
                    </div>
                </div>

                {/* Scrollable Body: Content goes here */}
                <div className="flex-1 overflow-y-auto px-6 pb-8 hide-scrollbar">
                    <div className="pt-2">
                        {children}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export const VerticalMeter = ({ value, max, label, lines, color = "teal" }) => {
    const percentage = Math.min((value / max) * 100, 100);

    const colorMap = {
        teal: { bar: "bg-teal-400", pct: "text-teal-300" },
        blue: { bar: "bg-blue-400", pct: "text-blue-300" },
        orange: { bar: "bg-orange-400", pct: "text-orange-300" },
    };
    const c = colorMap[color] || colorMap.teal;

    // Use explicit lines if provided, otherwise split every 3 chars
    const chunks = lines || label.match(/.{1,3}/gu) || [label];

    return (
        <div className="flex flex-col w-full gap-2">
            {/* Top row: label (3 lines) + big white number */}
            <div className="flex items-end justify-between gap-2">
                <span
                    className="font-black text-white uppercase block"
                    style={{ fontSize: '16px', lineHeight: '1' }}
                >
                    {chunks.map((chunk, i) => (
                        <React.Fragment key={i}>
                            {chunk}{i < chunks.length - 1 && <br />}
                        </React.Fragment>
                    ))}
                </span>
                <span
                    className="font-black text-white tabular-nums leading-none"
                    style={{ fontSize: '48px' }}
                >
                    {percentage.toFixed(0)}
                </span>
            </div>

            {/* Bottom row: horizontal gauge + % on the right */}
            <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${c.bar}`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <span className={`text-[10px] font-black ${c.pct}`}>%</span>
            </div>
        </div>
    );
};

export const Slider = ({ label, value, onChange, min, max, step, suffix }) => {
    const percentage = ((parseFloat(value) - min) / (max - min)) * 100;
    const lastSnapped = React.useRef(null);

    const handleSliderChange = (e) => {
        let val = parseFloat(e.target.value);
        const nearestInt = Math.round(val);
        const distance = Math.abs(val - nearestInt);

        // Snapping: if close to an integer, snap to it
        if (distance <= 0.2) {
            val = nearestInt;

            // Haptic feedback (vibration) when snapping to a new integer
            if (lastSnapped.current !== val) {
                lastSnapped.current = val;
                if (window.navigator && window.navigator.vibrate) {
                    window.navigator.vibrate(15);
                }
            }
        } else {
            lastSnapped.current = null;
        }

        onChange(val);
    };

    return (
        <div className="mb-8">
            <div className="flex justify-between items-end px-1 mb-4">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</label>
                <div className="flex items-center gap-1.5 focus-within:scale-110 transition-transform">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                    <span className="text-xl font-black text-teal-600 uppercase tabular-nums">
                        {value} <span className="text-xs ml-0.5">{suffix}</span>
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-2 pl-6 rounded-[28px] border-2 border-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-within:border-teal-500 transition-all">
                <div className="flex-1 relative h-3">
                    <div className="absolute inset-0 bg-slate-50 rounded-full"></div>
                    <div
                        className="absolute inset-0 bg-gradient-to-r from-teal-400 to-teal-600 rounded-full"
                        style={{ width: `${percentage}%` }}
                    ></div>
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={value}
                        onChange={handleSliderChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-7 h-7 bg-white border-[5px] border-teal-600 rounded-full shadow-xl pointer-events-none transition-transform active:scale-125"
                        style={{ left: `calc(${percentage}% - 14px)` }}
                    ></div>
                </div>

                <div className="w-24 relative flex-shrink-0">
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full bg-white border border-slate-100 rounded-[20px] py-4 text-center font-black text-teal-900 focus:ring-2 focus:ring-teal-500 text-xl shadow-sm tabular-nums"
                        step={step}
                    />
                </div>
            </div>
        </div>
    );
};
