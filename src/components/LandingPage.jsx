import React from 'react';
import { Activity, ShieldCheck, Zap, Heart, ArrowRight, CheckCircle2, Info, Camera, Calendar, TrendingUp, Maximize2 } from 'lucide-react';
import { Button } from './ui/BaseComponents';

const LandingPage = ({ onStart, onLogin, onToggleTheme }) => {
    return (
        <div className="min-h-screen bg-[#f8fafc] overflow-x-hidden font-outfit selection:bg-brand-100">
            {/* Minimalist Landing Header */}
            <header className="px-6 py-6 flex justify-between items-center max-w-6xl mx-auto absolute top-0 left-0 right-0 z-50">
                <div className="flex items-center gap-4">
                    <img src="/logomount.png" alt="Mounjoy Logo" className="h-10 w-auto object-contain" />
                    <button 
                        onClick={onToggleTheme}
                        className="px-3 py-1 rounded-full bg-slate-100/80 backdrop-blur-sm shadow-sm border border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider hover:bg-white transition-all active:scale-95"
                    >
                        Testar Estilo Fun
                    </button>
                </div>
                <button
                    onClick={onLogin}
                    className="px-6 py-2.5 rounded-full bg-white/80 backdrop-blur-md border border-slate-200 text-slate-600 font-bold text-sm shadow-sm hover:shadow-md hover:bg-white transition-all active:scale-95"
                >
                    Entrar
                </button>
            </header>

            {/* Decorative Background Elements */}
            <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-brand-100/30 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-100/20 rounded-full blur-[120px] pointer-events-none"></div>

            {/* Hero Section */}
            <section className="relative px-6 pt-24 pb-16 text-center max-w-5xl mx-auto md:pt-40 md:pb-32">
                <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.05] mb-8 animate-slideUp md:text-7xl lg:text-8xl">
                    Sua jornada com GLP-1, <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400">mais leve e tecnológica.</span>
                </h1>

                <p className="text-slate-500 text-lg font-medium leading-relaxed mb-12 animate-slideUp max-w-2xl mx-auto md:text-xl" style={{ animationDelay: '0.1s' }}>
                    O suporte definitivo para usuários de Mounjaro, Ozempic e protocolos de emagrecimento. Gerencie doses, acompanhe evolução e veja sua transformação.
                </p>

                <div className="flex flex-col items-center gap-6 animate-slideUp mb-20" style={{ animationDelay: '0.2s' }}>
                    <Button onClick={onStart} className="py-7 px-12 text-xl shadow-xl shadow-brand-500/20 w-full max-w-md rounded-3xl">
                        Começar meu Protocolo <ArrowRight size={20} className="ml-2" />
                    </Button>
                    <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 opacity-60">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] flex items-center gap-2"><ShieldCheck size={14} className="text-brand" /> 100% Seguro</span>
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] flex items-center gap-2"><Activity size={14} className="text-blue-500" /> Bio-Hábitos</span>
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] flex items-center gap-2"><Camera size={14} className="text-brand" /> Evolução Visual</span>
                    </div>
                </div>

                {/* Dashboard Mockup Representation */}
                <div className="relative mx-auto max-w-4xl animate-slideUp" style={{ animationDelay: '0.3s' }}>
                    <div className="glass-panel rounded-[48px] p-6 md:p-10 shadow-2xl border border-white/60 relative overflow-hidden">
                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Evolution Mockup */}
                            <div className="flex-1 space-y-6 text-left">
                                <div className="flex justify-between items-end mb-4">
                                    <h2 className="text-xl font-bold font-outfit text-slate-800">Sua Evolução</h2>
                                    <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                                        <div className="px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-white text-brand shadow-sm">Peso</div>
                                        <div className="px-3 py-1 rounded-lg text-[9px] font-black uppercase text-slate-400">Glicemia</div>
                                    </div>
                                </div>
                                <div className="aspect-[16/9] bg-slate-50/50 rounded-[32px] border border-slate-100/50 flex flex-col items-center justify-center p-8 overflow-hidden relative">
                                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                        <Activity size={120} className="text-brand-200" />
                                    </div>
                                    <div className="relative z-10 flex flex-col items-center">
                                        <span className="text-4xl font-black text-slate-900 tracking-tighter">-10.5kg</span>
                                        <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest mt-1 bg-brand-50 px-3 py-1 rounded-full">Meta de 10% atingida 🎉</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/60 p-4 rounded-[28px] border border-white/80 shadow-sm">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Glicemia Média</p>
                                        <p className="text-xl font-black text-slate-800">92 <span className="text-[10px] font-medium text-slate-400">mg/dL</span></p>
                                    </div>
                                    <div className="bg-white/60 p-4 rounded-[28px] border border-white/80 shadow-sm">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">IMC Atual</p>
                                        <p className="text-xl font-black text-slate-800">27.7</p>
                                    </div>
                                </div>
                            </div>

                            {/* Protocol Mockup */}
                            <div className="w-full md:w-80 space-y-6 text-left">
                                <div className="bg-brand-900 rounded-[40px] p-6 text-white shadow-xl relative overflow-hidden group h-full flex flex-col justify-between">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/20 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                                    
                                    <div className="space-y-6 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
                                                <Calendar size={20} className="text-brand-200" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-brand-200 uppercase tracking-[0.15em] leading-none mb-1.5 [text-shadow:1.5px_1.5px_0px_rgba(0,0,0,1)]">Controle de Protocolo</p>
                                                <p className="text-xl font-black text-white [text-shadow:2px_2px_0px_rgba(0,0,0,1)]">Mounjaro • Dose 5.0</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center text-sm border-b border-white/10 pb-3 last:border-0 font-medium">
                                                <span className="opacity-60">Última Dose</span>
                                                <span className="font-black text-white">27 de mar.</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm pt-2 bg-white/5 p-4 rounded-2xl border border-white/5">
                                                <span className="opacity-60 italic text-xs">Próxima Dose</span>
                                                <span className="font-black text-brand-300">03 de abr.</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 relative z-10">
                                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-brand-400 rounded-full" style={{ width: '65%' }}></div>
                                        </div>
                                        <p className="text-[9px] font-black text-brand-200 uppercase tracking-widest mt-2">Nível Sérico: Estável</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Floating accents */}
                    <div className="absolute top-1/2 -left-12 -translate-y-1/2 w-24 h-24 bg-brand-400/20 rounded-full blur-2xl -z-10 animate-pulse"></div>
                    <div className="absolute top-1/2 -right-12 -translate-y-1/2 w-24 h-24 bg-blue-400/20 rounded-full blur-2xl -z-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
            </section>

            {/* Core Features - Focus on Conversion */}
            <section className="px-6 py-24 max-w-6xl mx-auto">
                <div className="text-center mb-20 px-4">
                    <h2 className="text-4xl font-extrabold text-slate-900 md:text-5xl tracking-tight">Um app feito para <br />quem quer resultado real.</h2>
                    <div className="h-2 w-20 bg-brand mx-auto mt-6 rounded-full"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Visual Comparison */}
                    <div className="card-super group transition-all duration-300 hover:-translate-y-2">
                        <div className="w-12 h-12 bg-brand-50 text-brand rounded-2xl flex items-center justify-center mb-6">
                            <Camera size={24} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-3 tracking-tight">Comparador Visual</h3>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium">
                            Documente cada centímetro da sua evolução. Compare até 4 fotos com ajustes de zoom para ver a transformação real além da balança.
                        </p>
                    </div>

                    {/* Protocol Precision */}
                    <div className="card-super group transition-all duration-300 hover:-translate-y-2">
                        <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                            <Zap size={24} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-3 tracking-tight">Precisão no Protocolo</h3>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium">
                            Gestão inteligente de dosagens e gestão de estoque de canetas. Lembretes automáticos baseados no tempo de meia-vida da medicação.
                        </p>
                    </div>

                    {/* Bio-Habits */}
                    <div className="card-super group transition-all duration-300 hover:-translate-y-2">
                        <div className="w-12 h-12 bg-orange-50 text-orange-400 rounded-2xl flex items-center justify-center mb-6">
                            <Activity size={24} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-3 tracking-tight">Bio-Hábitos</h3>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium">
                            Minimizamos efeitos colaterais com protocolos de hidratação e nutrição proteica validados para usuários de GLP-1.
                        </p>
                    </div>
                </div>
            </section>

            {/* Visual Showcase - Photo comparison logic */}
            <section className="px-6 pb-24 max-w-6xl mx-auto">
                <div className="bg-slate-900 rounded-[64px] p-8 md:p-20 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-brand-600/10 to-transparent pointer-events-none"></div>
                    <div className="flex flex-col md:flex-row items-center gap-16 relative z-10">
                        <div className="flex-1 space-y-8 text-left">
                            <div className="inline-flex items-center gap-2 bg-brand-500/20 px-4 py-1.5 rounded-full text-brand-300 text-[10px] font-black uppercase tracking-[0.2em] border border-brand-500/30">
                                Evolução Visual
                            </div>
                            <h2 className="text-4xl font-black md:text-6xl tracking-tighter leading-[1.05]">
                                Veja sua <br /><span className="text-brand-400">transformação.</span>
                            </h2>
                            <p className="text-slate-400 font-medium text-lg leading-relaxed max-w-md">
                                Compare fotos de diferentes semanas com nossa ferramenta profissional de zoom e alinhamento. A balança é um número, sua foto é a prova.
                            </p>
                            <div className="pt-4 flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center"><CheckCircle2 size={14} className="text-brand-400" /></div>
                                    <span className="text-sm font-bold opacity-80">Galeria 100% privada e criptografada</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center"><CheckCircle2 size={14} className="text-brand-400" /></div>
                                    <span className="text-sm font-bold opacity-80">Sobreposição de fotos para comparação exata</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                            <div className="aspect-[3/4] rounded-3xl bg-white/5 border border-white/10 overflow-hidden relative group">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Camera size={40} className="text-white/10" />
                                </div>
                                <div className="absolute bottom-4 left-4 right-4 text-center">
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest bg-black/40 backdrop-blur-md px-3 py-1 rounded-full">Semana 1</span>
                                </div>
                            </div>
                            <div className="aspect-[3/4] rounded-3xl bg-white/5 border border-white/10 overflow-hidden relative group">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-brand-500/40 animate-ping"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                         <Camera size={40} className="text-brand-400" />
                                    </div>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4 text-center">
                                    <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest bg-brand-900/60 backdrop-blur-md px-3 py-1 rounded-full">Semana 12</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="px-6 py-24 text-center max-w-4xl mx-auto">
                <div className="space-y-10">
                    <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight md:text-6xl">
                        Sua jornada com GLP-1 <br />
                        <span className="text-slate-400">com o suporte que você merece.</span>
                    </h2>

                    <div className="flex flex-col items-center gap-6">
                        <Button onClick={onStart} className="w-full max-w-md bg-brand-900 text-white font-black hover:bg-black py-8 text-xl rounded-3xl shadow-2xl">
                            Criar meu protocolo agora
                        </Button>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                             <CheckCircle2 size={14} className="text-brand" /> Registro simples • Grátis para começar
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="px-6 py-16 border-t border-slate-100 bg-white">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <img src="/logomount.png" alt="Mounjoy" className="h-8 opacity-50 grayscale" />
                    <div className="flex flex-col items-center md:items-end gap-2 text-slate-400 text-xs font-medium">
                        <p>© 2026 Mounjoy. Premium Welfare Tech.</p>
                        <p className="max-w-xs text-center md:text-right opacity-60 leading-relaxed italic">
                            O Mounjoy é uma ferramenta de suporte. Consulte seu médico para decisões clínicas.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
