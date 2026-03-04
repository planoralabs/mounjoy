import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, PenTool, Image as ImageIcon, Scale, BookOpen, Droplet, Activity, X } from 'lucide-react';

const CalendarView = ({ user, setUser }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [newThought, setNewThought] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isFullscreenPhoto, setIsFullscreenPhoto] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const getDaysInMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const monthName = currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    const getDayData = (date) => {
        const dateKey = date.toISOString().split('T')[0];
        const intake = user.dailyIntakeHistory?.[dateKey] || { water: 0, protein: 0 };
        const weightEntry = user.measurements?.find(m => m.date.startsWith(dateKey));
        const sideEffects = user.sideEffectsLogs?.find(l => l.date.startsWith(dateKey));
        const dose = user.doseHistory?.find(d => d.date.startsWith(dateKey));

        return {
            ...intake,
            weight: weightEntry?.weight,
            hasSymptoms: sideEffects?.symptoms?.length > 0,
            hasDose: !!dose
        };
    };

    const handleSaveThought = async () => {
        if (!newThought.trim()) return;
        setIsSaving(true);
        const now = new Date().toISOString();
        const updatedUser = {
            ...user,
            thoughtLogs: [
                { text: newThought, date: now },
                ...(user.thoughtLogs || [])
            ]
        };
        await setUser(updatedUser);
        setNewThought('');
        setIsSaving(false);
    };

    const nextPhoto = (e) => {
        e.stopPropagation();
        setCurrentPhotoIndex((prev) => (prev + 1) % user.photos.length);
    };

    const prevPhoto = (e) => {
        e.stopPropagation();
        setCurrentPhotoIndex((prev) => (prev - 1 + user.photos.length) % user.photos.length);
    };

    return (
        <div className="flex flex-col gap-6 pb-24">
            {/* Header section */}
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 mt-2">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                        <CalendarIcon size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Seu Calendário</h2>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Jornada Mounjoy</span>
                    </div>
                </div>

                {/* Photo & Weight Section */}
                <div className="flex gap-4 mb-8 items-stretch">
                    {/* Gallery (2/3) */}
                    <div className="flex-[2] min-w-0">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><ImageIcon size={12} /> Galeria</span>
                            <span className="text-[10px] font-bold text-brand bg-brand-50 px-2 py-0.5 rounded-full">{user.photos?.length || 0}</span>
                        </div>
                        {user.photos && user.photos.length > 0 ? (
                            <div className="rounded-2xl max-w-[270px] overflow-hidden">
                                <div className="flex gap-2 overflow-x-auto snap-x hide-scrollbar py-1">
                                    {[...user.photos].reverse().map((photo, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                setCurrentPhotoIndex(user.photos.length - 1 - idx);
                                                setIsFullscreenPhoto(true);
                                            }}
                                            className="w-20 h-20 rounded-2xl bg-slate-100 shrink-0 snap-center overflow-hidden border-2 border-white shadow-sm relative cursor-pointer active:scale-95 transition-transform"
                                        >
                                            <img src={typeof photo === 'string' ? photo : photo.url} alt={`Evolução ${idx}`} className="w-full h-full object-cover" />
                                            <div className="absolute bottom-1 right-1 text-[8px] font-black text-white bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm">
                                                {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(photo.date || new Date())).replace('/', '-')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="h-20 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                                <ImageIcon size={16} className="mb-1 opacity-50" />
                                <span className="text-[10px] font-semibold">Sem fotos</span>
                            </div>
                        )}
                    </div>

                    {/* Metrics Snapshot (1/3) */}
                    <div className="flex-1 flex flex-col justify-center items-end text-right pr-4">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status do Dia</span>
                        <div className="text-3xl font-black text-slate-900 tabular-nums tracking-tighter leading-none mb-3">
                            {selectedDate ? (getDayData(selectedDate).weight || '--') : (user.currentWeight || '--')}
                            <span className="text-sm ml-1 text-brand font-bold">kg</span>
                        </div>

                        <div className="flex flex-col gap-1 items-end">
                            <div className="flex items-center gap-1.5 text-blue-500">
                                <span className="text-[10px] font-black tabular-nums">
                                    {selectedDate ? (getDayData(selectedDate).water?.toFixed(1) || '0.0') : '0.0'}L
                                </span>
                                <Droplet size={10} strokeWidth={3} />
                            </div>
                            <div className="flex items-center gap-1.5 text-orange-500">
                                <span className="text-[10px] font-black tabular-nums">
                                    {selectedDate ? (getDayData(selectedDate).protein || '0') : '0'}g
                                </span>
                                <Activity size={10} strokeWidth={3} />
                            </div>
                        </div>

                        <span className="text-[9px] font-bold text-slate-400 uppercase mt-3 bg-slate-100 px-2 py-0.5 rounded-full">
                            {selectedDate ? `Dia ${selectedDate.getDate()}` : 'Resumo'}
                        </span>
                    </div>
                </div>

                {/* Calendar Widget */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Scale size={12} /> Frequência de Pesagens</span>
                        <div className="flex items-center gap-2">
                            <button onClick={prevMonth} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors">
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs font-bold text-slate-800 capitalize w-24 text-center">{monthName}</span>
                            <button onClick={nextMonth} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                            <span key={i} className="text-[10px] font-black text-slate-400">{d}</span>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2 text-center">
                        {[...Array(firstDay)].map((_, i) => (
                            <div key={`empty-${i}`} className="h-10 rounded-xl" />
                        ))}
                        {[...Array(daysInMonth)].map((_, i) => {
                            const day = i + 1;
                            const isToday = day === new Date().getDate() && currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear();

                            const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                            const dayData = getDayData(dayDate);
                            const hasLoggedWeight = !!dayData.weight;

                            return (
                                <div
                                    key={day}
                                    onClick={() => {
                                        setSelectedDate(prev => prev && prev.getTime() === dayDate.getTime() ? null : dayDate);
                                    }}
                                    className={`h-10 rounded-xl flex flex-col items-center justify-center text-sm font-bold relative transition-all cursor-pointer hover:scale-110 scale-100 ${selectedDate && selectedDate.getTime() === dayDate.getTime()
                                        ? 'bg-slate-800 text-white shadow-md'
                                        : isToday ? 'bg-indigo-500 text-white shadow-md' :
                                            hasLoggedWeight ? 'bg-indigo-50 text-indigo-700 font-black' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    {day}
                                    <div className="flex gap-0.5 mt-0.5">
                                        {dayData.hasDose && <div className="w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.5)]"></div>}
                                        {dayData.hasSymptoms && <div className="w-1 h-1 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]"></div>}
                                        {hasLoggedWeight && <div className={`w-1 h-1 rounded-full ${selectedDate && selectedDate.getTime() === dayDate.getTime() ? 'bg-white' : 'bg-indigo-500'}`}></div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Expanded Day Metrics */}
                <div className={`transition-all duration-300 overflow-hidden ${selectedDate ? 'max-h-[500px] opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0'}`}>
                    {selectedDate && (
                        <div className="pt-6 border-t border-slate-100 flex flex-col gap-4 text-slate-800 relative">
                            <button onClick={() => setSelectedDate(null)} className="absolute right-0 top-6 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors">
                                <X size={16} />
                            </button>
                            <div>
                                <h3 className="font-black text-slate-800 tracking-tight capitalize">
                                    {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(selectedDate)}
                                </h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Resumo do Dia</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Scale size={14} /> Peso</span>
                                    <span className="text-xl font-black tabular-nums">
                                        {getDayData(selectedDate).weight ? `${getDayData(selectedDate).weight} kg` : "--"}
                                    </span>
                                </div>
                                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex flex-col gap-2">
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5"><Droplet size={14} /> Hidratação</span>
                                    <span className="text-xl font-black tabular-nums text-blue-900">
                                        {getDayData(selectedDate).water > 0 ? `${getDayData(selectedDate).water} L` : "--"}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100 flex flex-col gap-2">
                                <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-1.5"><Activity size={14} /> Proteína</span>
                                <span className="text-xl font-black tabular-nums text-orange-900">
                                    {getDayData(selectedDate).protein > 0 ? `${getDayData(selectedDate).protein} g` : "--"}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Thoughts Log Section */}
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 mt-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <BookOpen size={18} className="text-slate-500" />
                        <h3 className="font-bold text-slate-800">Diário de Pensamentos</h3>
                    </div>
                    <div className="bg-brand-50 text-brand text-[10px] font-black px-2 py-1 rounded-lg uppercase">
                        Real-time Cloud
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="relative">
                        <textarea
                            value={newThought}
                            onChange={(e) => setNewThought(e.target.value)}
                            placeholder="Como você está se sentindo hoje? Algum efeito colateral ou vitória?"
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-700 min-h-[100px] focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                        />
                        <button
                            onClick={handleSaveThought}
                            disabled={!newThought.trim() || isSaving}
                            className={`absolute bottom-3 right-3 p-3 rounded-xl shadow-lg transition-all active:scale-95 ${!newThought.trim() || isSaving ? 'bg-slate-200 text-slate-400' : 'bg-brand text-white hover:bg-brand-600'}`}
                        >
                            <PenTool size={18} />
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    {user.thoughtLogs && user.thoughtLogs.length > 0 ? (
                        user.thoughtLogs.map((log, idx) => (
                            <div key={idx} className="w-full bg-slate-50 border border-slate-100/50 rounded-2xl p-4 transition-all hover:bg-slate-100/50 relative overflow-hidden group">
                                <p className="text-sm text-slate-700 italic mb-2 leading-relaxed">"{log.text}"</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(log.date))}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 opacity-40">
                            <PenTool size={32} className="mx-auto mb-2" />
                            <p className="text-xs font-bold uppercase tracking-widest">Nada registrado ainda</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Additional Metrics snippet could go here */}
            <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            {/* Fullscreen Photo Overlay */}
            {isFullscreenPhoto && user.photos && user.photos.length > 0 && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
                    style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
                    onClick={() => setIsFullscreenPhoto(false)}
                >
                    <div
                        className="relative w-full h-[80vh] max-w-lg bg-slate-100 rounded-[40px] overflow-hidden shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={typeof (user.photos[currentPhotoIndex]) === 'string' ? (user.photos[currentPhotoIndex]) : (user.photos[currentPhotoIndex])?.url}
                            alt="Evolução Ampliada"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>

                        {/* Pagination Overlay */}
                        <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-4 z-10 w-full px-6">
                            <span className="text-white text-xs font-black tracking-widest drop-shadow-md bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
                                {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(user.photos[currentPhotoIndex].date || new Date()))}
                            </span>

                            <div className="flex w-full items-center justify-between">
                                {user.photos.length > 1 ? (
                                    <button onClick={prevPhoto} className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors text-white z-20 shrink-0">
                                        <ChevronLeft size={28} />
                                    </button>
                                ) : <div className="w-12 shrink-0"></div>}

                                <div className="flex justify-center gap-2 flex-1 mx-4">
                                    {user.photos.map((_, i) => (
                                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${currentPhotoIndex === i ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}></div>
                                    ))}
                                </div>

                                {user.photos.length > 1 ? (
                                    <button onClick={nextPhoto} className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors text-white z-20 shrink-0">
                                        <ChevronRight size={28} />
                                    </button>
                                ) : <div className="w-12 shrink-0"></div>}
                            </div>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={() => setIsFullscreenPhoto(false)}
                            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarView;
