import React, { useState, useMemo } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, AnimatePresence, animate } from 'framer-motion';
import { Info, MapPin, CheckCircle2 } from 'lucide-react';

const InjectionSwipeCard = ({ 
    medication, 
    user, 
    timeRemaining, 
    cycleInfo, 
    injectionSuggestion, 
    handleConfirmInjection,
    setShowDoseHelp
}) => {
    const [isApplied, setIsApplied] = useState(false);
    const dragX = useMotionValue(0);
    const controls = useAnimation();
    
    // Aggressive horizontal squeeze (compression) effect - fixed at left margin
    const cardScaleX = useTransform(dragX, [-160, 0], [0.45, 1]);
    const cardScaleY = useTransform(dragX, [-160, 0], [1.08, 1]);
    
    // Pen must track the right edge as it moves left during compression
    // We calibrate the speed to keep the needle tip tangent to the card's moving right edge.
    const penX = useTransform(dragX, [-160, 0], [-425, 0]); 
    const penOpacity = useTransform(dragX, [-100, -5], [1, 0]);

    const handleDragEnd = (_, info) => {
        if (info.offset.x < -100) {
            triggerSuccess();
        } else {
            // Animate the motion value back to 0 to reset all linked transforms
            animate(dragX, 0, { type: "spring", stiffness: 300, damping: 30 });
        }
    };

    const triggerSuccess = async () => {
        setIsApplied(true);
        handleConfirmInjection();
        // Animate the squeeze back to normal
        await animate(dragX, 0, { type: "spring", stiffness: 300, damping: 25 });
        setTimeout(() => setIsApplied(false), 3000);
    };

    const weekNumber = useMemo(() => {
        if (!user.startDate) return 1;
        const diff = Math.abs(new Date() - new Date(user.startDate));
        return Math.ceil(diff / (1000 * 60 * 60 * 24 * 7)) || 1;
    }, [user.startDate]);

    return (
        <div className="relative w-full overflow-hidden p-2 min-h-[190px] flex items-center justify-end">
            {/* Invisible Drag Target */}
            {!isApplied && (
                <motion.div
                    drag="x"
                    dragConstraints={{ left: -160, right: 0 }}
                    dragElastic={0.05}
                    dragMomentum={false}
                    onDragEnd={handleDragEnd}
                    style={{ x: dragX }}
                    className="absolute inset-0 z-30 cursor-grab active:cursor-grabbing"
                />
            )}

            {/* SVG da Caneta (Acompanha o deslize) */}
            <motion.div 
                style={{ opacity: penOpacity, x: penX }}
                className="absolute right-[-240px] top-1/2 -translate-y-1/2 z-0 pointer-events-none"
            >
                <svg width="240" height="80" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="rotate-[-2deg]">
                    <defs>
                        <filter id="softShadow" x="0" y="0" width="200" height="60" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                            <feOffset dy="2"/>
                            <feGaussianBlur stdDeviation="3"/>
                            <feComposite in2="hardAlpha" operator="out"/>
                            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"/>
                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1"/>
                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1" result="shape"/>
                        </filter>
                    </defs>

                    <g filter="url(#softShadow)">
                        <rect x="40" y="15" width="145" height="30" rx="15" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5"/>
                        <rect x="65" y="22" width="28" height="16" rx="4" fill="#F0FDFA" stroke="#CCFBF1" strokeWidth="1"/>
                        <rect x="70" y="26" width="3" height="8" rx="1.5" fill="#2DD4BF" fillOpacity="0.6"/>
                        <rect x="155" y="15" width="30" height="30" rx="6" fill="#0D9488"/>
                        <path d="M165 22H175M165 26H175M165 30H175" stroke="#5EEAD4" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M40 20L25 30L40 40V20Z" fill="#CBD5E1"/>
                        <line x1="25" y1="30" x2="8" y2="30" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
                    </g>
                </svg>
            </motion.div>

            <motion.div
                animate={controls}
                style={{ 
                    scaleX: cardScaleX, 
                    scaleY: cardScaleY, 
                    originX: 0,
                    width: '100%' 
                }}
                className={`relative z-10 bg-white p-5 rounded-[32px] shadow-lg border border-slate-100 flex flex-col gap-4 transition-colors duration-500 ${isApplied ? 'border-teal-200 bg-teal-50/20' : ''}`}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-outfit">
                            {isApplied ? 'Aplicação Realizada' : 'Próxima Aplicação'}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">
                                {isApplied ? 'Sucesso!' : (timeRemaining === 'Hoje!' ? "Dia de Injetar!" : `Em ${timeRemaining}`)}
                            </h3>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${isApplied ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-600'}`}>
                                Semana {weekNumber}
                            </span>
                        </div>
                    </div>
                    <div className="p-2">
                        <AnimatePresence mode="wait">
                            {isApplied ? (
                                <motion.div
                                    key="check"
                                    initial={{ scale: 0, rotate: -45 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    exit={{ scale: 0 }}
                                >
                                    <CheckCircle2 className="w-10 h-10 text-teal-500" />
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="swipe"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-end"
                                >
                                    <span className="text-[10px] font-black text-brand-500 animate-pulse uppercase tracking-[0.2em]">Deslize</span>
                                    <div className="flex gap-1 mt-1">
                                        {[1, 2, 3].map(i => (
                                            <motion.div 
                                                key={i}
                                                animate={{ opacity: [0.2, 1, 0.2], x: [0, -5, 0] }}
                                                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                                                className="w-1.5 h-1.5 bg-brand-300 rounded-full"
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-[32px] border-t-4 border-brand-500 shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Protocolo Semanal: {medication?.name || 'GLP-1'}</span>
                        <span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded text-[10px] font-black italic">Dose: {user.currentDose}</span>
                    </div>
                </div>

                {!isApplied && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Local Sugerido</span>
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{injectionSuggestion.icon}</span>
                                <span className="text-sm font-black text-slate-800">{injectionSuggestion.label}</span>
                            </div>
                        </div>
                        <div className="bg-brand-50/50 rounded-2xl p-4 border border-brand-100/50 flex flex-col gap-1">
                            <span className="text-[9px] font-black text-brand-600 uppercase tracking-widest">Status do Ciclo</span>
                            <p className={`text-[11px] font-bold ${cycleInfo.color} leading-none`}>{cycleInfo.message}</p>
                        </div>
                    </div>
                )}

                <button 
                  onClick={() => setShowDoseHelp(true)}
                  className="z-40 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-brand-500 transition-colors flex items-center justify-center gap-1.5 mt-1"
                >
                    <Info size={12} />
                    Esqueci minha dose
                </button>
            </motion.div>
        </div>
    );
};

export default InjectionSwipeCard;
