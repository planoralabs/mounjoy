import React from 'react';
import { AlertTriangle, Info, CheckCircle, Flame } from 'lucide-react';

const AlertBox = ({ type = 'info', title, message }) => {
    const styles = {
        danger: "bg-red-50 border-red-100 text-red-900", // Perda rápida / Risco
        warning: "bg-orange-50 border-orange-100 text-orange-900", // Platô / Atenção
        info: "bg-blue-50 border-blue-100 text-blue-900", // Dicas gerais
        success: "bg-brand-50 border-brand-100 text-brand-900" // Metas batidas
    };

    const icons = {
        danger: <Flame className="text-red-500 shrink-0" size={20} />, // Ícone de "Queima" excessiva
        warning: <AlertTriangle className="text-orange-500 shrink-0" size={20} />,
        info: <Info className="text-blue-500 shrink-0" size={20} />,
        success: <CheckCircle className="text-brand-500 shrink-0" size={20} />
    };

    return (
        <div className={`p-4 rounded-2xl border ${styles[type]} flex gap-3 items-start fade-in shadow-sm mb-3`}>
            <div className="mt-0.5">{icons[type]}</div>
            <div>
                <h4 className="font-bold text-sm mb-1">{title}</h4>
                <p className="text-xs opacity-90 leading-relaxed font-medium">{message}</p>
            </div>
        </div>
    );
};

export default AlertBox;
