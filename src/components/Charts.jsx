import React, { useState } from 'react';
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
import { Activity, TrendingUp, Calendar } from 'lucide-react';

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

    const glucoseHistory = [98, 105, 92, 110, 89, 94, 91];

    // Weight History Logic: Real data takes priority, but we add mock data if empty for demo purposes
    const hasEnoughData = user.measurements && user.measurements.length >= 3;

    let baseWeightLogs = user.measurements && user.measurements.length > 0
        ? [...user.measurements].sort((a, b) => new Date(a.date) - new Date(b.date))
        : [];

    if (!hasEnoughData) {
        const demoPoints = [
            { date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), weight: (parseFloat(user.startWeight) || 90) + 5 },
            { date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), weight: (parseFloat(user.startWeight) || 90) + 2 },
            { date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), weight: (parseFloat(user.startWeight) || 90) },
            { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), weight: (parseFloat(user.startWeight) || 90) - 1.2 },
            { date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), weight: (parseFloat(user.startWeight) || 90) - 2.8 },
            { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), weight: (parseFloat(user.startWeight) || 90) - 3.5 },
            { date: new Date().toISOString(), weight: user.currentWeight }
        ];
        baseWeightLogs = hasEnoughData ? baseWeightLogs : demoPoints;
    }

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
        </div>
    );
};

export default Charts;
