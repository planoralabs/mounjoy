import React, { useState, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Image as ImageIcon, Scale, BookOpen, Droplet, Activity, X, Plus } from 'lucide-react';
import { Modal } from './ui/BaseComponents';

const CalendarView = ({ user, setUser, setActiveTab }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);

    const [isFullscreenPhoto, setIsFullscreenPhoto] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    const [showAddMemoryModal, setShowAddMemoryModal] = useState(false);
    const [modalMemoryNote, setModalMemoryNote] = useState('');
    const [modalSelectedDate, setModalSelectedDate] = useState(new Date());
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const scrollContainerRef = useRef(null);

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
            hasDose: !!dose,
            foodNoise: sideEffects?.foodNoise,
            note: sideEffects?.note
        };
    };



    const nextPhoto = (e) => {
        e.stopPropagation();
        setCurrentPhotoIndex((prev) => (prev + 1) % user.photos.length);
    };

    const prevPhoto = (e) => {
        e.stopPropagation();
        setCurrentPhotoIndex((prev) => (prev - 1 + user.photos.length) % user.photos.length);
    };

    const handleSaveMemory = () => {
        if (!modalMemoryNote.trim()) return;

        const newLog = {
            date: modalSelectedDate.toISOString(),
            foodNoise: 0, // Default for memories
            symptoms: [],
            note: modalMemoryNote,
            isMemoryOnly: true
        };

        const updatedUser = {
            ...user,
            sideEffectsLogs: [newLog, ...(user.sideEffectsLogs || [])]
        };

        setUser(updatedUser);
        setModalMemoryNote('');
        setShowAddMemoryModal(false);
    };

    const generateDateRange = () => {
        const dates = [];
        const baseDate = selectedDate || new Date();
        for (let i = -7; i <= 7; i++) {
            const d = new Date(baseDate);
            d.setDate(d.getDate() + i);
            dates.push(d);
        }
        return dates;
    };

    const scrollDates = (direction) => {
        if (scrollContainerRef.current) {
            const scrollAmount = direction === 'left' ? -150 : 150;
            scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    return (
        <div className="flex flex-col gap-6 pb-24">
            {/* Header section */}
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 mt-2">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
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
                                    className={`h-10 rounded-xl flex flex-col items-center justify-center text-sm font-bold relative transition-all cursor-pointer active:scale-95 scale-100 ${selectedDate && selectedDate.getTime() === dayDate.getTime()
                                        ? 'bg-slate-800 text-white shadow-md'
                                        : isToday ? 'bg-blue-500 text-white shadow-md' :
                                            hasLoggedWeight ? 'bg-blue-50 text-blue-700 font-black' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    {day}
                                    <div className="flex gap-0.5 mt-0.5">
                                        {dayData.hasDose && <div className="w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.5)]"></div>}
                                        {dayData.hasSymptoms && <div className="w-1 h-1 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]"></div>}
                                        {hasLoggedWeight && <div className={`w-1 h-1 rounded-full ${selectedDate && selectedDate.getTime() === dayDate.getTime() ? 'bg-white' : 'bg-blue-500'}`}></div>}
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

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100 flex flex-col gap-2">
                                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-1.5"><Activity size={14} /> Proteína</span>
                                    <span className="text-xl font-black tabular-nums text-orange-900">
                                        {getDayData(selectedDate).protein > 0 ? `${getDayData(selectedDate).protein} g` : "--"}
                                    </span>
                                </div>
                                <div className={`${getDayData(selectedDate).foodNoise !== undefined ? (getDayData(selectedDate).foodNoise <= 3 ? 'bg-brand-50 border-brand-100' : getDayData(selectedDate).foodNoise <= 7 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100') : 'bg-slate-50 border-slate-100'} rounded-2xl p-4 border flex flex-col gap-2`}>
                                    <span className={`text-[10px] font-black ${getDayData(selectedDate).foodNoise !== undefined ? (getDayData(selectedDate).foodNoise <= 3 ? 'text-brand-400' : getDayData(selectedDate).foodNoise <= 7 ? 'text-amber-400' : 'text-red-400') : 'text-slate-400'} uppercase tracking-widest flex items-center gap-1.5`}><Activity size={14} /> Food Noise</span>
                                    <span className={`text-xl font-black tabular-nums ${getDayData(selectedDate).foodNoise !== undefined ? (getDayData(selectedDate).foodNoise <= 3 ? 'text-brand-900' : getDayData(selectedDate).foodNoise <= 7 ? 'text-amber-900' : 'text-red-900') : 'text-slate-900'}`}>
                                        {getDayData(selectedDate).foodNoise !== undefined ? `${getDayData(selectedDate).foodNoise}/10` : "--"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Daily Records Section */}
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 mt-6 relative overflow-hidden">
                <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-2">
                        <BookOpen size={18} className="text-slate-500" />
                        <h3 className="font-bold text-slate-800">Registros de Bem-estar</h3>
                    </div>
                    <button 
                        onClick={() => {
                            setModalSelectedDate(selectedDate || new Date());
                            setShowAddMemoryModal(true);
                        }}
                        className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 active:scale-90 transition-all hover:bg-blue-600"
                        title="Adicionar Novo Registro"
                    >
                        <Plus size={20} strokeWidth={3} />
                    </button>
                </div>

                <div className="space-y-4">
                    {(() => {
                        const logsToShow = selectedDate 
                            ? (user.sideEffectsLogs || []).filter(l => l.date.startsWith(selectedDate.toISOString().split('T')[0]))
                            : (user.sideEffectsLogs || []).slice(0, 10); // Show last 10 if no date selected

                        if (logsToShow.length > 0) {
                            return logsToShow.map((log, idx) => (
                                <div key={idx} className="w-full bg-slate-50 border border-slate-100/50 rounded-2xl p-4 transition-all hover:bg-slate-100/50">
                                    <div className="flex justify-between items-start gap-4 mb-3">
                                        <div className="flex flex-col gap-1 shrink-0">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(log.date))}
                                            </span>
                                            {log.foodNoise !== undefined && (
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <div className={`w-2 h-2 rounded-full ${log.foodNoise <= 3 ? 'bg-blue-500' : log.foodNoise <= 7 ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Food Noise: {log.foodNoise}/10</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end gap-2 text-right">
                                            {log.symptoms?.length > 0 && (
                                                <div className="flex gap-1">
                                                    {log.symptoms.map(s => {
                                                        const emoji = { nausea: '🤢', vomito: '🤮', fadiga: '🥱', azia: '🔥', constipação: '🧱' }[s] || '🤒';
                                                        return <span key={s} title={s} className="text-sm">{emoji}</span>;
                                                    })}
                                                </div>
                                            )}
                                            {log.note && (
                                                <p className="text-xs text-slate-600 italic leading-relaxed line-clamp-3">
                                                    {log.note}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {log.trigger && (
                                        <div className="bg-orange-50/50 self-start px-2 py-1 rounded text-[10px] font-bold text-orange-600 inline-block">
                                            Gatilho: {log.trigger}
                                        </div>
                                    )}
                                </div>
                            ));
                        } else {
                            return (
                                <div className="text-center py-12 opacity-40">
                                    <BookOpen size={32} className="mx-auto mb-2" />
                                    <p className="text-xs font-bold uppercase tracking-widest">
                                        {selectedDate ? 'Nenhum registro neste dia' : 'Nenhum registro encontrado'}
                                    </p>
                                </div>
                            );
                        }
                    })()}
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

            {/* Modal: Adicionar Memória */}
            <Modal
                isOpen={showAddMemoryModal}
                onClose={() => {
                    setShowAddMemoryModal(false);
                    setShowMonthPicker(false);
                }}
                title={showMonthPicker ? "Escolher Data" : "Nova Memória"}
            >
                <div className="space-y-6">
                    {!showMonthPicker ? (
                        <>
                            {/* Horizontal Date Selector + Calendar Icon */}
                            <div className="flex items-center gap-1.5 w-full">
                                {/* Left Arrow */}
                                <button 
                                    onClick={() => scrollDates('left')}
                                    className="shrink-0 w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-white transition-all active:scale-90 shadow-sm"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                <div className="relative flex-1 overflow-hidden">
                                    <div 
                                        ref={scrollContainerRef}
                                        className="flex gap-2 overflow-x-auto snap-x scroll-smooth hide-scrollbar py-2 px-4"
                                    >
                                        {generateDateRange().map((date, idx) => {
                                            const isSelected = modalSelectedDate.toDateString() === date.toDateString();
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => setModalSelectedDate(date)}
                                                    className={`shrink-0 w-10 h-14 rounded-xl flex flex-col items-center justify-center transition-all snap-center ${
                                                        isSelected 
                                                        ? 'bg-blue-500 text-white shadow-lg scale-110 z-10' 
                                                        : 'bg-slate-50 text-slate-400 border border-slate-100'
                                                    }`}
                                                >
                                                    <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">
                                                        {new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '')}
                                                    </span>
                                                    <span className="text-base font-black">{date.getDate()}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {/* Subtle Gradient Fades */}
                                    <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent pointer-events-none z-20"></div>
                                    <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent pointer-events-none z-20"></div>
                                </div>

                                {/* Right Arrow */}
                                <button 
                                    onClick={() => scrollDates('right')}
                                    className="shrink-0 w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-white transition-all active:scale-90 shadow-sm"
                                >
                                    <ChevronRight size={16} />
                                </button>

                                {/* Month Picker Trigger */}
                                <button 
                                    onClick={() => setShowMonthPicker(true)}
                                    className="shrink-0 w-10 h-14 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 hover:bg-blue-100 transition-all active:scale-90 shadow-sm"
                                    title="Ver Mês Inteiro"
                                >
                                    <CalendarIcon size={18} />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">O que você está pensando?</label>
                                <textarea
                                    value={modalMemoryNote}
                                    onChange={(e) => setModalMemoryNote(e.target.value)}
                                    placeholder="Escreva aqui sua memória..."
                                    className="w-full bg-slate-50 border-none rounded-3xl p-5 text-sm text-slate-700 placeholder-slate-300 focus:ring-2 focus:ring-blue-500 transition-all resize-none h-32"
                                />
                            </div>

                            <button 
                                onClick={handleSaveMemory}
                                className="w-full bg-blue-500 text-white py-4 rounded-[24px] text-sm font-black uppercase tracking-widest border-b-4 border-blue-700 active:translate-y-1 active:border-b-0 transition-all shadow-xl"
                            >
                                Salvar Memória
                            </button>
                        </>
                    ) : (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="bg-slate-50 p-4 rounded-3xl">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <span className="text-sm font-black text-slate-800 uppercase tracking-widest">
                                        {modalSelectedDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                                <div className="grid grid-cols-7 gap-2 text-center">
                                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                                        <span key={d} className="text-[10px] font-black text-slate-300">{d}</span>
                                    ))}
                                    {[...Array(new Date(modalSelectedDate.getFullYear(), modalSelectedDate.getMonth(), 1).getDay())].map((_, i) => (
                                        <div key={`emp-${i}`} />
                                    ))}
                                    {[...Array(new Date(modalSelectedDate.getFullYear(), modalSelectedDate.getMonth() + 1, 0).getDate())].map((_, i) => {
                                        const day = i + 1;
                                        const date = new Date(modalSelectedDate.getFullYear(), modalSelectedDate.getMonth(), day);
                                        const isSelected = modalSelectedDate.toDateString() === date.toDateString();
                                        return (
                                            <button
                                                key={day}
                                                onClick={() => setModalSelectedDate(date)}
                                                className={`h-10 rounded-xl text-xs font-bold transition-all ${
                                                    isSelected ? 'bg-blue-500 text-white shadow-md' : 'hover:bg-white text-slate-600'
                                                }`}
                                            >
                                                {day}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowMonthPicker(false)}
                                className="w-full bg-slate-900 text-white py-4 rounded-[24px] text-sm font-black uppercase tracking-widest active:scale-95 transition-all"
                            >
                                Confirmar Data
                            </button>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Photo & Weight Section (Existing Overlays...) */}
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
