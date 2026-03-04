import React from 'react';
import { AlertTriangle, Bell, Calendar, ChevronRight } from 'lucide-react';

const DoseAlert = ({ reminder, onAction }) => {
    if (reminder.status === 'okay') return null;

    const isOverdue = reminder.status === 'overdue';
    const isFirst = reminder.status === 'first_dose';

    if (isFirst) {
        return (
            <div className="bg-white rounded-[32px] p-6 mb-6 shadow-sm border border-slate-100 animate-fadeIn overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50/50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand shadow-sm">
                        <Bell size={28} className="animate-bounce" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-slate-800 font-black text-lg tracking-tight">Primeira Dose?</h4>
                        <p className="text-slate-400 text-xs font-bold leading-tight">Você ainda não registrou nenhuma dose. Marque sua primeira aplicação agora!</p>
                    </div>
                    <button
                        onClick={onAction}
                        className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-brand-600"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-[32px] p-6 mb-6 shadow-2xl animate-pulse-subtle border ${isOverdue ? 'bg-red-50 border-red-100 text-red-900' : 'bg-brand/5 border-brand/20 text-brand-900'}`}>
            <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isOverdue ? 'bg-red-500 text-white' : 'bg-brand text-white'}`}>
                    <AlertTriangle size={24} />
                </div>
                <div className="flex-1">
                    <h4 className="font-black text-base tracking-tight mb-1">
                        {isOverdue ? 'Dose Atrasada!' : 'Dose do Dia!'}
                    </h4>
                    <p className={`text-xs font-bold uppercase tracking-widest opacity-60 mb-3`}>
                        {isOverdue ? `${reminder.overdueDays} dias de atraso` : 'Chegou o momento da aplicação'}
                    </p>
                    <button
                        onClick={onAction}
                        className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg ${isOverdue ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-brand text-white hover:bg-brand-600'}`}
                    >
                        Registrar agora
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes pulse-subtle {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.01); }
                    100% { transform: scale(1); }
                }
                .animate-pulse-subtle {
                    animation: pulse-subtle 4s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default DoseAlert;
