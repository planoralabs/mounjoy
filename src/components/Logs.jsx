import React, { useState } from 'react';
import { Info, AlertCircle } from 'lucide-react';
import { Modal, Button } from './ui/BaseComponents';

const Logs = ({ user, setUser }) => {
    const [nausea, setNausea] = useState(null);
    const [foodNoise, setFoodNoise] = useState(3);
    const [showFoodNoiseInfo, setShowFoodNoiseInfo] = useState(false);
    const [note, setNote] = useState('');
    const [trigger, setTrigger] = useState('');
    const [showTriggerField, setShowTriggerField] = useState(false);
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    const symptoms = [
        { id: 'nausea', emoji: '🤢', label: 'Náusea' },
        { id: 'vomito', emoji: '🤮', label: 'Vômito' },
        { id: 'fadiga', emoji: '🥱', label: 'Fadiga' },
        { id: 'azia', emoji: '🔥', label: 'Azia' },
        { id: 'constipação', emoji: '🧱', label: 'Constipação' },
    ];

    const toggleSymptom = (id) => {
        setSelectedSymptoms(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
        if (id === 'nausea' || id === 'vomito') {
            setShowTriggerField(true);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        const now = new Date().toISOString();
        const newLog = {
            date: now,
            foodNoise: parseInt(foodNoise),
            symptoms: selectedSymptoms,
            trigger: trigger,
            note: note
        };

        const updatedUser = {
            ...user,
            sideEffectsLogs: [newLog, ...(user.sideEffectsLogs || [])]
        };

        await setUser(updatedUser);

        // Reset local state
        setNote('');
        setTrigger('');
        setSelectedSymptoms([]);
        setFoodNoise(3);
        setIsSaving(false);
    };

    const getSliderColor = () => {
        if (foodNoise <= 3) return 'bg-brand-500';
        if (foodNoise <= 7) return 'bg-orange-500';
        return 'bg-red-500';
    };

    return (
        <div className="space-y-6 pb-24">
            <h2 className="text-2xl font-bold mb-5 ml-1 stagger-1 fade-in">Diário de Hoje</h2>

            {/* Symptoms Card */}
            <div className={`glass-panel p-6 rounded-[32px] shadow-soft stagger-2 fade-in transition-all duration-500 ${selectedSymptoms.includes('vomito') ? 'nausea-strong-glow' : ''}`}>
                <label className="block text-sm font-bold text-slate-600 mb-4 uppercase tracking-wide font-outfit">Sintomas do Dia</label>
                <div className="grid grid-cols-5 gap-2">
                    {symptoms.map((symptom) => (
                        <button
                            key={symptom.id}
                            onClick={() => toggleSymptom(symptom.id)}
                            className={`aspect-square rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-1 transition-all group focus:ring-2 active:scale-95 ${selectedSymptoms.includes(symptom.id)
                                ? `ring-2 ring-brand-500 border-brand-200 bg-brand-50`
                                : `hover:bg-slate-50`
                                }`}
                        >
                            <span className={`text-2xl transition-transform ${selectedSymptoms.includes(symptom.id) ? 'scale-110' : 'group-hover:scale-110'}`}>{symptom.emoji}</span>
                            <span className={`text-[8px] font-black uppercase ${selectedSymptoms.includes(symptom.id) ? `text-brand-600` : 'text-slate-400'}`}>{symptom.label}</span>
                        </button>
                    ))}
                </div>

                {showTriggerField && (
                    <div className="mt-6 p-4 bg-orange-50 rounded-2xl border border-orange-100 animate-slideUp">
                        <div className="flex items-center gap-2 mb-2 text-orange-600">
                            <AlertCircle size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Identificar Gatilho</span>
                        </div>
                        <input
                            type="text"
                            value={trigger}
                            onChange={(e) => setTrigger(e.target.value)}
                            placeholder="Ex: Doce, gordura, cheiro forte..."
                            className="w-full bg-white border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500 shadow-inner"
                        />
                    </div>
                )}
            </div>

            {/* Food Noise Card */}
            <div className="glass-panel p-6 rounded-[32px] shadow-soft stagger-3 fade-in">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <label className="block text-sm font-bold text-slate-600 uppercase tracking-wide font-outfit">Food Noise</label>
                        <button
                            onClick={() => setShowFoodNoiseInfo(true)}
                            className="text-slate-400 hover:text-brand transition-colors"
                        >
                            <Info size={16} />
                        </button>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-white transition-colors ${getSliderColor()}`}>
                        {foodNoise <= 3 ? 'Silencioso' : foodNoise <= 7 ? 'Moderado' : 'Alto'}
                    </span>
                </div>

                <div className="flex items-center gap-4 mb-2">
                    <div className="relative h-2 flex-1 bg-slate-100 rounded-full">
                        <div
                            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${getSliderColor()}`}
                            style={{ width: `${(foodNoise / 10) * 100}%` }}
                        />
                        <input
                            type="range"
                            min="0"
                            max="10"
                            value={foodNoise}
                            onChange={(e) => setFoodNoise(e.target.value)}
                            className="absolute -top-2 left-0 w-full h-6 opacity-0 cursor-pointer z-10"
                        />
                        <div
                            className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 rounded-full shadow-md transition-all pointer-events-none`}
                            style={{
                                left: `calc(${(foodNoise / 10) * 100}% - 12px)`,
                                borderColor: foodNoise <= 3 ? '#f97316' : foodNoise <= 7 ? '#f97316' : '#ef4444' // Using theme colors directly as fallback
                            }}
                        />
                    </div>
                    <div className={`w-10 text-center text-2xl font-black tabular-nums transition-colors ${foodNoise <= 3 ? 'text-brand-500' : foodNoise <= 7 ? 'text-orange-500' : 'text-red-500'}`}>
                        {foodNoise}
                    </div>
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest px-1 pr-14">
                    <span>Silencioso</span>
                    <span>Intenso</span>
                </div>
            </div>

            {/* Daily Note */}
            <div className="glass-panel p-6 rounded-[32px] shadow-soft stagger-4 fade-in">
                <label className="block text-sm font-bold text-slate-600 mb-3 uppercase tracking-wide font-outfit">Diário Rápido</label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-brand-500 transition-shadow resize-none"
                    rows="3"
                    placeholder="Como você se sentiu hoje? Ex: Senti um pouco de tontura ao levantar..."
                ></textarea>
            </div>

            <Button
                onClick={handleSave}
                disabled={isSaving}
                className="stagger-5 fade-in w-full py-5 rounded-[24px] text-lg shadow-xl !bg-slate-900 !from-slate-900 !to-slate-800"
            >
                {isSaving ? 'Salvando...' : 'Salvar Registro'}
            </Button>

            {/* Modal de Informação: Food Noise */}
            <Modal
                isOpen={showFoodNoiseInfo}
                onClose={() => setShowFoodNoiseInfo(false)}
                title="O que é Food Noise?"
            >
                <div className="space-y-4 text-slate-600">
                    <p className="text-sm leading-relaxed">
                        O "ruído alimentar" são aqueles pensamentos constantes e intrusivos sobre comida que podem dificultar o controle do peso.
                    </p>
                    <div className="space-y-3">
                        <div className="flex gap-3 items-center bg-brand-50 p-3 rounded-xl border border-brand-100">
                            <div className="font-bold text-brand-600 text-sm shrink-0 min-w-[36px]">0-3</div>
                            <p className="text-xs"><strong>Silencioso:</strong> Você só pensa em comida quando está com fome física real.</p>
                        </div>
                        <div className="flex gap-3 items-center bg-orange-50 p-3 rounded-xl border border-orange-100">
                            <div className="font-bold text-orange-500 text-sm shrink-0 min-w-[36px]">4-7</div>
                            <p className="text-xs"><strong>Moderado:</strong> Pensamentos ocasionais sobre comida ou desejo por snacks específicos.</p>
                        </div>
                        <div className="flex gap-3 items-center bg-red-50 p-3 rounded-xl border border-red-100">
                            <div className="font-bold text-red-500 text-sm shrink-0 min-w-[36px]">8-10</div>
                            <p className="text-xs"><strong>Alto:</strong> Pensamentos constantes sobre a próxima refeição ou snacks.</p>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Logs;
