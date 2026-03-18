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

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        updateAdjustment(isDragging, {
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
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
        
        const sortedDates = [...selectedDates].sort((a, b) => new Date(a) - new Date(b)).slice(0, 2);
        const l1 = baseWeightLogs.find(l => l.date === sortedDates[0]);
        const l2 = baseWeightLogs.find(l => l.date === sortedDates[1]);
        const p1 = findPhotoForDate(sortedDates[0]);
        const p2 = findPhotoForDate(sortedDates[1]);

        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext('2d');

        // 1. Background Gradient (Premium Slate to Teal)
        const grad = ctx.createLinearGradient(0, 0, 0, 1920);
        grad.addColorStop(0, '#0f172a'); // slate-900
        grad.addColorStop(1, '#0d9488'); // teal-600
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
            const img1 = await loadImage(safeImgUrl(p1));
            const img2 = await loadImage(safeImgUrl(p2));

            const drawFullWidth = (img, y, weight, date, height = 500, adj = {x:0, y:0, scale:1}) => {
                const imgRatio = img.width / img.height;
                const targetRatio = 1080 / height;
                let sx, sy, sw, sh;
                if (imgRatio > targetRatio) {
                    sh = img.height; sw = sh * targetRatio;
                    sx = (img.width - sw) / 2; sy = 0;
                } else {
                    sw = img.width; sh = sw / targetRatio;
                    sx = 0; sy = (img.height - sh) / 2;
                }

                ctx.save();
                ctx.beginPath();
                ctx.rect(0, y, 1080, height);
                ctx.clip();
                
                // Adjustment scale/translate (mapped from screen pixels to canvas pixels roughly)
                // Since modal is roughly 400px and canvas is 1080px, scale is ~2.7x
                const canvasX = adj.x * 2.7;
                const canvasY = adj.y * 2.7;
                
                ctx.translate(canvasX, canvasY);
                ctx.translate(540, y + height/2);
                ctx.scale(adj.scale, adj.scale);
                ctx.translate(-540, -(y + height/2));

                ctx.drawImage(img, sx, sy, sw, sh, 0, y, 1080, height);
                ctx.restore();
                
                // Bottom Gradient
                const grad = ctx.createLinearGradient(0, y + height - 200, 0, y + height);
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(1, 'rgba(0,0,0,0.8)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, y + height - 200, 1080, 200);

                // Info
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'right';
                ctx.font = 'black 80px Outfit, sans-serif';
                ctx.fillText(`${weight}kg`, 1030, y + height - 100);
                ctx.font = 'bold 30px Outfit, sans-serif';
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.fillText(new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }), 1030, y + height - 50);
            };

            const drawGrid = (img, x, y, w, h, weight, date, adj = {x:0, y:0, scale:1}) => {
                const imgRatio = img.width / img.height;
                const targetRatio = w / h;
                let sx, sy, sw, sh;
                if (imgRatio > targetRatio) {
                    sh = img.height; sw = sh * targetRatio;
                    sx = (img.width - sw) / 2; sy = 0;
                } else {
                    sw = img.width; sh = sw / targetRatio;
                    sx = 0; sy = (img.height - sh) / 2;
                }

                ctx.save();
                ctx.beginPath();
                ctx.rect(x, y, w, h);
                ctx.clip();

                const canvasX = adj.x * 2.7;
                const canvasY = adj.y * 2.7;
                
                ctx.translate(canvasX, canvasY);
                ctx.translate(x + w/2, y + h/2);
                ctx.scale(adj.scale, adj.scale);
                ctx.translate(-(x + w/2), -(y + h/2));

                ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
                ctx.restore();

                const grad = ctx.createLinearGradient(0, y + h - 150, 0, y + h);
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(1, 'rgba(0,0,0,0.8)');
                ctx.fillStyle = grad;
                ctx.fillRect(x, y + h - 150, w, 150);
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.font = 'black 60px Outfit, sans-serif';
                ctx.fillText(`${weight}kg`, x + w/2, y + h - 70);
                ctx.font = 'bold 24px Outfit, sans-serif';
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.fillText(new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), x + w/2, y + h - 30);
            };

            const count = sortedDates.length;
            if (count === 2) {
                const drawHalf = (img, x, weight, date, adj = {x:0, y:0, scale:1}) => {
                    const imgRatio = img.width / img.height;
                    const targetRatio = 538 / 1920;
                    let sx, sy, sw, sh;
                    if (imgRatio > targetRatio) {
                        sh = img.height; sw = sh * targetRatio;
                        sx = (img.width - sw) / 2; sy = 0;
                    } else {
                        sw = img.width; sh = sw / targetRatio;
                        sx = 0; sy = (img.height - sh) / 2;
                    }

                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(x, 0, 538, 1920);
                    ctx.clip();

                    const canvasX = adj.x * 3.5; // Adjusted multiplier for full height
                    const canvasY = adj.y * 3.5;

                    ctx.translate(canvasX, canvasY);
                    ctx.translate(x + 269, 960);
                    ctx.scale(adj.scale, adj.scale);
                    ctx.translate(-(x + 269), -960);

                    ctx.drawImage(img, sx, sy, sw, sh, x, 0, 538, 1920);
                    ctx.restore();

                    const grad = ctx.createLinearGradient(0, 1520, 0, 1920);
                    grad.addColorStop(0, 'transparent'); grad.addColorStop(1, 'rgba(0,0,0,0.8)');
                    ctx.fillStyle = grad; ctx.fillRect(x, 1520, 538, 400);
                    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
                    ctx.font = 'black 100px Outfit, sans-serif';
                    ctx.fillText(`${weight}kg`, x + 269, 1700);
                    ctx.font = 'bold 45px Outfit, sans-serif';
                    ctx.fillStyle = 'rgba(255,255,255,0.8)';
                    ctx.fillText(new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }), x + 269, 1800);
                };
                drawHalf(img1, 0, l1.weight, l1.date, photoAdjustments[sortedDates[0]]);
                drawHalf(img2, 542, l2.weight, l2.date, photoAdjustments[sortedDates[1]]);
            } else if (count === 3) {
                const img3 = await loadImage(safeImgUrl(findPhotoForDate(sortedDates[2])));
                const l3 = baseWeightLogs.find(l => l.date === sortedDates[2]);
                drawFullWidth(img1, 0, l1.weight, l1.date, 640, photoAdjustments[sortedDates[0]]);
                drawFullWidth(img2, 640, l2.weight, l2.date, 640, photoAdjustments[sortedDates[1]]);
                drawFullWidth(img3, 1280, l3.weight, l3.date, 640, photoAdjustments[sortedDates[2]]);
            } else if (count === 4) {
                const img3 = await loadImage(safeImgUrl(findPhotoForDate(sortedDates[2])));
                const img4 = await loadImage(safeImgUrl(findPhotoForDate(sortedDates[3])));
                const l3 = baseWeightLogs.find(l => l.date === sortedDates[2]);
                const l4 = baseWeightLogs.find(l => l.date === sortedDates[3]);
                drawGrid(img1, 0, 0, 539, 959, l1.weight, l1.date, photoAdjustments[sortedDates[0]]);
                drawGrid(img2, 541, 0, 539, 959, l2.weight, l2.date, photoAdjustments[sortedDates[1]]);
                drawGrid(img3, 0, 961, 539, 959, l3.weight, l3.date, photoAdjustments[sortedDates[2]]);
                drawGrid(img4, 541, 961, 539, 959, l4.weight, l4.date, photoAdjustments[sortedDates[3]]);
            }

            // 4. Branding Overlay
            // Top Logo
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.font = 'black 60px Outfit, sans-serif';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 20;
            ctx.textAlign = 'center';
            ctx.fillText('MOUnJOY', 540, 150);
            
            ctx.font = 'bold 24px Outfit, sans-serif';
            ctx.letterSpacing = "8px";
            ctx.fillText('Sua Jornada Metabolicamente Ativa', 540, 200);
            ctx.shadowBlur = 0;

            // Total Progress Bottom Badge
            const totalDiff = (l2.weight - l1.weight).toFixed(1);
            ctx.fillStyle = parseFloat(totalDiff) <= 0 ? '#0d9488' : '#ef4444';
            ctx.beginPath();
            ctx.roundRect(430, 1680, 220, 100, 50);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'black 40px Outfit, sans-serif';
            ctx.fillText(`${totalDiff > 0 ? '+' : ''}${totalDiff}kg`, 540, 1745);

            // Download
            const link = document.createElement('a');
            link.download = `mounjoy-evolution-${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
        } catch (err) {
            console.error(err);
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
                <div className="mt-8 pt-8 border-t border-teal-50/50 flex flex-col gap-6">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <Scale size={14} className="text-teal-600" />
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
                                        ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-200 scale-105 z-10'
                                        : 'bg-white text-slate-500 border-slate-100 hover:border-teal-200 hover:bg-teal-50/30'
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
                                                    <div className={`text-[9px] font-black mt-1 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full ${parseFloat(diff) <= 0 ? 'bg-teal-50 text-teal-600' : 'bg-red-50 text-red-600'}`}>
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
                                    onClick={() => setShowFullComparison(true)}
                                    className="w-full py-4 rounded-3xl bg-teal-50 text-teal-600 flex items-center justify-center gap-3 border border-teal-100 shadow-sm hover:bg-teal-600 hover:text-white transition-all active:scale-95 group font-black text-xs uppercase tracking-widest mt-4"
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
                            <p className="text-[8px] font-black text-teal-400 uppercase tracking-widest">Ajuste & Compartilhe</p>
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
                                        onWheel={(e) => handleWheel(e, dateStr)}
                                    >
                                        {photo ? (
                                            <img 
                                                src={photo.url} 
                                                alt="Progresso" 
                                                className="w-full h-full object-cover origin-center pointer-events-none"
                                                style={{ 
                                                    transform: `scale(${adj.scale}) translate(${adj.x / adj.scale}px, ${adj.y / adj.scale}px)` 
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600">
                                                <Camera size={24} />
                                            </div>
                                        )}
                                        
                                        {/* Interaction Hints (Only visible when not dragging) */}
                                        {!isDragging && (
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                <div className="flex gap-4">
                                                    <ZoomIn size={32} className="text-white/50" />
                                                    <ZoomOut size={32} className="text-white/50" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Info Overlay (Bottom) */}
                                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col items-center justify-end pb-4 pointer-events-none">
                                            <p className="text-2xl font-black text-white leading-none mb-1">{log.weight}kg</p>
                                            <p className="text-[8px] font-black text-white/50 uppercase tracking-widest leading-none">
                                                {new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Help Toast */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black text-white/70 border border-white/10 uppercase tracking-widest pointer-events-none animate-in slide-in-from-bottom-4 duration-1000">
                           Arraste para mover • Scroll para Zoom
                        </div>

                        {/* Bottom Total Loss Badge (Only for 2 photos for clarity) */}
                        {selectedDates.length === 2 && !isDragging && (
                            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                                <div className="bg-teal-600 text-white px-3 py-1 rounded-full font-black text-xs border border-teal-400/30 shadow-2xl">
                                    {(baseWeightLogs.find(l => l.date === [...selectedDates].sort((a,b) => new Date(a)-new Date(b))[1])?.weight - baseWeightLogs.find(l => l.date === [...selectedDates].sort((a,b) => new Date(a)-new Date(b))[0])?.weight).toFixed(1)}kg
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Charts;
