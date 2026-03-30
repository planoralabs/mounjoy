import React, { useState } from 'react';
import { Settings, Bell, LogOut, Check, TrendingUp, Scale, Camera, ChevronRight } from 'lucide-react';
import { Modal, Button } from './ui/BaseComponents';
import BodySelector from './ui/BodySelector';
import { suggestNextInjection, getSiteById } from '../services/InjectionService';
import { userService } from '../services/userService';
import { MOCK_MEDICATIONS } from '../constants/medications';

const Profile = ({ user, onReset, setUser, theme, setTheme }) => {
    const [showProtocolModal, setShowProtocolModal] = useState(false);
    const [showDoseModal, setShowDoseModal] = useState(false);
    const [showMeasureModal, setShowMeasureModal] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteStep, setDeleteStep] = useState(1); // 1 or 2
    const [isDeleting, setIsDeleting] = useState(false);

    const [selectedMed, setSelectedMed] = useState(user.medicationId);
    const [selectedDose, setSelectedDose] = useState(user.currentDose);
    const [routeFilter, setRouteFilter] = useState('all');
    const [selectedSiteId, setSelectedSiteId] = useState(null);
    const [measures, setMeasures] = useState({ waist: '', hip: '' });

    const [reminderSettings, setReminderSettings] = useState({
        enabled: user.settings?.remindersEnabled ?? true,
        time: user.settings?.reminderTime || '09:00'
    });

    const filteredMeds = React.useMemo(() => {
        if (routeFilter === 'all') return MOCK_MEDICATIONS;
        return MOCK_MEDICATIONS.filter(m => m.route === routeFilter);
    }, [routeFilter]);

    const injectionSuggestion = React.useMemo(() => {
        return suggestNextInjection(user.doseHistory || []);
    }, [user.doseHistory]);

    const handleUpdateProtocol = () => {
        const updatedUser = {
            ...user,
            medicationId: selectedMed,
            currentDose: selectedDose
        };
        setUser(updatedUser);
        setShowProtocolModal(false);
    };

    const handleSaveMeasures = () => {
        const now = new Date().toISOString();
        const updatedUser = {
            ...user,
            measurements: [
                {
                    date: now,
                    waist: parseFloat(measures.waist),
                    hip: parseFloat(measures.hip),
                    weight: user.currentWeight
                },
                ...(user.measurements || [])
            ]
        };
        setUser(updatedUser);
        setShowMeasureModal(false);
    };

    const handleAddDoseRecord = () => {
        const siteId = selectedSiteId || injectionSuggestion.id;
        const site = getSiteById(siteId);

        const newRecord = {
            date: new Date().toISOString(),
            dose: user.currentDose,
            medication: user.medicationId,
            siteId: siteId,
            area: site?.area || 'N/A',
            side: site?.side || 'N/A'
        };
        const updatedUser = {
            ...user,
            doseHistory: [newRecord, ...(user.doseHistory || [])]
        };
        setUser(updatedUser);
        setShowDoseModal(false);
        setSelectedSiteId(null);
    };

    const handleSaveReminders = () => {
        setUser({
            ...user,
            settings: {
                ...(user.settings || {}),
                remindersEnabled: reminderSettings.enabled,
                reminderTime: reminderSettings.time
            }
        });
        setShowReminderModal(false);
    };

    const updateGoal = (key, value) => {
        setUser({
            ...user,
            settings: {
                ...(user.settings || {}),
                [key]: value
            }
        });
    };

    const handlePhotoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 400; // Smaller for profile pic
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxSize) { height *= maxSize / width; width = maxSize; }
                } else {
                    if (height > maxSize) { width *= maxSize / height; height = maxSize; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/webp', 0.6);

                setUser({
                    ...user,
                    photoURL: dataUrl
                });
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            await userService.deleteUserAccount(user.uid);
            onReset(); // Logout and clear local session
        } catch (error) {
            alert('Erro ao apagar conta. Tente novamente.');
            setIsDeleting(false);
            setShowDeleteModal(false);
            setDeleteStep(1);
        }
    };

    const currentMedInfo = MOCK_MEDICATIONS.find(m => m.id === selectedMed) || MOCK_MEDICATIONS[0];

    return (
        <div className="fade-in">
            <div className="text-center mt-8 mb-8">
                <div className="relative w-28 h-28 mx-auto mb-4">
                    <div className="absolute inset-0 bg-brand-200 rounded-full blur-xl opacity-50"></div>
                    <div className="relative w-full h-full bg-gradient-to-tr from-brand-600 to-brand-400 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-xl border-4 border-white overflow-hidden">
                        {user.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt={user.name}
                                className="w-full h-full object-cover"
                                onError={(e) => e.target.style.display = 'none'}
                            />
                        ) : (
                            user.name?.charAt(0).toUpperCase() || 'U'
                        )}
                    </div>
                    <label
                        htmlFor="profile-photo-upload"
                        className="absolute bottom-0 right-0 w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-500 cursor-pointer hover:text-brand-600 transition-colors border-2 border-slate-50 active:scale-90"
                        title="Alterar foto de perfil"
                    >
                        <Camera size={18} />
                        <input
                            type="file"
                            id="profile-photo-upload"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoUpload}
                        />
                    </label>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 font-outfit">{user.name}</h2>
                <p className="text-brand-600 font-medium bg-brand-50 inline-block px-3 py-1 rounded-full text-sm mt-2">
                    Protocolo • {user.medicationId.charAt(0).toUpperCase() + user.medicationId.slice(1)} ({user.currentDose})
                </p>
            </div>

            <div className="space-y-6 pb-24">
                {/* Primary Action */}
                <button
                    onClick={() => setShowDoseModal(true)}
                    className="w-full bg-white border border-slate-100 p-5 rounded-[32px] shadow-sm flex items-center justify-between group hover:border-brand-200 hover:shadow-md transition-all relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50/50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand shadow-sm">
                            <Check size={24} className="group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="text-left">
                            <span className="block font-black text-slate-800 text-base tracking-tight leading-none mb-1">Registrar Dose</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Marcar aplicação de hoje</span>
                        </div>
                    </div>
                    <span className="text-slate-200 group-hover:translate-x-1 group-hover:text-brand transition-all relative z-10">
                        <ChevronRight size={20} />
                    </span>
                </button>

                {/* Health Goals Section */}
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={18} className="text-brand" />
                        <h3 className="font-bold text-slate-800">Metas de Saúde</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Proteína (g)</label>
                            <div className="flex items-center gap-2">
                                <button onClick={() => updateGoal('proteinGoal', Math.max(40, (user.settings?.proteinGoal || 100) - 5))} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 font-bold">−</button>
                                <span className="flex-1 text-center font-black text-slate-900">{user.settings?.proteinGoal || 100}</span>
                                <button onClick={() => updateGoal('proteinGoal', (user.settings?.proteinGoal || 100) + 5)} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 font-bold">+</button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Água (Litros)</label>
                            <div className="flex items-center gap-2">
                                <button onClick={() => updateGoal('waterGoal', Math.max(1, (user.settings?.waterGoal || 2.5) - 0.1))} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 font-bold">−</button>
                                <span className="flex-1 text-center font-black text-slate-900">{(user.settings?.waterGoal || 2.5).toFixed(1)}</span>
                                <button onClick={() => updateGoal('waterGoal', (user.settings?.waterGoal || 2.5) + 0.1)} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 font-bold">+</button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-50">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Fibra (g)</label>
                        <div className="flex items-center gap-2">
                            <button onClick={() => updateGoal('fiberGoal', Math.max(10, (user.settings?.fiberGoal || 25) - 1))} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 font-bold">−</button>
                            <span className="flex-1 text-center font-black text-slate-900">{user.settings?.fiberGoal || 25}</span>
                            <button onClick={() => updateGoal('fiberGoal', (user.settings?.fiberGoal || 25) + 1)} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 font-bold">+</button>
                        </div>
                    </div>
                </div>

                {/* theme Selection */}
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Settings size={18} className="text-brand" />
                        <h3 className="font-bold text-slate-800">Tema do App</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <button
                            onClick={() => setTheme('default')}
                            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${theme === 'default' ? 'border-brand bg-brand/5' : 'border-slate-50'}`}
                        >
                            <div className="w-8 h-8 rounded-full bg-[#0d9488]"></div>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">Nature</span>
                        </button>
                        <button
                            onClick={() => setTheme('blue')}
                            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${theme === 'blue' ? 'border-brand bg-brand/5' : 'border-slate-50'}`}
                        >
                            <div className="w-8 h-8 rounded-full bg-[#2563eb]"></div>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">Pro Blue</span>
                        </button>
                        <button
                            onClick={() => setTheme('slate')}
                            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${theme === 'slate' ? 'border-brand bg-brand/5' : 'border-slate-50'}`}
                        >
                            <div className="w-8 h-8 rounded-full bg-[#475569]"></div>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">Nordic</span>
                        </button>
                    </div>
                </div>

                {/* Other Settings */}
                <div className="space-y-3">
                    <button
                        onClick={() => setShowProtocolModal(true)}
                        className="w-full bg-white p-4 rounded-[24px] shadow-sm border border-slate-100 flex items-center justify-between group hover:border-brand-200 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                <Settings size={18} />
                            </div>
                            <span className="font-medium text-slate-700">Configurar Protocolo</span>
                        </div>
                        <span className="text-slate-300 group-hover:translate-x-1 transition-transform">›</span>
                    </button>

                    <button
                        onClick={() => setShowMeasureModal(true)}
                        className="w-full bg-white p-4 rounded-[24px] shadow-sm border border-slate-100 flex items-center justify-between group hover:border-brand-200 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                <Scale size={18} />
                            </div>
                            <span className="font-medium text-slate-700">Progresso Corporal (Medidas)</span>
                        </div>
                        <span className="text-slate-300 group-hover:translate-x-1 transition-transform">›</span>
                    </button>

                    <button
                        onClick={() => setShowReminderModal(true)}
                        className="w-full bg-white p-4 rounded-[24px] shadow-sm border border-slate-100 flex items-center justify-between group hover:border-brand-200 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                <Bell size={18} />
                            </div>
                            <span className="font-medium text-slate-700">Lembretes</span>
                        </div>
                        <span className="text-slate-300 group-hover:translate-x-1 transition-transform">›</span>
                    </button>

                    <button
                        onClick={onReset}
                        className="w-full mt-4 p-4 rounded-[24px] border border-red-100 text-red-500 font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors transition-all active:scale-95"
                    >
                        <LogOut size={18} />
                        Sair da Conta
                    </button>

                    <button
                        onClick={() => { setShowDeleteModal(true); setDeleteStep(1); }}
                        className="w-full mt-2 p-4 rounded-[24px] text-slate-300 font-bold flex items-center justify-center gap-2 hover:text-red-300 transition-colors text-xs transition-all active:scale-95"
                    >
                        Apagar Minha Conta e Dados Permanentemente
                    </button>
                </div>
            </div >

            {/* Modal: Confirmação de Exclusão Dupla (Pillar 02 Privacy) */}
            <Modal isOpen={showDeleteModal} onClose={() => { if (!isDeleting) setShowDeleteModal(false); }} title={deleteStep === 1 ? "🚨 Aviso Importante" : "⚠️ Última Chance"}>
                <div className="space-y-6">
                    <div className="bg-red-50 p-6 rounded-[32px] border border-red-100 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-red-500 mb-4 shadow-sm animate-pulse">
                            <LogOut size={32} />
                        </div>
                        <h3 className="text-xl font-black text-red-600 mb-2">Ação Irreversível</h3>
                        <p className="text-sm font-medium text-red-900/70 leading-relaxed">
                            {deleteStep === 1 
                                ? "Ao apagar sua conta, todas as suas fotos de evolução, registros de doses, peso e histórico clínico serão DELETADOS PARA SEMPRE."
                                : "Nós NÃO poderemos recuperar seus dados caso você mude de ideia depois. Você tem certeza ABSOLUTA de que deseja prosseguir?"}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        {deleteStep === 1 ? (
                            <Button onClick={() => setDeleteStep(2)} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5">
                                Eu entendo, quero prosseguir
                            </Button>
                        ) : (
                            <Button 
                                onClick={handleDeleteAccount} 
                                disabled={isDeleting}
                                className="w-full bg-red-900 hover:bg-black text-white font-black py-5"
                            >
                                {isDeleting ? "Apagando tudo..." : "APAGAR TUDO AGORA"}
                            </Button>
                        )}
                        <Button variant="ghost" onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="w-full">
                            Cancelar e Voltar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal: Medidas Corporais */}
            < Modal isOpen={showMeasureModal} onClose={() => setShowMeasureModal(false)} title="Progresso Corporal" >
                <div className="space-y-5">
                    <p className="text-xs text-slate-500 text-center mb-2">Monitore suas medidas para ver a perda de gordura além da balança.</p>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cintura (cm)</label>
                            <input
                                type="number"
                                placeholder="00"
                                value={measures.waist}
                                onChange={(e) => setMeasures({ ...measures, waist: e.target.value })}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-center font-bold text-slate-800 focus:ring-2 focus:ring-brand-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quadril (cm)</label>
                            <input
                                type="number"
                                placeholder="00"
                                value={measures.hip}
                                onChange={(e) => setMeasures({ ...measures, hip: e.target.value })}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-center font-bold text-slate-800 focus:ring-2 focus:ring-brand-500"
                            />
                        </div>
                    </div>

                    <Button onClick={handleSaveMeasures} className="w-full">Salvar Medidas</Button>
                </div>
            </Modal >

            {/* Modal: Lembretes */}
            < Modal isOpen={showReminderModal} onClose={() => setShowReminderModal(false)} title="Configurar Lembretes" >
                <div className="space-y-6">
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl">
                        <div>
                            <p className="font-bold text-slate-800">Notificações</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Alertas no app</p>
                        </div>
                        <button
                            onClick={() => setReminderSettings(s => ({ ...s, enabled: !s.enabled }))}
                            className={`w-12 h-6 rounded-full transition-colors relative ${reminderSettings.enabled ? 'bg-brand' : 'bg-slate-200'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${reminderSettings.enabled ? 'translate-x-7' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Horário Preferencial</label>
                        <input
                            type="time"
                            value={reminderSettings.time}
                            onChange={(e) => setReminderSettings(s => ({ ...s, time: e.target.value }))}
                            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-center font-bold text-slate-800 focus:ring-2 focus:ring-brand-500"
                        />
                        <p className="text-[10px] text-slate-400 text-center italic mt-1">Este é o horário que o banner aparecerá no seu dia de dose.</p>
                    </div>

                    <Button onClick={handleSaveReminders} className="w-full">Salvar Configurações</Button>
                </div>
            </Modal >

            {/* Modal: Registrar Aplicação */}
            < Modal isOpen={showDoseModal} onClose={() => setShowDoseModal(false)} title="Nova Aplicação" >
                <div className="space-y-4">
                    <div className="text-center bg-slate-50 p-3 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Dose Atual</p>
                        <p className="text-xl font-black text-slate-800">{user.currentDose} <span className="text-sm font-medium text-slate-400">({user.medicationId})</span></p>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-4">Escolha o Local da Aplicação</label>
                        <BodySelector
                            selectedSiteId={selectedSiteId || injectionSuggestion.id}
                            onSelect={setSelectedSiteId}
                            suggestedSiteId={injectionSuggestion.id}
                            lastSiteId={user.doseHistory?.[0]?.siteId}
                        />
                    </div>

                    <Button onClick={handleAddDoseRecord} className="w-full">Confirmar Aplicação</Button>
                </div>
            </Modal >

            {/* Modal: Protocolo */}
            < Modal isOpen={showProtocolModal} onClose={() => setShowProtocolModal(false)} title="Configurar Protocolo" >
                <div className="space-y-6">
                    <div className="flex p-1 bg-slate-100 rounded-2xl">
                        <button onClick={() => setRouteFilter('all')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${routeFilter === 'all' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}>Todos</button>
                        <button onClick={() => setRouteFilter('injectable')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${routeFilter === 'injectable' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}>Injetável</button>
                        <button onClick={() => setRouteFilter('oral')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${routeFilter === 'oral' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}>Via Oral</button>
                    </div>
                    <div>
                        <div className="flex justify-between items-end mb-3">
                            <label className="text-xs font-bold text-slate-500 uppercase">Medicamento</label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {filteredMeds.map(med => (
                                <button key={med.id} onClick={() => { setSelectedMed(med.id); setSelectedDose(med.doses[0]); }} className={`p-3 rounded-2xl border-2 text-sm font-bold transition-all ${selectedMed === med.id ? 'border-brand bg-brand text-white shadow-md' : 'border-slate-100 bg-white text-slate-500'}`}>{med.name}</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Dosagem</label>
                        <div className="grid grid-cols-3 gap-2">
                            {currentMedInfo?.doses.map(dose => (
                                <button key={dose} onClick={() => setSelectedDose(dose)} className={`p-3 rounded-xl border-2 text-xs font-bold transition-all ${selectedDose === dose ? 'border-brand-600 bg-brand-600 text-white shadow-md' : 'border-slate-100 bg-white text-slate-500'}`}>{dose}</button>
                            ))}
                        </div>
                    </div>
                    <Button onClick={handleUpdateProtocol} className="w-full">Salvar Alterações</Button>
                </div>
            </Modal >
        </div >
    );
};

export default Profile;
