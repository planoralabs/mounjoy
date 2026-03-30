import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
    Filler
} from 'chart.js';
import { Activity, TrendingUp, Calendar, Camera, ChevronRight, Scale, X, Maximize2, Share2, Download, ZoomIn, ZoomOut } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    ChartTooltip,
    Legend,
    Filler
);

const Charts = ({ user }) => {
    const [view, setView] = useState('weight'); // 'weight' or 'glucose'
    const [timeFilter, setTimeFilter] = useState('M'); // 'D', 'S', 'M', 'A' (Dia, Semana, Mês, Ano)
    const [selectedDates, setSelectedDates] = useState([]);
    const [showFullComparison, setShowFullComparison] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [exportPreview, setExportPreview] = useState(null);
    const [photoAdjustments, setPhotoAdjustments] = useState({}); // { dateStr: { x, y, scale } }

    const updateAdjustment = (dateStr, changes) => {
        setPhotoAdjustments(prev => ({
            ...prev,
            [dateStr]: { ...(prev[dateStr] || { x: 0, y: 0, scale: 1 }), ...changes }
        }));
    };

    const [isDragging, setIsDragging] = useState(null); // dateStr
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e, dateStr) => {
        setIsDragging(dateStr);
        const adj = photoAdjustments[dateStr] || { x: 0, y: 0, scale: 1 };
        setDragStart({ x: e.clientX - adj.x, y: e.clientY - adj.y });
    };

    const handleTouchStart = (e, dateStr) => {
        setIsDragging(dateStr);
        const adj = photoAdjustments[dateStr] || { x: 0, y: 0, scale: 1 };
        setDragStart({ x: e.touches[0].clientX - adj.x, y: e.touches[0].clientY - adj.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        updateAdjustment(isDragging, {
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        updateAdjustment(isDragging, {
            x: e.touches[0].clientX - dragStart.x,
            y: e.touches[0].clientY - dragStart.y
        });
    };

    const handleMouseUp = () => setIsDragging(null);

    const handleWheel = (e, dateStr) => {
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        const adj = photoAdjustments[dateStr] || { x: 0, y: 0, scale: 1 };
        const newScale = Math.max(0.5, Math.min(3, adj.scale + delta));
        updateAdjustment(dateStr, { scale: newScale });
    };

    const glucoseHistory = [98, 105, 92, 110, 89, 94, 91];

    // Weight History Logic: Real data takes priority, but we add mock data if empty for demo purposes
    const hasEnoughData = user.measurements && user.measurements.length >= 3;

    const baseWeightLogs = useMemo(() => {
        let logs = user.measurements && user.measurements.length > 0
            ? [...user.measurements].sort((a, b) => new Date(a.date) - new Date(b.date))
            : [];

        if (!hasEnoughData) {
            const now = new Date();
            const demoPoints = [
                { date: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(), weight: 105.5, photoUrl: '/mock_evolution/step1.png' },
                { date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(), weight: 102.0, photoUrl: '/mock_evolution/step2.png' },
                { date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), weight: 98.5, photoUrl: '/mock_evolution/step3.png' },
                { date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), weight: 95.0, photoUrl: '/mock_evolution/step4.png' }
            ];
            return demoPoints;
        }
        return logs;
    }, [user.measurements, user.startWeight, user.currentWeight, hasEnoughData]);

    // Filter logs based on selection
    const filterLogs = (logs) => {
        const now = new Date();
        switch (timeFilter) {
            case 'D': // Last 7 days
                return logs.filter(l => (now - new Date(l.date)) <= 7 * 24 * 60 * 60 * 1000);
            case 'S': // Last 28 days
                return logs.filter(l => (now - new Date(l.date)) <= 28 * 24 * 60 * 60 * 1000);
            case 'M': // Last 180 days
                return logs.filter(l => (now - new Date(l.date)) <= 180 * 24 * 60 * 60 * 1000);
            default: // 'A' or All-time
                return logs;
        }
    };

    const weightLogs = filterLogs(baseWeightLogs);

    const toggleDate = (date) => {
        if (selectedDates.includes(date)) {
            setSelectedDates(selectedDates.filter(d => d !== date));
        } else if (selectedDates.length < 4) {
            setSelectedDates([...selectedDates, date]);
        }
    };

    const findPhotoForDate = (measurementDate) => {
        // Check if it's a demo point with integrated photo
        const log = baseWeightLogs.find(l => l.date === measurementDate);
        if (log && log.photoUrl) return { url: log.photoUrl };

        if (!user.photos || user.photos.length === 0) return null;
        const mDate = new Date(measurementDate);
        let closest = null;
        let minDiff = Infinity;
        user.photos.forEach(photo => {
            const pDate = new Date(photo.date);
            const diff = Math.abs(pDate - mDate);
            if (diff < minDiff && diff < (48 * 60 * 60 * 1000)) { // 48 hour window for flexibility
                minDiff = diff;
                closest = photo;
            }
        });
        return closest;
    };

    const handleExportStory = async () => {
        if (selectedDates.length < 2) return;
        setIsExporting(true);
        
        const sortedDates = [...selectedDates].sort((a, b) => new Date(a) - new Date(b));
        const lLogs = sortedDates.map(d => baseWeightLogs.find(l => l.date === d));
        const l1 = lLogs[0];
        const l2 = lLogs[lLogs.length - 1];

        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext('2d');

        // 1. Background Gradient (Premium Slate to Teal)
        const grad = ctx.createLinearGradient(0, 0, 0, 1920);
        grad.addColorStop(0, '#0f172a'); // slate-900
        grad.addColorStop(1, '#0d9488'); // brand-600
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1080, 1920);

        // 2. Load Photos
        const loadImage = (url) => new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.crossOrigin = "anonymous";
            img.src = url;
        });

        const safeImgUrl = (p) => p?.url || 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=400&h=400&q=40';

        try {
            const drawQuadrant = async (dateStr, x, y, w, h) => {
                const log = baseWeightLogs.find(l => l.date === dateStr);
                const photo = findPhotoForDate(dateStr);
                const adj = photoAdjustments[dateStr] || { x: 0, y: 0, scale: 1 };
                const img = await loadImage(safeImgUrl(photo));

                ctx.save();
                ctx.beginPath();
                ctx.rect(x, y, w, h);
                ctx.clip();

                // Layer 1: Background Blur (Context)
                ctx.save();
                ctx.filter = 'blur(60px) brightness(0.6)';
                const bScale = Math.max(w / img.width, h / img.height) * 1.2;
                ctx.translate(x + w/2, y + h/2);
                ctx.scale(bScale, bScale);
                ctx.drawImage(img, -img.width/2, -img.height/2);
                ctx.restore();

                // Layer 2: Main Image (Foreground with Adjustments)
                const canvasX = adj.x * (1080 / 400); 
                const canvasY = adj.y * (1080 / 400);
                
                ctx.save();
                ctx.filter = 'none';
                ctx.translate(canvasX, canvasY);
                ctx.translate(x + w/2, y + h/2);
                ctx.scale(adj.scale, adj.scale);
                
                const fScale = Math.min(w / img.width, h / img.height);
                ctx.scale(fScale, fScale);
                ctx.drawImage(img, -img.width/2, -img.height/2);
                ctx.restore();
                ctx.restore();

                const drawHardText = (text, tx, ty, fontSize, color = '#ffffff', align = 'left') => {
                    ctx.font = `900 ${fontSize}px Outfit, sans-serif`;
                    ctx.textAlign = align;
                    ctx.fillStyle = '#000000';
                    const offset = Math.max(2, fontSize / 20);
                    ctx.fillText(text, tx + offset, ty + offset);
                    ctx.fillStyle = color;
                    ctx.fillText(text, tx, ty);
                };

                const dateText = new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                const isFourGrid = sortedDates.length === 4;
                const align = isFourGrid ? 'left' : 'center';
                const tx = isFourGrid ? (x + 40) : (x + w/2);
                const wSize = isFourGrid ? 75 : 90;
                const dSize = isFourGrid ? 35 : 40;
                
                drawHardText(`${log.weight}kg`, tx, y + h - 140, wSize, '#ffffff', align);
                drawHardText(dateText.toUpperCase(), tx, y + h - 70, dSize, 'rgba(255,255,255,0.7)', align);
            };

            const count = sortedDates.length;
            if (count === 2) {
                await drawQuadrant(sortedDates[0], 0, 0, 538, 1920);
                await drawQuadrant(sortedDates[1], 542, 0, 538, 1920);
            } else if (count === 3) {
                await drawQuadrant(sortedDates[0], 0, 0, 1080, 638);
                await drawQuadrant(sortedDates[1], 0, 641, 1080, 638);
                await drawQuadrant(sortedDates[2], 0, 1282, 1080, 638);
            } else if (count === 4) {
                await drawQuadrant(sortedDates[0], 0, 0, 538, 958);
                await drawQuadrant(sortedDates[1], 542, 0, 538, 958);
                await drawQuadrant(sortedDates[2], 0, 962, 538, 958);
                await drawQuadrant(sortedDates[3], 542, 962, 538, 958);
            }

            // 4. Branding Overlay
            ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20;
            ctx.fillStyle = 'white'; ctx.textAlign = 'center';
            ctx.font = '900 90px Outfit, sans-serif';
            ctx.fillText('MOUnJOY', 540, 180);
            ctx.font = 'bold 36px Outfit, sans-serif';
            ctx.fillText('Sua Jornada Metabolicamente Ativa', 540, 240);
            ctx.shadowBlur = 0;

            const totalDiff = (l2.weight - l1.weight).toFixed(1);
            // Dynamic position: 900 for evens (2/4), 1220 for 3-stack (between 2nd/3rd)
            const badgeY = (count === 2 || count === 4) ? 900 : 1220; 
            ctx.fillStyle = parseFloat(totalDiff) <= 0 ? '#0d9488' : '#ef4444';
            ctx.beginPath(); ctx.roundRect(405, badgeY, 270, 120, 60); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.font = '900 50px Outfit, sans-serif';
            ctx.fillText(`${totalDiff > 0 ? '+' : ''}${totalDiff}kg`, 540, badgeY + 75);

            setExportPreview(canvas.toDataURL('image/png'));
        } catch (error) {
            console.error('Export error:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const data = {
        labels: view === 'weight'
            ? weightLogs.map(m => {
                const d = new Date(m.date);
                if (timeFilter === 'A') return d.getFullYear();
                if (timeFilter === 'M') return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d);
                return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(d);
            })
            : ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7'],
        datasets: [{
            label: view === 'weight' ? (hasEnoughData ? 'Peso (kg)' : 'Peso (Demo)') : 'Glicemia (mg/dL)',
            data: view === 'weight' ? weightLogs.map(m => m.weight) : glucoseHistory,
            borderColor: view === 'weight' ? '#0d9488' : '#34d399',
            backgroundColor: (context) => {
                const chart = context.chart;
                const { ctx, chartArea } = chart;
                if (!chartArea) return 'rgba(13, 148, 136, 0.1)';
                const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                const color = view === 'weight' ? 'rgba(13, 148, 136, 0.4)' : 'rgba(52, 211, 153, 0.4)';
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
                gradient.addColorStop(1, color);
                return gradient;
            },
            borderWidth: 4,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: view === 'weight' ? '#0d9488' : '#34d399',
            pointBorderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 7,
            fill: true,
            tension: 0.4
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1e293b',
                bodyColor: '#475569',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 16,
                displayColors: false,
                callbacks: {
                    label: (context) => {
                        const val = context.parsed.y;
                        const label = view === 'weight' ? `Peso: ${val}kg` : `Glicemia: ${val}mg/dL`;

                        if (view === 'weight' && user.height) {
                            const bmi = (val / (user.height * user.height)).toFixed(1);
                            return [label, `IMC: ${bmi}`, "Estado: Em evolução"];
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                grid: { color: '#f1f5f9', drawBorder: false },
                min: view === 'weight' ? Math.min(...weightLogs.map(m => m.weight)) - 5 : 60,
                ticks: {
                    font: { family: 'Outfit', size: 10, weight: 'bold' },
                    color: '#94a3b8'
                }
            },
            x: {
                grid: { display: false },
                ticks: {
                    font: { family: 'Outfit', size: 10, weight: 'bold' },
                    color: '#94a3b8'
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index',
        },
    };

    const heightInMeters = parseFloat(user.height) || 1.7;
    const currentWeight = parseFloat(user.currentWeight) || 80;
    const imc = (currentWeight / (heightInMeters * heightInMeters)).toFixed(1);

    const lastDoseDate = user.doseHistory?.[0] ? new Date(user.doseHistory[0].date) : null;
    const nextDoseDate = lastDoseDate ? new Date(lastDoseDate.getTime() + 7 * 24 * 60 * 60 * 1000) : null;

    return (
        <div className="space-y-6 pb-24">
            <div className="flex justify-between items-end stagger-1 fade-in mt-2 ml-1">
                <h2 className="text-2xl font-bold font-outfit">Sua Evolução</h2>
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                    <button
                        onClick={() => setView('weight')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${view === 'weight' ? 'bg-white text-brand shadow-sm' : 'text-slate-400'}`}
                    >
                        Peso
                    </button>
                    <button
                        onClick={() => setView('glucose')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${view === 'glucose' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400'}`}
                    >
                        Glicemia
                    </button>
                </div>
            </div>

            <div className="glass-panel p-5 rounded-[40px] shadow-soft stagger-2 fade-in">
                <div className="h-64 w-full">
                    <Line data={data} options={options} />
                </div>

                {/* Evolution Comparison Section */}
                <div className="mt-8 pt-8 border-t border-brand-50/50 flex flex-col gap-6">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <Scale size={14} className="text-brand-600" />
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em] font-outfit">Comparador Visual</h3>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Selecione até 4 registros para comparar</p>
                    </div>

                    {/* Horizontal Date Picker */}
                    <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
                        {baseWeightLogs.slice().reverse().map((log, idx) => {
                            const isSelected = selectedDates.includes(log.date);
                            const d = new Date(log.date);
                            return (
                                <button
                                    key={idx}
                                    onClick={() => toggleDate(log.date)}
                                    className={`px-4 py-2.5 rounded-2xl text-[10px] font-black whitespace-nowrap transition-all border flex flex-col items-center gap-1 ${isSelected
                                        ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-200 scale-105 z-10'
                                        : 'bg-white text-slate-500 border-slate-100 hover:border-brand-200 hover:bg-brand-50/30'
                                        } ${!isSelected && selectedDates.length >= 4 ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                                    disabled={!isSelected && selectedDates.length >= 4}
                                >
                                    <span className="opacity-70">{d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                                    <span className="text-xs font-black">{log.weight}kg</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Comparison Cards Grid */}
                    {selectedDates.length > 0 ? (
                        <>
                            <div className={`grid gap-4 transition-all duration-500 ${selectedDates.length === 1 ? 'grid-cols-1 max-w-[180px] mx-auto' : selectedDates.length === 2 ? 'grid-cols-2' : selectedDates.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                {selectedDates.slice().sort((a, b) => new Date(a) - new Date(b)).map((dateStr, idx, arr) => {
                                    const log = baseWeightLogs.find(l => l.date === dateStr);
                                    if (!log) return null;
                                    const photo = findPhotoForDate(dateStr);
                                    const prevLog = idx > 0 ? baseWeightLogs.find(l => l.date === arr[idx - 1]) : null;
                                    const diff = (prevLog && log) ? (log.weight - prevLog.weight).toFixed(1) : null;

                                    return (
                                        <div key={dateStr} className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
                                            <div className="aspect-[3/4] rounded-none bg-slate-100 shadow-sm overflow-hidden relative group border border-slate-100/50">
                                                {photo ? (
                                                    <img src={photo.url} alt="Progresso" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                                                        <Camera size={20} />
                                                    </div>
                                                )}
                                                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                                                <div className="absolute bottom-2 left-0 right-0 text-center z-10">
                                                    <span className="text-[9px] font-black text-white uppercase tracking-widest drop-shadow-md">
                                                        {new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                    </span>
                                                </div>
                                                <button onClick={() => toggleDate(dateStr)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-red-600 hover:bg-red-600 hover:text-white transition-all active:scale-90 z-20">
                                                    <X size={12} strokeWidth={4} />
                                                </button>
                                            </div>
                                            <div className="text-center">
                                                <div className="flex items-baseline justify-center gap-0.5">
                                                    <span className="text-xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">{log.weight}</span>
                                                    <span className="text-[10px] font-black text-slate-400">kg</span>
                                                </div>
                                                {diff !== null && (
                                                    <div className={`text-[9px] font-black mt-1 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full ${parseFloat(diff) <= 0 ? 'bg-brand-50 text-brand-600' : 'bg-red-50 text-red-600'}`}>
                                                        {parseFloat(diff) <= 0 ? '' : '+'}{diff}kg
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {selectedDates.length >= 2 && (
                                <button 
                                    onClick={() => { setShowFullComparison(true); setShowOnboarding(true); setTimeout(() => setShowOnboarding(false), 4000); }}
                                    className="w-full py-4 rounded-3xl bg-brand-50 text-brand-600 flex items-center justify-center gap-3 border border-brand-100 shadow-sm hover:bg-brand-600 hover:text-white transition-all active:scale-95 group font-black text-xs uppercase tracking-widest mt-4"
                                >
                                    <Maximize2 size={18} className="group-hover:scale-110 transition-transform" />
                                    Expandir Comparativo
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200 animate-pulse">
                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3 shadow-ssm">
                                <TrendingUp size={24} className="text-brand-300" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center px-6">Escolha registros acima<br/>para iniciar o comparativo</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 stagger-3 fade-in">
                <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 group hover:border-green-200 transition-colors">
                    <div className="w-10 h-10 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Activity size={20} />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-outfit mb-1">Glicemia Média</p>
                    <p className="text-2xl font-bold text-slate-800">92 <span className="text-xs font-medium text-slate-400">mg/dL</span></p>
                </div>

                <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 group hover:border-blue-200 transition-colors">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <TrendingUp size={20} />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-outfit mb-1">IMC Atual</p>
                    <p className="text-2xl font-bold text-slate-800">{imc}</p>
                </div>
            </div>

            {/* Dose History (Real data view) */}
            <div className="stagger-4 fade-in bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50/50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-brand">
                        <Calendar size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Controle de Protocolo</p>
                        <p className="text-sm font-black text-slate-700">{user.medicationId} • Recentes</p>
                    </div>
                </div>
                <div className="space-y-4 relative z-10">
                    {user.doseHistory && user.doseHistory.length > 0 ? (
                        user.doseHistory.slice(0, 3).map((dose, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-50 pb-3 last:border-0">
                                <div className="flex flex-col">
                                    <span className="text-slate-600 font-bold">{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(dose.date))}</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{dose.area}</span>
                                </div>
                                <span className="font-black text-brand tabular-nums">{dose.dose}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-slate-400 italic">Nenhuma dose registrada ainda.</p>
                    )}

                    {nextDoseDate && (
                        <div className="flex justify-between items-center text-sm pt-2 bg-white/5 p-3 rounded-2xl">
                            <span className="text-white/60 font-medium italic">Próxima Dose Sugerida</span>
                            <span className="font-black text-brand-300">
                                {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(nextDoseDate)}
                            </span>
                        </div>
                    )}
                </div>
            </div>
            {/* Fullscreen Side-by-Side View */}
            {showFullComparison && (
                <div 
                    className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center animate-in fade-in duration-300 select-none"
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleMouseUp}
                >
                    {/* Header Controls */}
                    <div className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-6 z-50 bg-gradient-to-b from-black/80 to-transparent">
                        <button 
                            onClick={() => setShowFullComparison(false)}
                            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center text-white border border-white/10"
                        >
                            <X size={20} />
                        </button>
                        
                        <div className="flex flex-col items-center">
                            <h2 className="text-xl font-black text-white tracking-widest uppercase">Evolução</h2>
                            <p className="text-[8px] font-black text-brand-400 uppercase tracking-widest">Ajuste & Compartilhe</p>
                        </div>

                        <button 
                            onClick={handleExportStory}
                            disabled={isExporting}
                            className={`w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center text-white border border-white/10 ${isExporting ? 'animate-pulse' : ''}`}
                        >
                            {isExporting ? <Activity className="animate-spin" size={18} /> : <Share2 size={18} />}
                        </button>
                    </div>

                    <div className="w-full h-full relative overflow-hidden">
                        <div className={`grid w-full h-full gap-1 bg-slate-900 ${selectedDates.length === 2 ? 'grid-cols-2' : selectedDates.length === 3 ? 'grid-cols-1 grid-rows-3' : 'grid-cols-2 grid-rows-2'}`}>
                            {selectedDates.slice().sort((a,b) => new Date(a) - new Date(b)).map((dateStr, idx) => {
                                const log = baseWeightLogs.find(l => l.date === dateStr);
                                const photo = findPhotoForDate(dateStr);
                                const adj = photoAdjustments[dateStr] || { x: 0, y: 0, scale: 1 };
                                
                                return (
                                    <div 
                                        key={idx} 
                                        className="relative h-full overflow-hidden cursor-move touch-none"
                                        onMouseDown={(e) => handleMouseDown(e, dateStr)}
                                        onTouchStart={(e) => handleTouchStart(e, dateStr)}
                                        onWheel={(e) => handleWheel(e, dateStr)}
                                    >
                                        {photo ? (
                                            <div className="w-full h-full relative">
                                                {/* Background Blur: Fills the grid with context (UX Pillar 02/03) */}
                                                <img 
                                                    src={photo.url} 
                                                    alt="Background Blur" 
                                                    className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-40 scale-110 pointer-events-none"
                                                />
                                                
                                                {/* Main Image: Fully visible and adjustable */}
                                                <img 
                                                    src={photo.url} 
                                                    alt="Progresso" 
                                                    className="w-full h-full object-contain origin-center pointer-events-none relative z-10"
                                                    style={{ 
                                                        transform: `scale(${adj.scale}) translate(${adj.x / adj.scale}px, ${adj.y / adj.scale}px)` 
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600">
                                                <Camera size={24} />
                                            </div>
                                        )}
                                        
                                        {/* Interaction Hints (Only visible when not dragging) */}
                                        {!isDragging && (
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                                <div className="flex gap-4">
                                                    <ZoomIn size={32} className="text-white/50" />
                                                    <ZoomOut size={32} className="text-white/50" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Info Overlay (Bottom) */}
                                        <div className={`absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/99 via-black/30 to-transparent flex flex-col ${selectedDates.length === 4 ? 'items-start px-4' : 'items-center'} justify-end pb-4 pointer-events-none z-30`}>
                                            <p className={`font-black text-white leading-none mb-1 [text-shadow:2px_2px_0px_rgba(0,0,0,1)] ${selectedDates.length === 4 ? 'text-xl' : 'text-3xl'}`}>{log.weight}kg</p>
                                            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-none [text-shadow:1px_1px_0px_rgba(0,0,0,1)]">
                                                {new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Instructional Overlay (Vertical List with Animations) */}
                        {showOnboarding && (
                            <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-500">
                                <div className="flex flex-col gap-12 items-center">
                                    <div className="flex flex-col items-center gap-3 animate-in slide-in-from-bottom-8 duration-700">
                                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl">
                                            <Activity size={24} className="text-white animate-drag" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-1">Arraste para Mover</p>
                                            <p className="text-[8px] font-bold text-white/50 uppercase">Toque e deslize a foto</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-3 animate-in slide-in-from-bottom-8 duration-1000">
                                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl">
                                            <ZoomIn size={24} className="text-white animate-scrollZoom" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-1">Pinch ou Scroll</p>
                                            <p className="text-[8px] font-bold text-white/50 uppercase">Para ajustar o zoom</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Bottom Total Loss Badge */}
                        {selectedDates.length >= 2 && !isDragging && (
                            <div className={`absolute left-1/2 -translate-x-1/2 z-40 pointer-events-none ${selectedDates.length === 3 ? 'bottom-20' : 'top-1/2 -translate-y-1/2'}`}>
                                <div className="bg-brand-600 text-white px-4 py-2 rounded-full font-black text-xs border border-brand-400/30 shadow-2xl scale-110">
                                    {([...selectedDates].sort((a,b) => new Date(a)-new Date(b)).length > 1) && (
                                        (baseWeightLogs.find(l => l.date === [...selectedDates].sort((a,b) => new Date(a)-new Date(b))[selectedDates.length - 1])?.weight - baseWeightLogs.find(l => l.date === [...selectedDates].sort((a,b) => new Date(a)-new Date(b))[0])?.weight).toFixed(1)
                                    )}kg
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Share / Export Preview Modal */}
            {exportPreview && (
                <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-white rounded-[40px] overflow-hidden shadow-2xl flex flex-col items-center p-8 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center w-full mb-6">
                            <h3 className="text-xl font-black text-slate-800">Sua Evolução ✨</h3>
                            <button onClick={() => setExportPreview(null)} className="p-2 rounded-full bg-slate-50 text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="w-full aspect-[9/16] bg-slate-100 rounded-3xl overflow-hidden shadow-inner mb-6 relative group">
                            <img src={exportPreview} alt="Preview" className="w-full h-full object-contain" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <Download size={40} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-xl" />
                            </div>
                        </div>

                        <button 
                            onClick={() => {
                                const link = document.createElement('a');
                                link.download = `mounjoy-evolucao-${new Date().getTime()}.png`;
                                link.href = exportPreview;
                                link.click();
                            }}
                            className="w-full py-4 rounded-2xl bg-brand-600 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all active:scale-95"
                        >
                            <Download size={18} />
                            Baixar Foto
                        </button>
                        
                        <p className="mt-4 text-[10px] text-slate-400 font-medium text-center uppercase tracking-widest">
                            Pronto para inspirar sua jornada!
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Charts;
