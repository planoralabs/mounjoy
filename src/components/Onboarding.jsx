import React, { useState, useRef } from 'react';
import { Activity, ArrowRight, Check, Syringe, Droplet, Info } from 'lucide-react';
import { Button, Input, Slider } from './ui/BaseComponents';
import { MOCK_MEDICATIONS } from '../constants/medications';

const Onboarding = ({ onComplete, theme }) => {
    const [step, setStep] = useState(0);
    const [data, setData] = useState({
        name: '',
        height: '1.70',
        startWeight: '80.0',
        goalWeight: '70.0',
        medicationId: '',
        currentDose: '',
        injectionDay: ''
    });

    const [filterAdmin, setFilterAdmin] = useState('all'); // weekly, daily_inj, daily_oral
    const [filterFocus, setFilterFocus] = useState('all'); // weight, diabetes
    const [selectedSubstance, setSelectedSubstance] = useState(null);

    const scrollRef = useRef(null);

    const handleSubstanceClick = (substance) => {
        const isOpening = selectedSubstance !== substance;
        setSelectedSubstance(selectedSubstance === substance ? null : substance);
        
        if (isOpening && scrollRef.current) {
            setTimeout(() => {
                scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
        }
    };

    const handleChange = (field, value) => {
        setData({ ...data, [field]: value });
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    const filteredMeds = MOCK_MEDICATIONS.filter(med => {
        const matchesAdmin =
            filterAdmin === 'all' ||
            (filterAdmin === 'weekly' && med.route === 'injectable' && med.frequency === 'weekly') ||
            (filterAdmin === 'daily_inj' && med.route === 'injectable' && med.frequency === 'daily') ||
            (filterAdmin === 'daily_oral' && med.route === 'oral');

        const matchesFocus = filterFocus === 'all' || med.focus === filterFocus;

        return matchesAdmin && matchesFocus;
    });

    const isNextDisabled = () => {
        if (step === 1) return !data.name;
        if (step === 4) return !data.medicationId;
        if (step === 5) return !data.currentDose;
        return false;
    };

    const selectedMed = MOCK_MEDICATIONS.find(m => m.id === data.medicationId);

    const steps = [
        // Step 0: Welcome
        <div className="flex flex-col h-full justify-center items-center text-center fade-in pb-20">
            {theme === 'fun' ? (
                <div className="relative mb-8">
                    <img src="/mascot.png" alt="Mascot Mascot" className="h-48 w-auto relative z-10 drop-shadow-2xl animate-in fade-in zoom-in-75 duration-1000" />
                </div>
            ) : (
                <img src="/logomount.png" alt="Mounjoy Logo" className="h-20 w-auto object-contain mb-8 text-brand-500" />
            )}
            <h1 className={`text-3xl font-black mb-2 ${theme === 'fun' ? 'text-orange-500' : 'text-slate-800'}`}>
                {theme === 'fun' ? "Olá, vamos começar?" : "Bem-vindo ao Mounjoy"}
            </h1>
            <p className="text-slate-500 mb-8 max-w-xs font-medium">
                {theme === 'fun'
                    ? "Vou te ajudar a ficar incrível e acompanhar cada passo da sua evolução!"
                    : "Seu companheiro diário na jornada de transformação e saúde metabólica."}
            </p>
        </div>,
        // Step 1: Name Only
        <div className="flex flex-col h-full pt-10 fade-in">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Sobre você</h2>
            <Input label="Como podemos te chamar?" placeholder="Seu nome" value={data.name} onChange={(e) => handleChange('name', e.target.value)} />
        </div>,

        // Step 2: Current Physical Data (Sliders)
        <div className="flex flex-col pt-10 fade-in">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Seus Dados</h2>
            <Slider
                label="Peso Atual"
                value={data.startWeight}
                onChange={(v) => handleChange('startWeight', v)}
                min={40}
                max={250}
                step={0.1}
                suffix="kg"
            />
            <Slider
                label="Altura"
                value={data.height}
                onChange={(v) => handleChange('height', v)}
                min={1.0}
                max={2.3}
                step={0.01}
                suffix="m"
            />
        </div>,

        // Step 3: Goal Weight (Slider)
        <div className="flex flex-col pt-10 fade-in items-center">
            <div className="w-full text-left">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 text-left">Sua Meta</h2>
                <Slider
                    label="Meta de Peso"
                    value={data.goalWeight}
                    onChange={(v) => handleChange('goalWeight', v)}
                    min={40}
                    max={200}
                    step={0.1}
                    suffix="kg"
                />
            </div>
            {theme === 'fun' && (
                <div className="mt-4 animate-in fade-in zoom-in-75 duration-1000">
                    <img src="/mascotweight.png" alt="Mascot Weight" className="h-44 w-auto object-contain drop-shadow-2xl" />
                </div>
            )}
        </div>,

        // Step 4: Medication Selection (Focused Interaction)
        <div className="flex flex-col h-full pt-10 fade-in relative">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Qual seu protocolo?</h2>

            {/* Filter UI - Persistent during Focus Mode */}
            <div className={`transition-all duration-300 mb-6`}>
                <div className="space-y-4">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Via de Administração</span>
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                { id: 'all', label: 'Todos' },
                                { id: 'weekly', label: 'Injeção Semanal' },
                                { id: 'daily_inj', label: 'Injeção Diária' },
                                { id: 'daily_oral', label: 'Comprimido' }
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilterAdmin(f.id)}
                                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${filterAdmin === f.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-400 border-slate-100 hover:border-brand-200'
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Objetivo Principal</span>
                        <div className="flex gap-1.5">
                            {[
                                { id: 'all', label: 'Todos' },
                                { id: 'weight', label: 'Perda de Peso' },
                                { id: 'diabetes', label: 'Glicose / Diabetes' }
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilterFocus(f.id)}
                                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${filterFocus === f.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-400 border-slate-100 hover:border-brand-200'
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Click outside to reset selection */}
            {selectedSubstance && (
                <div
                    className="fixed inset-0 z-25"
                    onClick={() => setSelectedSubstance(null)}
                />
            )}

            <div className={`grid transition-all duration-500 gap-3 relative p-1 ${selectedSubstance ? 'z-30 pointer-events-none' : 'z-20'
                } ${selectedSubstance ? 'grid-cols-1 items-center justify-center' : 'grid-cols-2'}`}>
                {Object.entries(
                    filteredMeds.reduce((acc, med) => {
                        (acc[med.substance] = acc[med.substance] || []).push(med);
                        return acc;
                    }, {})
                ).map(([substance, meds]) => {
                    const isFocused = selectedSubstance === substance;
                    const hasSelection = meds.some(m => m.id === data.medicationId);

                    if (selectedSubstance && !isFocused) return null;

                    return (
                        <div
                            key={substance}
                            onClick={() => handleSubstanceClick(substance)}
                            className={`p-4 rounded-[32px] transition-all duration-500 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden h-fit min-h-[100px] cursor-pointer ${isFocused
                                ? 'bg-brand-50 border-brand-600 border-2 ring-2 ring-brand-500/5 scale-105 my-4 shadow-xl z-30 w-full max-w-[210px] mx-auto pointer-events-auto'
                                : 'bg-white border-white border-2 hover:border-slate-100'
                                } ${!selectedSubstance ? 'opacity-100' : ''}`}
                        >
                            <div className="flex-1 flex flex-col items-center justify-center">
                                <h3 className={`font-black tracking-tight transition-all leading-tight ${isFocused ? 'text-xl text-brand-950 mb-4' : 'text-lg text-slate-800'
                                    }`}>
                                    {substance}
                                </h3>

                                {!isFocused && meds.find(m => m.id === data.medicationId) && (
                                    <div className="text-[10px] font-bold text-brand-600 mt-1 uppercase tracking-tight animate-in fade-in slide-in-from-top-1 duration-500">
                                        {meds.find(m => m.id === data.medicationId).brand}
                                    </div>
                                )}
                            </div>

                            {isFocused && (
                                <div className="flex transition-all duration-500 relative flex-col items-center gap-y-3 mt-4 max-h-96 opacity-100 w-full">
                                    {meds.map((med) => {
                                        const isSelected = data.medicationId === med.id;

                                        return (
                                            <button
                                                key={med.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleChange('medicationId', med.id);
                                                    setSelectedSubstance(null);
                                                }}
                                                className={`font-bold transition-all duration-500 relative group py-2.5 px-6 rounded-2xl text-[12px] bg-white/80 hover:bg-white border w-full active:scale-95 transform-gpu ${isSelected
                                                    ? 'text-brand-700 border-brand-600 bg-brand-50/50 max-w-[170px] scale-100 shadow-md ring-1 ring-brand-600/10'
                                                    : 'text-slate-600 hover:text-slate-800 border-slate-200 max-w-[190px] scale-105 shadow-sm'
                                                    }`}
                                                style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                                            >
                                                {med.brand}
                                                {isSelected && (
                                                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center text-white shadow-sm scale-in">
                                                        <Check size={12} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>,

        // Step 5: Dosage & Schedule
        <div className="flex flex-col pt-10 fade-in">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Detalhes da Dose</h2>

            {data.medicationId && (
                <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Dosagem Atual</label>
                    <div className="grid grid-cols-3 gap-2">
                        {MOCK_MEDICATIONS.find(m => m.id === data.medicationId).doses.map((dose) => (
                            <button
                                key={dose}
                                onClick={() => handleChange('currentDose', dose)}
                                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all ${data.currentDose === dose ? 'bg-brand-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100'
                                    }`}
                            >
                                {dose}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Dia da Aplicação / Consumo</label>
                <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
                    {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(day => (
                        <button
                            key={day}
                            onClick={() => handleChange('injectionDay', day)}
                            className={`min-w-[50px] h-[50px] rounded-full flex items-center justify-center text-xs font-bold border transition-all ${data.injectionDay === day ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-100'
                                }`}
                        >
                            {day.slice(0, 3)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Protocol Summary Preview - Only show when fully ready */}
            {data.currentDose && data.injectionDay && selectedMed && (
                <div className={`mt-4 p-5 rounded-3xl border shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 relative overflow-hidden ${theme === 'fun' ? 'bg-orange-50 border-orange-100' : 'bg-white border-slate-100'}`}>
                    <p className={`text-sm leading-relaxed relative z-10 ${theme === 'fun' ? 'text-orange-950 font-medium' : 'text-slate-600'}`}>
                        {theme === 'fun' ? "Tudo pronto! Seu plano com " : "Você iniciará seu protocolo com "}
                        <strong className={theme === 'fun' ? 'text-orange-600' : 'text-slate-900'}>{selectedMed.brand}</strong>
                        {theme === 'fun' ? " está montado, " : " (" + selectedMed.substance + "), "}
                        na dose de <strong className={theme === 'fun' ? 'text-orange-600' : 'text-brand-600'}>{data.currentDose}</strong>
                        {theme === 'fun'
                            ? `, começando na próxima ${data.injectionDay}. Vamos nessa!`
                            : ", com aplicações toda " + data.injectionDay + "."}
                    </p>
                </div>
            )}
        </div>
    ];

    return (
        <div className="h-screen bg-slate-50 flex flex-col font-outfit overflow-hidden">
            <div className="w-full max-w-md mx-auto h-full flex flex-col px-6 pt-8 relative">
                {/* Progress Bar (Fixed at Top) */}
                <div
                    className="w-full bg-slate-200 rounded-full mb-6 overflow-hidden transition-all duration-700 ease-in-out shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] shrink-0"
                    style={{ height: `${16 - (step / (steps.length - 1)) * 14}px` }}
                >
                    <div
                        className={`h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(0,0,0,0.1)] ${theme === 'fun' ? 'bg-orange-500 shadow-orange-500/30' : 'bg-brand-500 shadow-brand-500/30'}`}
                        style={{ width: `${(step / (steps.length - 1)) * 100}%` }}
                    />
                </div>

                {/* Content Area (Scrollable) */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar pb-32">
                    {steps[step]}
                </div>

                {/* Bottom Navigation (Fixed at Bottom) */}
                <div className="shrink-0 pt-4 pb-8 flex flex-col relative z-40 bg-slate-50">
                    {/* Background Mascot for Summary Step */}
                    {theme === 'fun' && step === steps.length - 1 && data.currentDose && data.injectionDay && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 translate-y-16 -z-10 pointer-events-none opacity-20 transform-gpu animate-in fade-in slide-in-from-bottom-20 duration-1000">
                            <img src="/mascotstretch.png" alt="Happy Mascot" className="h-64 object-contain" />
                        </div>
                    )}

                    {/* Visual Confirmation Summary for Step 4 */}
                    {step === 4 && data.medicationId && (
                        <div className="mb-4 flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Selecionado</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-black text-brand-600 italic">{selectedMed?.brand}</span>
                                <span className="text-slate-300">|</span>
                                <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">{selectedMed?.substance}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        {step > 0 && (
                            <Button
                                variant="ghost"
                                onClick={prevStep}
                                className={`px-10 border-2 bg-white shadow-sm rounded-[28px] transition-all duration-300 ${theme === 'fun' ? 'border-orange-100 text-orange-400 hover:border-orange-400 hover:text-orange-600' : 'border-slate-100 text-slate-400 hover:border-brand-500 hover:text-brand-600'}`}
                            >
                                Voltar
                            </Button>
                        )}
                        <Button
                            onClick={step === steps.length - 1 ? () => onComplete(data) : nextStep}
                            className={`flex-1 shadow-lg transition-all active:scale-95 ${step === 0 ? 'w-full' : ''} ${isNextDisabled() ? 'grayscale opacity-50' : (theme === 'fun' ? 'bg-orange-500 shadow-orange-500/20' : 'bg-brand-600 shadow-brand-500/20')}`}
                            disabled={isNextDisabled()}
                        >
                            {step === 0 ? 'Começar configuração' : step === steps.length - 1 ? 'Finalizar' : 'Próximo'}
                            {step === 0 && <ArrowRight size={18} />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
