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
    setShowDoseHelp,
    onShowBodyGuide
}) => {
    const [isApplied, setIsApplied] = useState(false);
    const lastHistoryCount = React.useRef(user.doseHistory?.length || 0);

    // Detect new injection confirmation from modal
    React.useEffect(() => {
        if (user.doseHistory?.length > lastHistoryCount.current) {
            setIsApplied(true);
            setTimeout(() => setIsApplied(false), 4000);
        }
        lastHistoryCount.current = user.doseHistory?.length || 0;
    }, [user.doseHistory]);

    const weekNumber = useMemo(() => {
        if (!user.startDate) return 1;
        const diff = Math.abs(new Date() - new Date(user.startDate));
        return Math.ceil(diff / (1000 * 60 * 60 * 24 * 7)) || 1;
    }, [user.startDate]);

    // Calculate fill level based on days since last dose
    // cycleInfo.daysSinceDose is 0 on injection day, up to 7+ days.
    const daysSinceDose = cycleInfo.daysSinceDose ?? 7;
    const fillLevel = isApplied ? 100 : Math.max(8, Math.min(100, ((7 - daysSinceDose) / 7) * 100));

    return (
        <div className="relative w-full overflow-hidden p-2 min-h-[190px]">
            {/* The actual card */}
            <motion.div
                className={`relative z-10 bg-white p-6 rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col gap-5 transition-colors duration-500 overflow-hidden ${isApplied ? 'border-brand-200 bg-brand-50/20' : ''}`}
            >
                {/* Background Mascot Decoration */}
                <div className="absolute -right-8 -top-8 w-40 h-40 opacity-[0.03] pointer-events-none rotate-12">
                    <img src="/mascotstrong.png" alt="Mascot" className="w-full h-auto" />
                </div>

                <div className="flex items-start justify-between relative z-10">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] font-outfit">
                                {isApplied ? 'Finalizado' : 'Próxima Aplicação'}
                            </span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase ${isApplied ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500'}`}>
                                Semana {weekNumber}
                            </span>
                        </div>
                        <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-1">
                            {isApplied ? 'Sucesso! 🎈' : (timeRemaining === 'Hoje!' ? "Dia de Injetar!" : `Em ${timeRemaining}`)}
                        </h3>
                    </div>
                    
                    {/* Action Button - 3D Physical Design */}
                    <div className="shrink-0">
                        <motion.button
                            key="apply-btn"
                            whileTap={{ y: 4 }}
                            onClick={onShowBodyGuide}
                            className="group relative flex flex-col items-center outline-none select-none transition-opacity duration-300"
                        >
                            {/* Physical Depth Base */}
                            <div className="w-24 h-24 rounded-[32px] bg-[#ea580c] absolute top-1 left-0 w-full h-full" />
                            
                            {/* Button Face */}
                            <div className="w-24 h-24 rounded-[32px] bg-[#f97316] flex flex-col items-center justify-center border-t border-white/30 shadow-lg relative z-10 -translate-y-1 group-active:translate-y-0 transition-all duration-100">
                                <div className="relative w-10 h-10 mb-1 transition-transform">
                                    <svg viewBox="0 0 24 24" className="w-full h-full">
                                        <defs>
                                            <linearGradient id="carvedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                <stop offset="0%" stopColor="#9a3412" />
                                                <stop offset="100%" stopColor="#ea580c" />
                                            </linearGradient>
                                            <linearGradient id="liquidGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                                                <stop offset="0%" stopColor="#fde047" />
                                                <stop offset="100%" stopColor="#f59e0b" />
                                            </linearGradient>
                                            <clipPath id="dropClip">
                                                <motion.rect 
                                                    initial={false}
                                                    animate={{ y: 24 - (24 * fillLevel / 100) }}
                                                    transition={{ type: "spring", stiffness: 60, damping: 15 }}
                                                    x="0" width="24" height="24" 
                                                />
                                            </clipPath>
                                        </defs>
                                        
                                        {/* Hollow/Carved Background */}
                                        <path 
                                            d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" 
                                            fill="url(#carvedGradient)"
                                            className="drop-shadow-[0_1px_1px_rgba(255,255,255,0.2)]"
                                        />
                                        
                                        {/* Glowing Liquid Fill */}
                                        <path 
                                            d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" 
                                            fill="url(#liquidGlow)"
                                            clipPath="url(#dropClip)"
                                            className="blur-[0.5px]"
                                        />

                                        {/* Surface Shine/Depth */}
                                        <path 
                                            d="M12 4c.5 1 1 2 2 4M9 12a3 3 0 0 0 6 0" 
                                            stroke="white" 
                                            strokeOpacity="0.15" 
                                            fill="none" 
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    
                                    {/* Success Flash Effect */}
                                    {isApplied && (
                                        <motion.div 
                                            initial={{ scale: 0.5, opacity: 1 }}
                                            animate={{ scale: 2, opacity: 0 }}
                                            className="absolute inset-0 bg-amber-200 rounded-full blur-xl z-20"
                                        />
                                    )}
                                </div>
                                <span className="text-[9px] font-black text-white uppercase tracking-widest mt-1">
                                    {isApplied ? 'Sucesso!' : 'Injetar'}
                                </span>
                            </div>
                        </motion.button>
                    </div>
                </div>

                {/* Protocol Area - Integrated Pill Design */}
                <div className="flex items-center justify-between bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50 relative z-10">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Seu Protocolo</span>
                        <span className="text-sm font-black text-slate-700">{medication?.name || 'GLP-1'}</span>
                    </div>
                    <div className="bg-brand-500 text-white px-3 py-1.5 rounded-xl text-xs font-black">
                        {user.currentDose}
                    </div>
                </div>

                {!isApplied && (
                    <div className="grid grid-cols-2 gap-3 relative z-10">
                        <button 
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onShowBodyGuide?.();
                            }}
                            className="bg-white rounded-2xl p-4 border-2 border-dashed border-slate-200 flex flex-col gap-2 text-left hover:border-brand-300 hover:bg-brand-50/10 transition-all active:translate-y-1 active:shadow-none shadow-[0_4px_0_0_rgba(226,232,240,1)] group/btn relative"
                        >
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Local Sugerido</span>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm group-hover/btn:scale-110 transition-transform">
                                    {injectionSuggestion.icon}
                                </div>
                                <span className="text-xs font-black text-slate-800">{injectionSuggestion.label}</span>
                            </div>
                        </button>
                        
                        <div className="bg-brand-50/30 rounded-2xl p-4 border border-brand-100/30 flex flex-col gap-2">
                            <span className="text-[9px] font-black text-brand-600 uppercase tracking-widest">Dica de Ciclo</span>
                            <p className={`text-[10px] font-bold ${cycleInfo.color} leading-tight`}>{cycleInfo.message}</p>
                        </div>
                    </div>
                )}

                <button 
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                      e.stopPropagation();
                      setShowDoseHelp(true);
                  }}
                  className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-brand-500 transition-colors flex items-center justify-center gap-1.5 mt-1"
                >
                    <Info size={12} />
                    Esqueci minha dose
                </button>
            </motion.div>
        </div>
    );
};

export default InjectionSwipeCard;
