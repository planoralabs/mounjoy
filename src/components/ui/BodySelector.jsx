import React, { useState, useRef, useEffect } from 'react';
import { Info, CheckCircle2, AlertTriangle, RefreshCw, ChevronDown } from 'lucide-react';
import { Modal } from './BaseComponents';

const BodySelector = ({ selectedSiteId, onSelect, suggestedSiteId }) => {
    const [showInfo, setShowInfo] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(false);
    const scrollRef = useRef(null);

    const isActive = (id) => selectedSiteId === id;
    const isSuggested = (id) => suggestedSiteId === id;

    const getFillClass = (id) => {
        if (isActive(id)) return "fill-brand-600 active-shadow";
        if (isSuggested(id)) return "fill-emerald-400 animate-pulse cursor-pointer hover:fill-emerald-500 transition-all";
        return "fill-white hover:fill-slate-100 cursor-pointer transition-all";
    };

    const getSiteName = (id) => {
        const names = {
            'arm-right': 'Braço Direito',
            'arm-left': 'Braço Esquerdo',
            'abdomen-left': 'Abdômen Esquerdo',
            'abdomen-right': 'Abdômen Direito',
            'thigh-right': 'Coxa Direita',
            'thigh-left': 'Coxa Esquerda'
        };
        return names[id] || 'Selecione um local';
    };

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            // Define being at bottom if within 15px of the end
            setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 15);
        }
    };

    useEffect(() => {
        if (showInfo) {
            // Initial check to see if content is scrollable
            setTimeout(handleScroll, 100);
        }
    }, [showInfo]);

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative bg-[#f8fbff] p-2 rounded-[32px] border border-slate-100 shadow-inner w-full flex justify-center overflow-hidden">
                {/* Info Button */}
                <button
                    onClick={() => setShowInfo(true)}
                    className="absolute top-2 right-2 z-20 p-2 bg-white border border-slate-100 rounded-full text-slate-400 hover:text-brand-600 transition-all"
                    title="Guia de Aplicação"
                >
                    <Info size={16} />
                </button>



                <svg id="body" viewBox="0 100 198.81 450" className="h-[210px] w-auto drop-shadow-md relative z-10" xmlns="http://www.w3.org/2000/svg">
                    <title>Injection Site Selector</title>

                    {/* TRUNK (Reference - Always White) */}
                    <path
                        className="fill-white stroke-black stroke-[1.5px] pointer-events-none"
                        d="M147.08,247.36c-0.06-7.1.64-14.06,2.71-19.47,5.31-13.86,1.87-35.54,4.26-32.35l-5.58-77s-22.95-7.49-26.13-12.11H75.48c-3.19,4.62-26.13,12.11-26.13,12.11l-5.58,77C46.15,192.36,42.71,214,48,227.9c2.07,5.41,2.78,12.37,2.71,19.47h96.34Z"
                        transform="translate(0.5 0.5)"
                    />

                    {/* interactive parts */}
                    <path
                        className={`${getFillClass("arm-right")} stroke-black stroke-[1.5px]`}
                        d="M43.76,195.54c-2.39,3.19-4.94,16.09-5.1,25.82s-3.19,23.27-5.74,29,2.23,35.22-.32,50.36-10.36,42.55-10.36,47.81L3.76,346.3c1-10.36-5.42-86.06-3.35-90.68s4-15.46,2.71-22.63S0.42,189.49,4.4,179.92s-0.8-27.25,9.88-44.62,35.06-16.73,35.06-16.73Z"
                        transform="translate(0.5 0.5)"
                        onClick={() => onSelect("arm-right")}
                    />

                    <path
                        className={`${getFillClass("arm-left")} stroke-black stroke-[1.5px]`}
                        d="M194,346.3c-1-10.36,5.42-86.06,3.35-90.68s-4-15.46-2.71-22.63,2.71-43.51-1.27-53.07,0.8-27.25-9.88-44.62-35.06-16.73-35.06-16.73l5.58,77c2.39,3.19,4.94,16.09,5.1,25.82s3.19,23.27,5.74,29-2.23,35.22.32,50.36,10.36,42.55,10.36,47.81Z"
                        transform="translate(0.5 0.5)"
                        onClick={() => onSelect("arm-left")}
                    />

                    <path
                        className={`${getFillClass("abdomen-left")} stroke-black stroke-[1.5px]`}
                        d="M50.73,247.36 a136,136,0,0,1-3.62,28.82 c-2.55,10.36-11,68.53-11.79,89.72 L97,368.29 L97,247.36 Z"
                        transform="translate(0.5 0.5)"
                        onClick={() => onSelect("abdomen-left")}
                    />

                    <path
                        className={`${getFillClass("abdomen-right")} stroke-black stroke-[1.5px]`}
                        d="M97,247.36 L97,368.29 L100.82,368.29 L162.49,365.9 c-0.8-21.2-9.24-79.36-11.79-89.72 a136,136,0,0,1-3.62-28.82 H97 Z"
                        transform="translate(0.5 0.5)"
                        onClick={() => onSelect("abdomen-right")}
                    />

                    <path
                        className={`${getFillClass("thigh-right")} stroke-black stroke-[1.5px]`}
                        d="M35.11,508.33c1.67-14.63,4.15-24,4.67-31.36,0.8-11.31-5.26-89.88-4.46-111.07L97,368.29s0.32,12.43-2.07,21-7.33,19-7.33,33.78-2.23,48.45-6.53,62.31c-3.08,9.94-7,16-7.48,22.91H35.11Z"
                        transform="translate(0.5 0.5)"
                        onClick={() => onSelect("thigh-right")}
                    />

                    <path
                        className={`${getFillClass("thigh-left")} stroke-black stroke-[1.5px]`}
                        d="M162.7,508.33c-1.67-14.63-4.15-24-4.67-31.36-0.8-11.31,5.26-89.88,4.46-111.07l-61.67,2.39s-0.32,12.43,2.07,21,7.33,19,7.33,33.78,2.23,48.45,6.53,62.31c3.08,9.94,7,16,7.48,22.91H162.7Z"
                        transform="translate(0.5 0.5)"
                        onClick={() => onSelect("thigh-left")}
                    />
                </svg>

                {/* Selected Site Name Label */}
                {selectedSiteId && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-900/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl border border-white/10 whitespace-nowrap">
                           {getSiteName(selectedSiteId)}
                        </div>
                    </div>
                )}
            </div>

            {/* Selection/Suggested Indicators */}
            <div className="grid grid-cols-2 w-full gap-2">
                <div className="flex items-center gap-2 bg-emerald-50 p-2 rounded-xl border border-emerald-100/50">
                    <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Sugerido</span>
                </div>
                <div className="flex items-center gap-2 bg-brand-50 p-2 rounded-xl border border-brand-100/50">
                    <div className="w-3 h-3 rounded-full bg-brand-600"></div>
                    <span className="text-[10px] font-black text-brand-700 uppercase tracking-widest">Selecionado</span>
                </div>
            </div>

            {/* Guidance Modal */}
            <Modal isOpen={showInfo} onClose={() => setShowInfo(false)} title="Guia de Aplicação">
                <div className="relative">
                    <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="space-y-6 pb-4"
                    >

                        {/* Injection Sites */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-brand-600 border-b border-brand-100 pb-3">
                                <CheckCircle2 size={18} />
                                <h4 className="font-black text-sm uppercase tracking-widest text-slate-700">Locais Recomendados</h4>
                            </div>

                            <div className="grid gap-3">
                                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 transition-all hover:border-brand-200">
                                    <p className="text-sm font-black text-slate-800 mb-1">1. Abdômen (Preferido)</p>
                                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                        Região ao redor do umbigo (evitar ~5 cm do centro). Oferece absorção estável devido ao tecido adiposo.
                                    </p>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 transition-all hover:border-brand-200">
                                    <p className="text-sm font-black text-slate-800 mb-1">2. Coxa (Frontal/Superior)</p>
                                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                        Fácil para autoaplicação. Pode haver maior sensibilidade em pessoas com baixo percentual de gordura.
                                    </p>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 transition-all hover:border-brand-200">
                                    <p className="text-sm font-black text-slate-800 mb-1">3. Braço (Parte Posterior)</p>
                                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                        Região do tríceps. Absorção rápida, mas geralmente requer auxílio de outra pessoa para aplicar.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Rotation Logic */}
                        <div className="space-y-3 bg-emerald-50/50 p-5 rounded-[32px] border border-emerald-100">
                            <div className="flex items-center gap-2 text-emerald-600">
                                <RefreshCw size={18} className="animate-spin-slow" />
                                <h4 className="font-black text-xs uppercase tracking-widest">Rotação Essencial</h4>
                            </div>
                            <p className="text-xs text-emerald-800/80 leading-relaxed font-medium">
                                Alternar os pontos evita cicatrizes, irritações e <strong>lipodistrofia</strong> (nódulos de gordura), mantendo a medicação eficaz.
                            </p>
                            <div className="bg-white/60 p-3 rounded-2xl text-[10px] font-black text-emerald-700 border border-emerald-100 uppercase tracking-tight">
                                Ex: S1 (Abdômen D) → S2 (Abdômen E) → S3 (Coxa D)...
                            </div>
                        </div>

                        {/* Critical Care */}
                        <div className="space-y-3 bg-amber-50/50 p-5 rounded-[32px] border border-amber-100 mb-4">
                            <div className="flex items-center gap-2 text-amber-600">
                                <AlertTriangle size={18} />
                                <h4 className="font-black text-xs uppercase tracking-widest">Cuidados Importantes</h4>
                            </div>
                            <ul className="text-xs text-amber-800/80 space-y-2 list-disc list-inside font-medium">
                                <li>Limpar o local com álcool antes de aplicar</li>
                                <li>Não aplicar sobre hematomas ou peles machucadas</li>
                                <li><strong>Não massagear</strong> a área após a picada</li>
                                <li>Descarte as agulhas em coletores adequados</li>
                            </ul>
                        </div>
                    </div>

                    {/* Scroll Indicator (Clean Shadow + Green Arrow) */}
                    {!isAtBottom && (
                        <div className="absolute inset-x-0 bottom-[-24px] pointer-events-none transition-all duration-500 ease-in-out z-10 flex flex-col items-center">
                            {/* Horizontal Shadow/White Opacity Gradient */}
                            <div className="w-full h-12 bg-gradient-to-t from-white via-white/80 to-transparent" />
                            {/* Central Arrow - No background, green color, no animation */}
                            <div className="mt-[-8px] pb-2">
                                <ChevronDown size={24} className="text-emerald-500 opacity-60" />
                            </div>
                        </div>
                    )}
                </div>
            </Modal >
        </div >
    );
};

export default BodySelector;
