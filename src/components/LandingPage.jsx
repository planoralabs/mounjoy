import React from 'react';
import { Activity, ShieldCheck, Zap, Heart, ArrowRight, CheckCircle2, Info, Camera } from 'lucide-react';
import { Button } from './ui/BaseComponents';

const LandingPage = ({ onStart, onLogin }) => {
    return (
        <div className="min-h-screen bg-[#f8fafc] overflow-x-hidden font-outfit selection:bg-brand-100">
            {/* Minimalist Landing Header */}
            <header className="px-6 py-6 flex justify-between items-center max-w-6xl mx-auto absolute top-0 left-0 right-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-black text-xl">M</div>
                    <span className="text-xl font-bold text-slate-900 tracking-tight">Mounjoy</span>
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
            <section className="relative px-6 pt-20 pb-16 text-center max-w-4xl mx-auto md:pt-32 md:pb-24">
                <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 mb-8 animate-fadeIn">
                    <Heart className="text-red-500" size={16} />
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Seu Companheiro na Jornada Metabólica</span>
                </div>

                <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-8 animate-slideUp md:text-7xl lg:text-8xl">
                    Sua jornada com GLP-1, <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400">agora com mais leveza e controle.</span>
                </h1>

                <p className="text-slate-500 text-lg font-medium leading-relaxed mb-12 animate-slideUp max-w-2xl mx-auto md:text-xl" style={{ animationDelay: '0.1s' }}>
                    O suporte clinicamente orientado para usuários de Mounjaro, Ozempic e protocolos de GLP-1. Viva o emagrecimento com segurança e suporte profissional.
                </p>

                <div className="flex flex-col items-center gap-6 animate-slideUp" style={{ animationDelay: '0.2s' }}>
                    <Button onClick={onStart} className="py-7 px-10 text-xl shadow-xl shadow-brand-500/20 w-full max-w-md">
                        Começar meu Protocolo <ArrowRight size={20} />
                    </Button>
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 opacity-60">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5"><ShieldCheck size={12} /> Design Minimalista</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5"><Activity size={12} /> Suporte Clínico</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5"><Heart size={12} /> 100% Privado</span>
                    </div>
                </div>
            </section>

            {/* Science & Safety Sections */}
            <section className="px-6 py-16 max-w-6xl mx-auto">
                <div className="text-center mb-16 px-4">
                    <h2 className="text-3xl font-bold text-slate-800 md:text-4xl">Um app focado no seu resultado</h2>
                    <div className="h-1.5 w-16 bg-brand mx-auto mt-4 rounded-full"></div>
                    <p className="mt-6 text-slate-500 font-medium max-w-xl mx-auto">
                        O Mounjoy foi desenvolvido para transformar a complexidade do tratamento com GLP-1 em uma jornada segura, previsível e recompensadora.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    {/* Feature 1: Health Guard */}
                    <div className="bg-white p-8 rounded-[40px] shadow-soft border border-slate-50 relative group hover:shadow-xl transition-shadow">
                        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6">
                            <ShieldCheck size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-3">Segurança e Longevidade</h3>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium">
                            Monitoramos sua evolução para garantir que seu emagrecimento seja saudável, priorizando a preservação da <strong>massa magra</strong> e prevenindo o efeito platô indesejado.
                        </p>
                    </div>

                    {/* Feature 2: Intelligent Protocol */}
                    <div className="bg-white p-8 rounded-[40px] shadow-soft border border-slate-50 relative group hover:shadow-xl transition-shadow">
                        <div className="w-12 h-12 bg-brand-50 text-brand rounded-2xl flex items-center justify-center mb-6">
                            <Zap size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-3">Precisão no Protocolo</h3>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium">
                            Gestão inteligente de dosagens e aplicações. Saiba exatamente quando e quanto aplicar, com lembretes personalizados para manter a constância e os resultados.
                        </p>
                    </div>

                    {/* Feature 3: Specifc GLP-1 Habits */}
                    <div className="bg-white p-8 rounded-[40px] shadow-soft border border-slate-50 relative group hover:shadow-xl transition-shadow">
                        <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                            <Activity size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-3">Bio-hábitos Inteligentes</h3>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium">
                            Cálculo dinâmico de hidratação e protocolos de nutrição proteica. Minimizamos os efeitos colaterais e otimizamos a eficácia do tratamento através de hábitos cientificamente validados.
                        </p>
                    </div>
                </div>

                {/* Visual Evolution Section */}
                <div className="bg-white rounded-[48px] p-8 md:p-16 mb-16 shadow-soft border border-slate-50 flex flex-col md:flex-row items-center gap-12 overflow-hidden relative">
                    <div className="flex-1 space-y-6 text-left z-10">
                        <div className="inline-flex items-center gap-2 bg-brand-50 px-3 py-1 rounded-full text-brand-600 text-[10px] font-bold uppercase tracking-wider">
                            Evolução Visual
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-900 leading-tight md:text-4xl">
                            Documente cada <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400">centímetro</span> da sua evolução.
                        </h2>
                        <p className="text-slate-500 font-medium text-base leading-relaxed">
                            O peso na balança é apenas um número. Com o Mounjoy, você registra sua transformação visual e utiliza nossa ferramenta de comparação interativa para ver os resultados reais do seu esforço.
                        </p>
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 border border-slate-100">
                                    <Camera size={18} />
                                </div>
                                <h4 className="font-bold text-slate-700 text-sm italic opacity-80 uppercase tracking-widest">Sua Evolução</h4>
                            </div>
                            <p className="text-sm text-slate-400 font-medium pl-14 mt-[-8px]">Compare fotos do "antes e depois" com ajustes precisos de zoom e posição.</p>
                        </div>
                    </div>

                    <div className="flex-1 w-full max-w-sm relative">
                        {/* Mockup / Visual representation */}
                        <div className="aspect-[4/5] bg-slate-50 rounded-[40px] border border-slate-100 shadow-xl overflow-hidden relative group">
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-50 transition-colors">
                                <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center mb-4 border border-slate-100">
                                    <Camera size={32} className="text-slate-200 group-hover:text-brand-300 transition-colors" />
                                </div>
                                <span className="text-sm font-black text-slate-300 uppercase tracking-[0.2em] text-center group-hover:text-brand-400 transition-colors">Galeria Privada</span>
                                <span className="text-[10px] text-slate-300 mt-2 font-medium text-center opacity-70">Capture e compare seu progresso</span>
                            </div>
                            {/* Decorative framing */}
                            <div className="absolute top-6 left-6 flex gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                                <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                            </div>
                        </div>
                        {/* Background flare */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-100/40 rounded-full blur-[80px] -z-10 animate-pulse"></div>
                    </div>
                </div>

                {/* Experience Section */}
                <div className="bg-gradient-to-br from-white to-brand-50/30 p-10 md:p-16 rounded-[48px] shadow-soft border border-white text-center space-y-6 max-w-4xl mx-auto">
                    <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto text-brand mb-4">
                        <Info size={40} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 md:text-3xl">Sua Melhor Versão, Simplificada</h3>
                    <p className="text-lg text-slate-500 leading-relaxed font-medium max-w-2xl mx-auto">
                        Mais que um diário, o Mounjoy é o seu aliado de alta performance. Uma interface premium que remove as fricções do dia a dia, permitindo que você foque na sua transformação e bem-estar.
                    </p>
                </div>
            </section>

            {/* CTA Final */}
            <section className="bg-brand-900 text-white px-6 py-24 text-center relative overflow-hidden">
                {/* Background elements for desktop */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] -mr-48 -mt-48"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-400/10 rounded-full blur-[100px] -ml-48 -mb-48"></div>

                <div className="max-w-4xl mx-auto space-y-10 relative z-10">
                    <h2 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">Sua jornada com GLP-1 <br /><span className="text-brand-300">com o suporte que você merece.</span></h2>

                    <div className="flex flex-col items-center gap-4">
                        <Button onClick={onStart} className="w-full max-w-md bg-white text-brand-900 font-bold hover:bg-brand-50 border-none py-6 text-xl">
                            Criar meu perfil premium
                        </Button>
                        <div className="flex items-center gap-8 opacity-60">
                            <div className="flex items-center gap-2"><CheckCircle2 size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Lembretes Inteligentes</span></div>
                            <div className="flex items-center gap-2"><CheckCircle2 size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Metas Personalizadas</span></div>
                            <div className="flex items-center gap-2"><CheckCircle2 size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Privacidade Médica</span></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                <p>© 2026 Mounjoy. Feito para quem busca a melhor versão.</p>
                <p className="mt-2 text-[10px] px-8 leading-relaxed italic">
                    O Mounjoy é uma ferramenta de suporte. Consulte sempre seu médico antes de tomar decisões sobre sua medicação.
                </p>
            </footer>
        </div>
    );
};

export default LandingPage;
