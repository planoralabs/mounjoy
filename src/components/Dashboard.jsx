import React, { useState, useMemo } from 'react';
import { Activity, Plus, Heart, Droplet, Info, Thermometer, Zap, TrendingUp, Syringe, Calendar, Camera, ChevronLeft, ChevronRight, Trash2, PenLine } from 'lucide-react';
import { Modal, Input, Button, VerticalMeter, Slider } from './ui/BaseComponents';
import AlertBox from './ui/AlertBox';
import BodySelector from './ui/BodySelector';
import InjectionSwipeCard from './ui/InjectionSwipeCard';
import { suggestNextInjection, getSiteById } from '../services/InjectionService';
import { ReminderService } from '../services/ReminderService';
import DoseAlert from './ui/DoseAlert';
import { MOCK_MEDICATIONS } from '../constants/medications';
const scalerImg = '/scaler.png';
const waterImg = '/water.png';
const proteinImg = '/protein.png';
const penImg = '/pen.png';
const fiberImg = '/fiber.png';
const mascotHydrated = '/mascothydrated.png';
const mascotZen = '/mascotzen.png';
const mascotFoodNoise = '/mascotfoodnoise.png';
const mascotRemember = '/remember.png';
const mascotStretch = '/mascotstretch.png';
const mascotStrong = '/mascotstrong.png';
const mascotAchieve = '/mascotachieve.png';

const TIPS = [
    "Beba pelo menos 2.5L de água para ajudar os rins a processar a quebra de gordura.",
    "Priorize proteínas em todas as refeições para evitar a perda de massa muscular.",
    "Se sentir náusea, experimente comer porções menores e evitar frituras.",
    "A constipação é comum; aumente a ingestão de fibras e considere um suplemento.",
    "Mantenha um sono regular; o descanso é fundamental para o equilíbrio hormonal."
];

const ConfettiExplosion = React.memo(() => {
    const particles = useMemo(() => {
        return [...Array(40)].map((_, i) => ({
            id: i,
            tx: `${(Math.random() - 0.5) * 300}px`,
            ty: `${(Math.random() - 0.5) * 300}px`,
            r: `${(Math.random() - 0.5) * 720}deg`,
            delay: `${Math.random() * 0.15}s`,
            color: Math.random() > 0.5 ? 'bg-white' : 'bg-white/40',
            size: Math.random() > 0.5 ? 'w-2 h-2' : 'w-1.5 h-1.5'
        }));
    }, []);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <style>{`
                @keyframes confetti-pop {
                    0% { transform: translate(-50%, -50%) rotate(0deg) scale(0); opacity: 1; }
                    70% { opacity: 1; }
                    100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(var(--r)) scale(0.5); opacity: 0; }
                }
                .animate-pop {
                    animation: confetti-pop 1.5s cubic-bezier(0.15, 0.9, 0.3, 1) forwards;
                }
            `}</style>
            {particles.map(p => (
                <div
                    key={p.id}
                    className={`absolute left-1/2 top-1/2 rounded-sm animate-pop ${p.color} ${p.size}`}
                    style={{
                        '--tx': p.tx,
                        '--ty': p.ty,
                        '--r': p.r,
                        animationDelay: p.delay
                    }}
                />
            ))}
        </div>
    );
});

const Dashboard = ({ user, setUser, setActiveTab, theme }) => {
    const medication = MOCK_MEDICATIONS.find(m => m.id === user.medicationId);
    const [showWeightModal, setShowWeightModal] = useState(false);
    const [newWeight, setNewWeight] = useState('');
    const [showInjectionModal, setShowInjectionModal] = useState(false);
    const [selectedSiteId, setSelectedSiteId] = useState(null);
    const [showSpeedInfo, setShowSpeedInfo] = useState(false);
    const [showPlateauInfo, setShowPlateauInfo] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState((user.photos && user.photos.length > 0) ? user.photos.length - 1 : 0);
    const [animatingAsset, setAnimatingAsset] = useState(null);
    const [isFullscreenPhoto, setIsFullscreenPhoto] = useState(false);
    const [showDoseHelp, setShowDoseHelp] = useState(false);
    const [showBodyMap, setShowBodyMap] = useState(false);
    const [isEditingProtocol, setIsEditingProtocol] = useState(false);
    const [tempProtocol, setTempProtocol] = useState({ medicationId: user.medicationId, currentDose: user.currentDose });
    const [filterAdmin, setFilterAdmin] = useState('all');
    const [filterFocus, setFilterFocus] = useState('all');
    const [selectedSubstance, setSelectedSubstance] = useState(null);

    // Get date key for daily tracking
    const today = new Date().toISOString().split('T')[0];
    const dailyData = user.dailyIntakeHistory[today] || { water: 0, protein: 0, fiber: 0 };

    const waterPercentage = Math.min(100, (dailyData.water / (user.settings?.waterGoal || 2.5)) * 100);
    const isWaterComplete = waterPercentage >= 100;

    const proteinPercentage = Math.min(100, (dailyData.protein / (user.settings?.proteinGoal || 100)) * 100);
    const isProteinComplete = proteinPercentage >= 100;

    const fiberPercentage = Math.min(100, (dailyData.fiber / (user.settings?.fiberGoal || 25)) * 100);
    const isFiberComplete = fiberPercentage >= 100;

    const reminder = ReminderService.calculateNextDose(user.doseHistory || []);
    const timeRemaining = ReminderService.formatTimeRemaining(reminder.daysRemaining, reminder.status);

    const updateIntake = (type, amount) => {
        const currentAmount = dailyData[type] || 0;
        const newAmount = Math.max(0, currentAmount + amount);

        const updatedHistory = {
            ...user.dailyIntakeHistory,
            [today]: {
                ...(user.dailyIntakeHistory?.[today] || {}),
                [type]: parseFloat(newAmount.toFixed(1))
            }
        };

        setUser({
            ...user,
            dailyIntakeHistory: updatedHistory
        });

        setAnimatingAsset(type);
        setTimeout(() => setAnimatingAsset(null), 300);
    };

    const updateWeight = () => {
        if (!newWeight) return;
        const weightValue = parseFloat(newWeight);
        const now = new Date().toISOString();

        const updatedUser = {
            ...user,
            currentWeight: weightValue,
            history: [...(user.history || []), weightValue],
            lastWeightDate: now,
            measurements: [
                ...(user.measurements || []),
                { date: now, weight: weightValue }
            ]
        };

        setUser(updatedUser);
        setShowWeightModal(false);
        setNewWeight('');
    };

    const formatDate = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const handlePhotoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 600; // more conservative limits for Firestore base64 storage
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
                const dataUrl = canvas.toDataURL('image/webp', 0.7);

                const newPhoto = { url: dataUrl, date: new Date().toISOString() };
                const updatedPhotos = [...(user.photos || []), newPhoto];
                const finalPhotos = updatedPhotos.slice(-10); // rate limiting storage size
                const updatedUser = { ...user, photos: finalPhotos };
                setUser(updatedUser);
                localStorage.setItem('mounjoy_user2', JSON.stringify(updatedUser));
                setCurrentPhotoIndex(finalPhotos.length - 1);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const deletePhoto = () => {
        if (!user.photos || user.photos.length === 0) return;
        const updatedPhotos = user.photos.filter((_, index) => index !== currentPhotoIndex);
        const updatedUser = { ...user, photos: updatedPhotos };
        setUser(updatedUser);
        localStorage.setItem('mounjoy_user2', JSON.stringify(updatedUser));

        if (updatedPhotos.length === 0) {
            setIsFullscreenPhoto(false);
            setCurrentPhotoIndex(0);
        } else if (currentPhotoIndex >= updatedPhotos.length) {
            setCurrentPhotoIndex(updatedPhotos.length - 1);
        }
    };

    const nextPhoto = (e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        if (user.photos?.length > 1) {
            setCurrentPhotoIndex((prev) => (prev + 1) % user.photos.length);
        }
    };

    const prevPhoto = (e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        if (user.photos?.length > 1) {
            setCurrentPhotoIndex((prev) => (prev - 1 + user.photos.length) % user.photos.length);
        }
    };

    const totalLoss = (user.history[0] - user.currentWeight).toFixed(1);

    const getPhotoWeight = (photoDate) => {
        if (!user.measurements || user.measurements.length === 0) return null;
        const targetDate = new Date(photoDate);

        // Find closest measurement
        let closest = user.measurements[0];
        let minDiff = Math.abs(targetDate - new Date(closest.date));

        user.measurements.forEach(m => {
            const diff = Math.abs(targetDate - new Date(m.date));
            if (diff < minDiff) {
                minDiff = diff;
                closest = m;
            }
        });

        // Only return if it's within 3 days
        if (minDiff > 3 * 24 * 60 * 60 * 1000) return null;
        return closest.weight;
    };

    // INTELLIGENCE ENGINE
    const stats = useMemo(() => {
        const startWeight = user.history[0];
        const currentWeight = user.currentWeight;
        const totalKgLost = startWeight - currentWeight;

        // Loss Rate Calculation
        const startDate = new Date(user.startDate);
        const todayDate = new Date();
        const diffWeeks = Math.max(1, (todayDate - startDate) / (1000 * 60 * 60 * 24 * 7));
        const weeklyRate = (totalKgLost / diffWeeks).toFixed(2);

        // Plateau Detection (Current logic: check if last 3 entries are identical)
        const entries = user.history;
        const isPlateau = entries.length >= 3 &&
            entries[entries.length - 1] === entries[entries.length - 2] &&
            entries[entries.length - 1] === entries[entries.length - 3];

        // Low Hunger Detection
        const isLowHunger = dailyData.protein < (user.settings?.proteinGoal * 0.4);

        return { weeklyRate, isPlateau, isLowHunger };
    }, [user, dailyData]);

    const cycleInfo = useMemo(() => {
        const lastDose = user.doseHistory?.[0];
        if (!lastDose) return { message: "Nenhuma dose registrada ainda.", level: 0, color: "text-slate-400" };

        const lastDoseDate = new Date(lastDose.date);
        const todayDate = new Date();
        const daysSinceDose = Math.floor((todayDate - lastDoseDate) / (1000 * 60 * 60 * 24));

        const drugLevel = Math.exp(-0.138 * daysSinceDose) * 100;

        let message = "";
        let color = "text-brand";
        if (daysSinceDose <= 2) {
            message = "Fase de Pico: Priorize refeições leves.";
            color = "text-brand";
        } else if (daysSinceDose >= 6) {
            message = "Nível Baixo: O Food Noise pode aumentar. Mantenha o foco!";
            color = "text-orange-500";
        } else {
            message = "Nível Estável: Aproveite para focar em treinos de força.";
            color = "text-brand-600";
        }

        return { message, level: drugLevel, color, daysSinceDose };
    }, [user.doseHistory]);

    const injectionSuggestion = useMemo(() => {
        return suggestNextInjection(user.doseHistory || []);
    }, [user.doseHistory]);

    const handleConfirmInjection = () => {
        const isOral = medication?.route === 'oral';
        const siteId = isOral ? null : (selectedSiteId || injectionSuggestion.id);
        const site = isOral ? null : getSiteById(siteId);

        const newRecord = {
            date: new Date().toISOString(),
            dose: user.currentDose,
            medication: user.medicationId,
            siteId: siteId,
            area: site?.area || 'Oral',
            side: site?.side || 'N/A'
        };

        const updatedUser = {
            ...user,
            doseHistory: [newRecord, ...(user.doseHistory || [])]
        };

        setUser(updatedUser);
        localStorage.setItem('mounjoy_user2', JSON.stringify(updatedUser));
        setShowInjectionModal(false);
        setSelectedSiteId(null);
        setIsEditingProtocol(false);
    };

    const handleSaveProtocol = () => {
        const updatedUser = {
            ...user,
            medicationId: tempProtocol.medicationId,
            currentDose: tempProtocol.currentDose
        };
        setUser(updatedUser);
        localStorage.setItem('mounjoy_user2', JSON.stringify(updatedUser));
        setIsEditingProtocol(false);
    };

    const filteredMeds = MOCK_MEDICATIONS.filter(med => {
        const matchesAdmin =
            filterAdmin === 'all' ||
            (filterAdmin === 'weekly' && med.route === 'injectable' && med.frequency === 'weekly') ||
            (filterAdmin === 'daily_inj' && med.route === 'injectable' && med.frequency === 'daily') ||
            (filterAdmin === 'daily_oral' && med.route === 'oral');

        const matchesFocus = filterFocus === 'all' || med.focus === filterFocus;

        return matchesAdmin && matchesFocus;
    });

    const healthInsights = useMemo(() => {
        const startWeight = user.history[0];
        const currentWeight = user.currentWeight;
        const totalLost = startWeight - currentWeight;

        const start = new Date(user.startDate);
        const now = new Date();
        const diffTime = Math.abs(now - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        const weeks = diffDays / 7;

        const speed = weeks > 0 ? totalLost / weeks : 0;

        const insights = [];

        if (speed > 1.5) {
            insights.push({
                type: 'danger',
                title: 'Perda Acelerada',
                message: `Você está perdendo em média ${speed.toFixed(1)}kg por semana. Cuidado com a perda de massa muscular. Aumente o aporte de proteínas.`,
                onInfo: () => setShowSpeedInfo(true)
            });
        }

        const lastWeights = user.history.slice(-3);
        if (lastWeights.length >= 3 && lastWeights.every(v => v === lastWeights[0])) {
            insights.push({
                type: 'warning',
                title: 'Platô Identificado',
                message: 'Seu peso estabilizou nos últimos 3 registros. Tente variar os treinos.',
                onInfo: () => setShowPlateauInfo(true)
            });
        }

        return insights;
    }, [user.currentWeight, user.history, user.startDate]);

    const dailyTip = useMemo(() => {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now - start;
        const oneDay = 1000 * 60 * 60 * 24;
        const day = Math.floor(diff / oneDay);
        return TIPS[day % TIPS.length];
    }, []);

    return (
        <div className="space-y-6 pb-6">
            <DoseAlert reminder={reminder} onAction={() => setActiveTab('profile')} />

            {/* Health Insights Section */}
            {(healthInsights.length > 0) && (
                <div className="space-y-3 stagger-1 fade-in">
                    <h3 className={`text-lg font-bold ml-1 font-outfit ${theme === 'fun' ? 'text-orange-500' : 'text-slate-800'}`}>Insights de Saúde</h3>
                    {healthInsights.map((insight, index) => (
                        <div key={index} className="relative group">
                            <div className={`${theme === 'fun' ? 'animate-bounce-subtle' : ''}`}>
                                <AlertBox
                                    type={insight.type}
                                    title={insight.title}
                                    message={insight.message}
                                />
                            </div>
                            <button
                                onClick={insight.onInfo}
                                className="absolute top-4 right-4 text-slate-400 hover:text-brand transition-colors"
                            >
                                <Info size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Fun Mascot Highlight for Food Noise / Reminders */}
            {theme === 'fun' && (
                <div className="stagger-1 fade-in">
                    {/* Food Noise Alert */}
                    {(cycleInfo.daysSinceDose >= 5) ? (
                        <div className="bg-orange-400 rounded-[40px] p-6 text-white shadow-xl relative overflow-hidden group mb-4">
                            <div className="absolute -right-4 -bottom-4 w-32 h-32 opacity-20 group-hover:scale-125 transition-transform">
                                <img src={mascotStrong} alt="Strong Mascot" className="w-full h-auto" />
                            </div>
                            <div className="relative z-10 flex gap-4 items-center">
                                <div className="w-20 h-20 shrink-0 bg-white/20 rounded-3xl flex items-center justify-center p-2">
                                    <img src={mascotFoodNoise} alt="Food Noise Mascot" className="h-full w-auto animate-bounce-subtle" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-100 mb-1">Cuidado com o Food Noise 🎈</p>
                                    <h4 className="text-xl font-black mb-1 leading-tight">Mantenha o foco!</h4>
                                    <p className="text-xs font-medium opacity-90 leading-relaxed">Sua dose está baixando. Priorize as proteínas agora!</p>
                                </div>
                            </div>
                        </div>
                    ) : (cycleInfo.daysSinceDose === 0) ? (
                         <div className="bg-blue-600 rounded-[40px] p-6 text-white shadow-xl relative overflow-hidden group mb-4">
                            <div className="absolute -right-4 -bottom-4 w-32 h-32 opacity-20 group-hover:scale-125 transition-transform">
                                <img src={mascotZen} alt="Zen Mascot" className="w-full h-auto" />
                            </div>
                            <div className="relative z-10 flex gap-4 items-center">
                                <div className="w-20 h-20 shrink-0 bg-white/20 rounded-3xl flex items-center justify-center p-2">
                                    <img src={mascotRemember} alt="Remember" className="h-full w-auto animate-float" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-100 mb-1">Dia de Brilhar 💉</p>
                                    <h4 className="text-xl font-black mb-1 leading-tight">Dia da sua dose!</h4>
                                    <p className="text-xs font-medium opacity-90 leading-relaxed">Prepare tudo com calma e respire fundo. Você está indo bem!</p>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Gallery and Vertical Progress */}
            <div className="stagger-2 fade-in grid grid-cols-2 gap-4">
                {/* Photo Gallery Frame */}
                <div className="relative overflow-hidden rounded-[40px] bg-slate-100 flex flex-col items-center justify-center min-h-[320px] shadow-inner group transition-all border-2 border-dashed border-slate-300 hover:border-brand-300">
                    <input type="file" id="photo-upload" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

                    {user.photos && user.photos.length > 0 ? (
                        <>
                            <div className="absolute inset-0 w-full h-full flex flex-col bg-slate-100 cursor-pointer rounded-[40px] overflow-hidden" onClick={() => setIsFullscreenPhoto(true)}>
                                <img src={typeof (user.photos[currentPhotoIndex] || user.photos[0]) === 'string' ? (user.photos[currentPhotoIndex] || user.photos[0]) : (user.photos[currentPhotoIndex] || user.photos[0])?.url} alt="Evolução" className="w-full h-full object-cover" />
                                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>

                                {/* Actions overlay */}
                                <div className="absolute inset-x-0 pt-4 px-4 flex justify-between items-center z-20 pointer-events-none">
                                    <span className="text-[10px] font-black text-white/90 uppercase tracking-widest drop-shadow-md bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">Sua Evolução</span>
                                    <label htmlFor="photo-upload" className="w-8 h-8 rounded-full bg-white backdrop-blur-md flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer text-slate-500 shadow-lg pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                                        <Plus size={16} />
                                    </label>
                                </div>
                            </div>

                            {/* Unified Bottom Controls - Navigation, Date and Pagination */}
                            <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2 z-50 px-4 pointer-events-none">
                                {/* Photo Date & Weight Badge */}
                                {typeof (user.photos[currentPhotoIndex] || user.photos[0]) !== 'string' && (
                                    <div className="flex gap-1.5 items-center">
                                        <span className="text-white text-[10px] font-black tracking-widest drop-shadow-md uppercase bg-black/10 px-2 py-0.5 rounded-full backdrop-blur-[2px]">
                                            {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(((user.photos[currentPhotoIndex] || user.photos[0])).date)).replace('/', '-')}
                                        </span>
                                        {getPhotoWeight((user.photos[currentPhotoIndex] || user.photos[0]).date) && (
                                            <span className="text-white text-[10px] font-black tracking-widest drop-shadow-md uppercase bg-black/10 px-2 py-0.5 rounded-full backdrop-blur-[2px]">
                                                {getPhotoWeight((user.photos[currentPhotoIndex] || user.photos[0]).date)}kg
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="flex w-full items-center justify-between pointer-events-auto">
                                    {/* Prev Button */}
                                    {user.photos.length > 1 ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); prevPhoto(e); }}
                                            className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-all active:scale-90 cursor-pointer shadow-lg border border-white/5 whitespace-nowrap"
                                            aria-label="Foto anterior"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                    ) : <div className="w-8"></div>}

                                    {/* Pagination Dots */}
                                    <div className="flex justify-center gap-1.5 mx-2">
                                        {user.photos.map((_, i) => (
                                            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${currentPhotoIndex === i ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`}></div>
                                        ))}
                                    </div>

                                    {/* Next Button */}
                                    {user.photos.length > 1 ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); nextPhoto(e); }}
                                            className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-all active:scale-90 cursor-pointer shadow-lg border border-white/5 whitespace-nowrap"
                                            aria-label="Próxima foto"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    ) : <div className="w-8"></div>}
                                </div>
                            </div>
                        </>
                    ) : (
                        <label htmlFor="photo-upload" className="w-full h-full absolute inset-0 flex flex-col items-center justify-center p-6 cursor-pointer opacity-80 hover:opacity-100 hover:bg-slate-200 transition-colors border-none m-0">
                            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3">
                                <Camera size={24} className="text-slate-400 group-hover:text-brand-500 transition-colors" />
                            </div>
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest text-center group-hover:text-brand-600 transition-colors">Sua Evolução</span>
                            <span className="text-[10px] text-slate-400 mt-1 font-medium text-center opacity-70">Adicionar foto</span>
                        </label>
                    )}
                </div>

                {/* Vertical Progress Card */}
                <div className={`relative overflow-hidden rounded-[40px] p-5 text-white shadow-xl flex flex-col justify-between h-full transition-all duration-500 ${theme === 'fun' ? 'bg-orange-500 shadow-orange-200' : 'bg-gradient-to-br from-brand-500 to-brand-600'}`}>
                    <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
                        {theme === 'fun' ? <img src="/mascotachieve.png" alt="Mascot" className="w-32 h-32" /> : <Activity size={140} />}
                    </div>

                    <div className="flex flex-col relative z-10 mb-4">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-brand-50 text-[10px] font-bold tracking-widest uppercase opacity-80 font-outfit">Progresso</span>
                            <button
                                onClick={() => {
                                    setNewWeight(user.currentWeight.toString());
                                    setShowWeightModal(true);
                                }}
                                className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-2 rounded-xl transition-all active:scale-90"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                        <div className="flex items-end gap-1">
                            <span className="text-5xl font-black tracking-tighter leading-none">{user.currentWeight}</span>
                            <span className="text-sm font-medium mb-1 opacity-80">kg</span>
                        </div>
                    </div>


                    {/* Horizontal Progress Bars */}
                    <div className="flex flex-col gap-3 bg-white/10 backdrop-blur-md rounded-[24px] p-4 relative z-10 border border-white/10 mt-auto">
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Proteína</span>
                                <span className="text-xs font-black text-orange-300 tabular-nums leading-none">{dailyData.protein} / {user.settings?.proteinGoal || 100}g</span>
                            </div>
                            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-400 rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, (dailyData.protein / (user.settings?.proteinGoal || 100)) * 100)}%` }}></div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Água</span>
                                <span className="text-xs font-black text-blue-300 tabular-nums leading-none">{dailyData.water} / {user.settings?.waterGoal || 2.5}L</span>
                            </div>
                            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-400 rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, (dailyData.water / (user.settings?.waterGoal || 2.5)) * 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Injection Tracker Card (Only for Injectables) */}
            {medication?.route === 'injectable' && (
                <InjectionSwipeCard
                    medication={medication}
                    user={user}
                    timeRemaining={timeRemaining}
                    cycleInfo={cycleInfo}
                    injectionSuggestion={injectionSuggestion}
                    handleConfirmInjection={handleConfirmInjection}
                    setShowDoseHelp={setShowDoseHelp}
                    onShowBodyGuide={() => setShowBodyMap(true)}
                />
            )}

            {/* Milestones Card */}
            <div className="stagger-3 fade-in bg-white p-5 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                    {theme === 'fun' ? (
                        <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center">
                            <img src="/mascotachieve.png" alt="Mascot" className="w-4 h-4 object-contain" />
                        </div>
                    ) : <TrendingUp size={16} className="text-brand-500" />}
                    <h3 className={`text-xs font-black uppercase tracking-widest ${theme === 'fun' ? 'text-orange-500' : 'text-slate-400'}`}>Marcos de Sucesso</h3>
                </div>

                <div className="space-y-6">
                    {/* 5% Milestone */}
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Meta 5% Clinicamente Significativa</span>
                            <span className="text-[10px] font-bold text-slate-400">{(user.history[0] * 0.95).toFixed(1)} kg</span>
                        </div>
                        <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 relative">
                            <div
                                className="h-full bg-gradient-to-r from-brand-400 to-brand-500 rounded-full transition-all duration-1000"
                                style={{ width: `${Math.min(100, ((user.history[0] - user.currentWeight) / (user.history[0] * 0.05)) * 100)}%` }}
                            ></div>
                            {user.currentWeight <= user.history[0] * 0.95 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-[8px] font-black text-white uppercase tracking-tighter">ALCANÇADO! 🎉</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 10% Milestone */}
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Meta 10% Transformação Metabólica</span>
                            <span className="text-[10px] font-bold text-slate-400">{(user.history[0] * 0.9).toFixed(1)} kg</span>
                        </div>
                        <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 relative">
                            <div
                                className="h-full bg-gradient-to-r from-brand-500 to-brand-500 rounded-full transition-all duration-1000"
                                style={{ width: `${Math.min(100, ((user.history[0] - user.currentWeight) / (user.history[0] * 0.10)) * 100)}%` }}
                            ></div>
                            {user.currentWeight <= user.history[0] * 0.9 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-[8px] font-black text-white uppercase tracking-tighter">ALCANÇADO! 🎉</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {dailyTip && (
                <div className="stagger-3 fade-in">
                    <AlertBox
                        type="info"
                        title="Dica do Dia"
                        message={dailyTip}
                    />
                </div>
            )}


            {/* Intelligence Alerts */}
            <div className="space-y-3">
                {stats.isPlateau && (
                    <div className="stagger-1 fade-in bg-amber-50 border border-amber-100 p-4 rounded-[28px] flex items-center gap-3 animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                            <TrendingUp size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Alerta de Platô</p>
                            <p className="text-xs text-amber-600 font-medium leading-tight">Peso estável há 14 dias. Tente variar a rotina de exercícios ou hidratação.</p>
                        </div>
                    </div>
                )}

                {stats.isLowHunger && (
                    <div className="stagger-1 fade-in bg-brand-50 border border-brand-100 p-4 rounded-[28px] flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
                            <Zap size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Baixa Fome Detectada</p>
                            <p className="text-xs text-brand-600 font-medium leading-tight">Priorize refeições leves e densas em proteína: ovos, iogurte ou shake.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Daily Wellness Checklist (Interactive - CONNECTED) */}
            <div className="stagger-4 fade-in">
                <div className="flex justify-between items-end mb-3 ml-1">
                    <h3 className="text-lg font-bold text-slate-800 font-outfit">Meta do Dia</h3>
                    <div className="text-[10px] font-black text-brand-600 uppercase tracking-widest bg-brand-50 px-2 py-1 rounded-lg">
                        Taxa: {stats.weeklyRate} kg/sem
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {/* Água Card - New Clean Minimalist Design */}
                    <div className={`p-4 lg:p-5 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center gap-3 transition-colors duration-700 border overflow-hidden relative ${isWaterComplete ? 'bg-blue-500 border-blue-600' : 'bg-white border-slate-100'}`}>
                        {isWaterComplete && <ConfettiExplosion />}
                        <div className="w-full flex justify-between items-center z-10">
                            <div className="flex flex-col">
                                <span className={`font-outfit font-black text-sm transition-colors duration-700 ${isWaterComplete ? 'text-white' : 'text-slate-800'}`}>ÁGUA</span>
                                <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-700 ${isWaterComplete ? 'text-blue-100' : 'text-slate-400'}`}>{user.settings?.waterGoal || 2.5} L/Dia</span>
                            </div>
                        </div>

                        <div className="w-full relative flex flex-col items-center gap-3 my-2 z-10">
                            <div className="relative w-full h-28 flex items-center justify-center">
                                <img src={waterImg} alt="Water" className={`h-full w-auto object-contain drop-shadow-[-4px_5px_0_rgba(148,163,184,0.4)] transform transition-all duration-300 absolute ${animatingAsset === 'water' ? 'scale-125' : 'scale-100 hover:scale-110'} animate-float`} />
                                {theme === 'fun' && waterPercentage < 50 && (
                                    <img src={mascotHydrated} alt="Mascot Hydrated" className="absolute -top-6 -right-2 w-16 h-16 animate-bounce-subtle z-20 pointer-events-none" />
                                )}
                            </div>
                            <div className="w-full flex items-center gap-2 px-1">
                                <span className={`text-2xl font-black tabular-nums leading-none transition-colors duration-700 ${isWaterComplete ? 'text-white' : 'text-slate-800'}`}>{dailyData.water}</span>
                                <div className={`flex-1 h-2 rounded-full overflow-hidden transition-colors duration-700 ${isWaterComplete ? 'bg-blue-400' : 'bg-blue-50'}`}>
                                    <div className={`h-full rounded-full transition-all duration-1000 ease-out ${isWaterComplete ? 'bg-white' : 'bg-blue-500'}`} style={{ width: `${waterPercentage}%` }}></div>
                                </div>
                                <span className={`text-[10px] font-black transition-colors duration-700 ${isWaterComplete ? 'text-white' : 'text-blue-300'}`}>{Math.round(waterPercentage)}%</span>
                            </div>
                        </div>

                        <div className="flex w-full gap-2 z-10 mt-auto">
                            <button onClick={() => updateIntake('water', -0.2)} className={`flex-1 py-3 rounded-2xl border font-bold transition-colors duration-700 text-xl leading-none active:scale-90 ${isWaterComplete ? 'bg-blue-600 border-blue-600 text-blue-100 hover:bg-blue-700' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}>−</button>
                            <button onClick={() => updateIntake('water', 0.2)} className={`flex-1 py-3 rounded-2xl font-bold transition-colors duration-700 text-xl leading-none active:scale-90 ${isWaterComplete ? 'bg-white text-blue-600 hover:bg-blue-50 shadow-md' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>+</button>
                        </div>
                    </div>

                    {/* Proteína Card - New Clean Minimalist Design */}
                    <div className="w-full relative flex flex-col gap-2">
                        <div
                            className={`p-4 lg:p-5 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center gap-3 transition-colors duration-700 border overflow-hidden relative ${isProteinComplete ? 'border-transparent' : 'bg-white border-slate-100'}`}
                            style={isProteinComplete ? { backgroundColor: `hsl(20, 90%, 55%)` } : {}}
                        >
                            {isProteinComplete && <ConfettiExplosion />}
                            <div className="w-full flex justify-between items-center z-10">
                                <div className="flex flex-col">
                                    <span className={`font-outfit font-black text-sm transition-colors duration-700 ${isProteinComplete ? 'text-white' : 'text-slate-800'}`}>PROTEÍNA</span>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-700 ${isProteinComplete ? 'text-white/80' : 'text-slate-400'}`}>{user.settings?.proteinGoal || 100} g/Dia</span>
                                </div>
                            </div>

                            <div className="w-full relative flex flex-col items-center gap-3 my-2 z-10">
                                <div className="relative w-full h-28 flex items-center justify-center">
                                    <img src={proteinImg} alt="Protein" className={`h-[130%] w-auto object-contain drop-shadow-[-4px_5px_0_rgba(148,163,184,0.4)] transform transition-all duration-300 absolute ${animatingAsset === 'protein' ? 'scale-125' : 'scale-100 hover:scale-110'} animate-float`} />
                                </div>
                                <div className="w-full flex items-center gap-2 px-1">
                                    <span className={`text-2xl font-black tabular-nums leading-none transition-colors duration-700 ${isProteinComplete ? 'text-white' : 'text-slate-800'}`}>{dailyData.protein}</span>
                                    <div className={`flex-1 h-2 rounded-full overflow-hidden transition-colors duration-700 ${isProteinComplete ? 'bg-black/10' : 'bg-orange-50'}`}>
                                        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${isProteinComplete ? 'bg-white' : 'bg-orange-500'}`} style={{ width: `${proteinPercentage}%` }}></div>
                                    </div>
                                    <span className={`text-[10px] font-black transition-colors duration-700 ${isProteinComplete ? 'text-white' : 'text-orange-300'}`}>{Math.round(proteinPercentage)}%</span>
                                </div>
                            </div>

                            <div className="flex w-full gap-2 z-10 mt-auto">
                                <button onClick={() => updateIntake('protein', -5)} className={`flex-1 py-3 rounded-2xl border font-bold transition-colors duration-700 text-xl leading-none active:scale-90 ${isProteinComplete ? 'bg-white/20 border-transparent text-white hover:bg-white/30' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}>−</button>
                                <button onClick={() => updateIntake('protein', 5)} className={`flex-1 py-3 rounded-2xl font-bold transition-colors duration-700 text-xl leading-none active:scale-90 ${isProteinComplete ? 'bg-white text-black/80 hover:bg-white/90 shadow-md' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>+</button>
                            </div>
                        </div>
                    </div>

                    {/* Fibra Card - New Clean Minimalist Design */}
                    <div className="w-full relative flex flex-col gap-2">
                        <div
                            className={`p-4 lg:p-5 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center gap-3 transition-colors duration-700 border overflow-hidden relative ${isFiberComplete ? 'bg-emerald-500 border-emerald-600' : 'bg-white border-slate-100'}`}
                        >
                            {isFiberComplete && <ConfettiExplosion />}
                            <div className="w-full flex justify-between items-center z-10">
                                <div className="flex flex-col">
                                    <span className={`font-outfit font-black text-sm transition-colors duration-700 ${isFiberComplete ? 'text-white' : 'text-slate-800'}`}>FIBRA</span>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-700 ${isFiberComplete ? 'text-emerald-100' : 'text-slate-400'}`}>{user.settings?.fiberGoal || 25} g/Dia</span>
                                </div>
                            </div>

                            <div className="w-full relative flex flex-col items-center gap-3 my-2 z-10">
                                <div className="relative w-full h-28 flex items-center justify-center">
                                    <img src={fiberImg} alt="Fiber" className={`h-full w-auto object-contain drop-shadow-[-4px_5px_0_rgba(148,163,184,0.4)] transform transition-all duration-300 absolute ${animatingAsset === 'fiber' ? 'scale-125' : 'scale-100 hover:scale-110'} animate-float`} />
                                </div>
                                <div className="w-full flex items-center gap-2 px-1">
                                    <span className={`text-2xl font-black tabular-nums leading-none transition-colors duration-700 ${isFiberComplete ? 'text-white' : 'text-slate-800'}`}>{Math.round(dailyData.fiber)}</span>
                                    <div className={`flex-1 h-2 rounded-full overflow-hidden transition-colors duration-700 ${isFiberComplete ? 'bg-emerald-400' : 'bg-emerald-50'}`}>
                                        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${isFiberComplete ? 'bg-white' : 'bg-emerald-500'}`} style={{ width: `${fiberPercentage}%` }}></div>
                                    </div>
                                    <span className={`text-[10px] font-black transition-colors duration-700 ${isFiberComplete ? 'text-white' : 'text-emerald-300'}`}>{Math.round(fiberPercentage)}%</span>
                                </div>
                            </div>

                            <div className="flex w-full gap-2 z-10 mt-auto">
                                <button onClick={() => updateIntake('fiber', -5)} className={`flex-1 py-3 rounded-2xl border font-bold transition-colors duration-700 text-xl leading-none active:scale-90 ${isFiberComplete ? 'bg-emerald-600 border-emerald-600 text-emerald-100 hover:bg-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}>−</button>
                                <button onClick={() => updateIntake('fiber', 5)} className={`flex-1 py-3 rounded-2xl font-bold transition-colors duration-700 text-xl leading-none active:scale-90 ${isFiberComplete ? 'bg-white text-emerald-600 hover:bg-emerald-50 shadow-md' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>+</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Weight Update Modal */}
            <Modal isOpen={showWeightModal} onClose={() => setShowWeightModal(false)} title="Atualizar Peso">
                <div className="flex items-center justify-between mb-8 bg-brand-50/50 rounded-[32px] p-6 border border-brand-100/50 relative overflow-hidden group">
                    {/* Histórico Recente */}
                    <div className="flex flex-col gap-1 relative z-10 w-1/4">
                        <div className="text-left border-l-2 border-brand-200 pl-2">
                            <span className="text-sm font-black text-brand-900/40">
                                {user.history.length > 1 ? user.history[user.history.length - 2] : user.history[0]}
                                <span className="text-[10px] font-medium ml-0.5">kg</span>
                            </span>
                            <div className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">
                                {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(user.startDate))}
                            </div>
                        </div>
                    </div>

                    {/* Central */}
                    <div className="text-center relative z-10 flex-1 flex flex-col items-center">
                        <p className="text-[10px] font-bold text-brand-600/60 uppercase tracking-[0.2em] mb-1">Registro Anterior</p>
                        <p className="text-4xl font-black text-brand-900 tracking-tighter">
                            {user.currentWeight}<span className="text-lg font-medium text-brand-600/40 ml-1">kg</span>
                        </p>
                        <div className="mt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {formatDate(user.lastWeightDate || user.startDate)}
                            </span>
                        </div>
                    </div>

                    {/* Scaler Image */}
                    <div className="relative z-10 w-1/4 flex justify-end items-stretch">
                        <img src={scalerImg} alt="Scale" className="h-[100px] sm:h-[110px] w-auto object-contain drop-shadow-xl transform group-hover:-translate-y-1 transition-transform" />
                    </div>
                </div>

                <Slider
                    label="Novo Registro"
                    value={newWeight}
                    onChange={setNewWeight}
                    min={50}
                    max={250}
                    step={0.1}
                    suffix="kg"
                />

                <div className="flex flex-col gap-3">
                    <Button
                        onClick={updateWeight}
                        className="w-full py-5 rounded-[24px] text-lg font-black bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:opacity-90 hover:-translate-y-0.5 transition-all active:translate-y-0"
                    >
                        Confirmar Peso
                    </Button>
                    <button
                        onClick={() => setShowWeightModal(false)}
                        className="w-full py-3 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </Modal>

            {/* Modal: Registro de Dose (Injectável ou Oral) */}
            <Modal
                isOpen={showInjectionModal}
                onClose={() => {
                    setShowInjectionModal(false);
                    setIsEditingProtocol(false);
                }}
                title={isEditingProtocol ? "Editar Protocolo" : (medication?.route === 'oral' ? "Registrar Dose" : "Confirmar Aplicação")}
            >
                <div className="space-y-4">
                    {!isEditingProtocol ? (
                        <>
                            <div className="bg-brand-50/50 rounded-[32px] p-5 border border-brand-100/50 flex flex-col gap-1 overflow-hidden relative group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-200/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black text-brand-500/60 uppercase tracking-[0.2em] mb-1">Dose a ser registrada</p>
                                    <p className="text-xl font-black flex items-center gap-2 text-slate-800">
                                        {medication?.route === 'oral' ? '💊' : '💉'} {user.currentDose}
                                        <span className="text-sm font-medium text-slate-400">({medication?.name})</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setTempProtocol({ medicationId: user.medicationId, currentDose: user.currentDose });
                                        setIsEditingProtocol(true);
                                    }}
                                    className="absolute top-4 right-4 z-20 p-2 bg-white border border-slate-100 rounded-full text-slate-400 hover:text-brand-600 hover:border-brand-100 transition-all shadow-sm active:scale-95"
                                    title="Alterar Protocolo"
                                >
                                    <PenLine size={14} />
                                </button>
                            </div>

                            {medication?.route !== 'oral' && (
                                <>
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Escolha o Local</label>
                                        <BodySelector
                                            selectedSiteId={selectedSiteId || injectionSuggestion.id}
                                            onSelect={setSelectedSiteId}
                                            suggestedSiteId={injectionSuggestion.id}
                                            lastSiteId={user.doseHistory?.[0]?.siteId}
                                        />
                                    </div>

                                    {user.doseHistory?.[0]?.siteId === (selectedSiteId || injectionSuggestion.id) && (
                                        <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center gap-3 animate-headShake">
                                            <AlertBox type="warning" title="Atenção" message="Você usou este local na última aplicação. Recomenda-se a rotação." />
                                        </div>
                                    )}
                                </>
                            )}

                            <Button onClick={handleConfirmInjection} className="w-full py-4 rounded-[24px] text-lg font-black shadow-xl">
                                {medication?.route === 'oral' ? "Confirmar Dose" : "Registrar Aplicação"}
                            </Button>
                        </>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Filter UI */}
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
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${filterAdmin === f.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-400 border-slate-100 hover:border-brand-200'}`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Med Selection Grid */}
                            <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 hide-scrollbar">
                                {Object.entries(
                                    filteredMeds.reduce((acc, med) => {
                                        (acc[med.substance] = acc[med.substance] || []).push(med);
                                        return acc;
                                    }, {})
                                ).map(([substance, meds]) => {
                                    const isSelectedSub = meds.some(m => m.id === tempProtocol.medicationId);
                                    return (
                                        <div key={substance} className="space-y-2">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{substance}</div>
                                            {meds.map(med => (
                                                <button
                                                    key={med.id}
                                                    onClick={() => setTempProtocol({ medicationId: med.id, currentDose: med.doses[0] })}
                                                    className={`w-full p-3 rounded-2xl border text-left transition-all active:scale-95 ${tempProtocol.medicationId === med.id ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-500' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                                                >
                                                    <p className={`text-xs font-black ${tempProtocol.medicationId === med.id ? 'text-brand-600' : 'text-slate-700'}`}>{med.brand}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase">{med.frequency === 'weekly' ? 'Semanal' : 'Diário'}</p>
                                                </button>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Dose Selection */}
                            {tempProtocol.medicationId && (
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Selecione a Dose</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {MOCK_MEDICATIONS.find(m => m.id === tempProtocol.medicationId).doses.map(dose => (
                                            <button
                                                key={dose}
                                                onClick={() => setTempProtocol({ ...tempProtocol, currentDose: dose })}
                                                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all ${tempProtocol.currentDose === dose ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}
                                            >
                                                {dose}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <Button variant="ghost" onClick={() => setIsEditingProtocol(false)} className="flex-1">Voltar</Button>
                                <Button onClick={handleSaveProtocol} className="flex-[2] shadow-xl">Salvar Protocolo</Button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Modal: Perda Acelerada */}
            <Modal
                isOpen={showSpeedInfo}
                onClose={() => setShowSpeedInfo(false)}
                title="Perda Acelerada"
            >
                <div className="space-y-4 text-slate-600">
                    <p className="text-sm leading-relaxed">
                        Perder mais de 1.5kg por semana de forma consistente pode indicar que você está perdendo <strong>massa muscular</strong> em vez de apenas gordura.
                    </p>
                    <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100">
                        <h4 className="font-bold text-brand-700 text-xs uppercase mb-2">Como prevenir</h4>
                        <ul className="text-xs space-y-2 list-disc ml-4">
                            <li>Aumente a ingestão de proteínas (mínimo 1.2g/kg).</li>
                            <li>Inicie ou mantenha exercícios de resistência.</li>
                            <li>Garanta uma hidratação rigorosa (2.5L+).</li>
                        </ul>
                    </div>
                </div>
            </Modal>

            {/* Modal: Platô */}
            <Modal
                isOpen={showPlateauInfo}
                onClose={() => setShowPlateauInfo(false)}
                title="O que é o Platô?"
            >
                <div className="space-y-4 text-slate-600">
                    <p className="text-sm leading-relaxed">
                        O platô ocorre quando o corpo se adapta Ã  nova ingestão calórica e estabiliza o peso. É uma parte natural de qualquer jornada de emagrecimento.
                    </p>
                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                        <h4 className="font-bold text-orange-700 text-xs uppercase mb-2">Dicas para quebrar</h4>
                        <ul className="text-xs space-y-2 list-disc ml-4">
                            <li>Varie os tipos de exercícios físicos.</li>
                            <li>Revise seu diário alimentar.</li>
                            <li>Tire novas medidas.</li>
                        </ul>
                    </div>
                </div>
            </Modal>
            {/* Fullscreen Photo Overlay */}
            {isFullscreenPhoto && user.photos && user.photos.length > 0 && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
                    style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
                    onClick={() => setIsFullscreenPhoto(false)}
                >
                    <div
                        className="relative w-full h-[85vh] max-w-lg bg-slate-100 rounded-[40px] overflow-hidden shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img src={typeof (user.photos[currentPhotoIndex] || user.photos[0]) === 'string' ? (user.photos[currentPhotoIndex] || user.photos[0]) : (user.photos[currentPhotoIndex] || user.photos[0])?.url} alt="Evolução" className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>

                        {/* Actions overlay */}
                        <div className="absolute inset-x-0 pt-6 px-6 flex justify-between items-center z-20 pointer-events-none">
                            <span className="text-xs font-black text-white/90 uppercase tracking-widest drop-shadow-md bg-black/20 px-4 py-1.5 rounded-full backdrop-blur-sm">Sua Evolução</span>
                            <div className="flex items-center gap-3">
                                <button onClick={deletePhoto} className="w-10 h-10 rounded-full bg-red-500/80 backdrop-blur-md flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer text-white shadow-lg pointer-events-auto">
                                    <Trash2 size={18} />
                                </button>
                                <label htmlFor="photo-upload" className="w-10 h-10 rounded-full bg-white backdrop-blur-md flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer text-slate-500 shadow-lg pointer-events-auto">
                                    <Plus size={20} />
                                </label>
                            </div>
                        </div>

                        {/* Navigation & Pagination Indicators */}
                        <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-3 z-10 w-full px-6">
                            {typeof (user.photos[currentPhotoIndex] || user.photos[0]) !== 'string' && (
                                <span className="text-white text-xs font-black tracking-widest drop-shadow-md">
                                    {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(((user.photos[currentPhotoIndex] || user.photos[0])).date)).replace('/', '-')}
                                </span>
                            )}
                            <div className="flex w-full items-center justify-between">
                                {user.photos.length > 1 ? (
                                    <button onClick={prevPhoto} className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center hover:bg-black/40 transition-colors text-white z-20 shrink-0">
                                        <ChevronLeft size={28} />
                                    </button>
                                ) : <div className="w-12 shrink-0"></div>}

                                <div className="flex justify-center gap-2 flex-1 mx-4">
                                    {user.photos.map((_, i) => (
                                        <div key={i} className={`h-2 rounded-full transition-all duration-300 ${currentPhotoIndex === i ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}></div>
                                    ))}
                                </div>

                                {user.photos.length > 1 ? (
                                    <button onClick={nextPhoto} className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center hover:bg-black/40 transition-colors text-white z-20 shrink-0">
                                        <ChevronRight size={28} />
                                    </button>
                                ) : <div className="w-12 shrink-0"></div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Esqueci minha dose */}
            <Modal
                isOpen={showDoseHelp}
                onClose={() => setShowDoseHelp(false)}
                title="Esqueci minha dose"
            >
                <div className="space-y-6">
                    <div className="bg-brand-50 p-5 rounded-3xl border border-brand-100">
                        <h4 className="font-black text-brand-700 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Info size={14} />
                            O que fazer agora?
                        </h4>

                        {reminder.daysRemaining >= 2 ? (
                            <div className="space-y-4">
                                <p className="text-sm text-brand-900 leading-relaxed">
                                    Como faltam <strong>{reminder.daysRemaining} dias</strong> para sua próxima dose, você deve:
                                </p>
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-brand-200">
                                    <p className="text-sm font-bold text-brand-600 mb-1">✅ Aplique a dose esquecida agora.</p>
                                    <p className="text-[10px] text-slate-500">Mantenha seu dia de aplicação original para a próxima semana.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-brand-900 leading-relaxed">
                                    Como faltam apenas <strong>{reminder.daysRemaining} dias</strong> para sua próxima dose, a recomendação é:
                                </p>
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-brand-200">
                                    <p className="text-sm font-bold text-orange-600 mb-1">❌ Pule a dose esquecida.</p>
                                    <p className="text-[10px] text-slate-500">Aguarde o dia normal da sua próxima aplicação para evitar sobrecarga.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl">
                        <p className="text-[10px] text-slate-400 leading-relaxed italic">
                            *Baseado nas orientações gerais de bula para semaglutida e tirzepatida. Em caso de dúvida persistente, consulte seu médico.
                        </p>
                    </div>

                    <Button onClick={() => setShowDoseHelp(false)} className="w-full py-4 rounded-2xl text-sm font-black">
                        Entendi
                    </Button>
                </div>
            </Modal>
            
            {/* Modal: Guia de Aplicação (Standalone Body Map) */}
            <Modal
                isOpen={showBodyMap}
                onClose={() => setShowBodyMap(false)}
                title="Guia de Aplicação"
            >
                <div className="space-y-6">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">
                        Selecione o local para ver os detalhes
                    </p>
                    
                    <BodySelector
                        selectedSiteId={selectedSiteId || injectionSuggestion.id}
                        onSelect={setSelectedSiteId}
                        suggestedSiteId={injectionSuggestion.id}
                        lastSiteId={user.doseHistory?.[0]?.siteId}
                    />

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] text-slate-500 leading-relaxed italic">
                            *A rotação dos locais é fundamental para evitar lipodistrofia e garantir a absorção correta do medicamento.
                        </p>
                    </div>

                    <Button onClick={() => setShowBodyMap(false)} className="w-full py-4 rounded-2xl text-sm font-black">
                        Fechar Guia
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default Dashboard;
