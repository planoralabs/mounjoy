import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Trophy, Users, Star, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/BaseComponents';

const mascotImg = '/mascot.png';
const mascotZenImg = '/mascotzen.png';
const mascotMirrorImg = '/mascotmirror.png';
const mascotResultsImg = '/mascotresults.png';

const FunLandingPage = ({ onStart, onLogin, onToggleTheme }) => {
    const [isLenteInView, setIsLenteInView] = useState(false);
    const lenteRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsLenteInView(true);
                } else {
                    setIsLenteInView(false);
                }
            },
            { threshold: 0.5 }
        );

        if (lenteRef.current) {
            observer.observe(lenteRef.current);
        }

        return () => {
            if (lenteRef.current) {
                observer.unobserve(lenteRef.current);
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-[#fdf5eb] overflow-x-hidden font-outfit selection:bg-orange-200">
            {/* Minimalist Text-Only Header */}
            <header className="px-6 py-8 flex justify-between items-center max-w-7xl mx-auto absolute top-0 left-0 right-0 z-50 bg-transparent">
                <div className="flex items-center gap-6">
                    <img src="/logomount.png" alt="Mounjoy Logo" className="h-10 w-auto object-contain" />
                    <nav className="hidden md:flex items-center gap-8">
                        <button className="text-slate-600 font-bold text-sm hover:text-orange-500 transition-colors uppercase tracking-widest text-[10px]">Funcionalidades</button>
                        <button className="text-slate-600 font-bold text-sm hover:text-orange-500 transition-colors uppercase tracking-widest text-[10px]">Preços</button>
                    </nav>
                </div>
                <div className="flex items-center gap-6">
                    <button
                        onClick={onToggleTheme}
                        className="text-orange-600 font-black text-[10px] uppercase tracking-widest hover:text-orange-700 transition-colors"
                    >
                        Estilo Bio-Tech
                    </button>
                    <button
                        onClick={onLogin}
                        className="text-slate-600 font-bold text-sm hover:text-orange-500 transition-colors hidden md:block uppercase tracking-widest text-[10px]"
                    >
                        Entrar
                    </button>
                    <button
                        onClick={onStart}
                        className="px-8 py-3 rounded-full bg-[#093466] text-white font-black text-xs shadow-xl hover:shadow-2xl transition-all active:scale-95 uppercase tracking-widest"
                    >
                        Começar
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative w-full overflow-hidden min-h-[600px] md:min-h-[850px]">
                <div className="max-w-7xl mx-auto px-6 h-full flex flex-col md:flex-row items-center">
                    <div className="flex-1 space-y-8 text-center md:text-left z-20 pt-32 pb-10 md:pb-40">
                        <h1 className="text-5xl font-black text-[#093466] leading-[1.1] md:text-7xl">
                            Sua jornada <br />
                            <span className="text-orange-500">GLP-1</span> nunca foi <br />
                            tão leve! 🎈
                        </h1>
                        <p className="text-xl text-slate-600 font-medium max-w-lg mx-auto md:mx-0">
                            O aliado perfeito para sua jornada com Mounjaro, Ozempic ou qualquer outro protocolo de emagrecimento. <br className="hidden md:block" /> Organize suas doses, acompanhe seu progresso e tenha tudo o que precisa para o sucesso do seu tratamento.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
                            <Button
                                onClick={onStart}
                                className="bg-orange-500 hover:bg-orange-600 text-white font-black py-6 px-10 rounded-[30px] text-xl shadow-xl shadow-orange-200 border-none w-full sm:w-auto"
                            >
                                Começar grátis hoje!
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="relative md:absolute bottom-0 right-0 w-full md:w-3/5 h-[400px] md:h-full pointer-events-none flex items-end justify-center md:justify-end overflow-hidden">
                    <div className="absolute top-[20%] right-[-10%] md:right-[5%] w-[350px] h-[350px] md:w-[680px] md:h-[680px] bg-gradient-to-br from-[#f69d5c] to-[#f47a20] rounded-full shadow-2xl overflow-hidden z-0">
                        <svg className="absolute bottom-0 left-0 w-full h-[60%] opacity-40" viewBox="0 0 400 200" preserveAspectRatio="none">
                            <path d="M-50,200 C100,180 300,150 450,180 L450,200 L-50,200 Z" fill="#eb4d00" />
                            <path d="M-50,190 C100,170 300,140 450,170" fill="none" stroke="white" strokeWidth="2" strokeDasharray="10 10" />
                            <path d="M-50,170 C100,150 300,120 450,150" fill="none" stroke="white" strokeWidth="2" strokeDasharray="10 10" />
                        </svg>

                        <div className="absolute top-[30%] left-[10%] w-20 h-8 bg-white/20 rounded-full blur-md"></div>
                        <div className="absolute top-[45%] right-[15%] w-24 h-10 bg-white/20 rounded-full blur-md"></div>

                        <div className="absolute bottom-[20%] left-[20%] z-10">
                            <div className="w-10 h-10 bg-[#2359ac] rounded-full"></div>
                            <div className="w-1.5 h-6 bg-[#2359ac] mx-auto -mt-1 rounded-sm opacity-50"></div>
                        </div>
                        <div className="absolute bottom-[35%] right-[25%] z-10 opacity-60 scale-75">
                            <div className="w-10 h-10 bg-[#2359ac] rounded-full"></div>
                            <div className="w-1.5 h-6 bg-[#2359ac] mx-auto -mt-1 rounded-sm opacity-50"></div>
                        </div>
                    </div>

                    <div className="relative z-20 w-[140%] sm:w-[120%] md:w-[90%] max-w-[800px] mb-[-5%] md:mb-[-2%] mr-[-10%] md:mr-[-10%] group">
                        <div
                            className="absolute -top-14 left-1/2 -translate-x-1/2 md:left-[25%] md:translate-x-0 z-30 opacity-0 animate-bubbleIn block"
                            style={{ animationDelay: '1.2s' }}
                        >
                            <div className="bg-white px-5 py-3 md:px-6 md:py-4 rounded-[20px] md:rounded-[25px] shadow-2xl border-2 border-orange-50 flex items-center justify-center relative">
                                <span className="text-orange-600 font-black text-lg md:text-xl whitespace-nowrap">Eu te acompanho!</span>
                                <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 md:left-[55%] w-4 h-4 md:w-5 md:h-5 bg-white border-b-2 border-l-2 border-orange-50 rotate-45"></div>
                            </div>
                        </div>

                        <div className="absolute bottom-[10%] left-1/4 right-3 w-[60%] h-8 bg-black/10 rounded-full blur-xl group-hover:scale-110 transition-transform duration-1000"></div>

                        <img
                            src="/scalade.png"
                            alt="Mounjoy Scalade"
                            className="w-full h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-popIn origin-bottom-right"
                        />
                    </div>
                </div>
            </section>

            {/* Features Section & Protocol Ticker - Fluid Shared Wrapper (Now Orange) */}
            <div className="bg-orange-500">
                {/* Blue Box Section with Orange Under-Layer */}
                <section className="bg-orange-500 relative z-20">
                    {/* Top Transition (Beige from Hero) */}
                    <div className="bg-[#fdf5eb] h-32 md:h-48 w-full"></div>
                    
                    {/* Blue Box Container (Overlapping the Transition) */}
                    <div className="-mt-32 md:-mt-48 px-0">
                        <div className="w-full bg-[#093466] rounded-[60px] md:rounded-[100px] p-12 md:p-24 relative overflow-hidden z-20">
                            {/* Interior Decoration */}
                            <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

                            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
                                {/* Box 1: Controle Total */}
                                <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-2xl flex flex-col items-center text-center group hover:-translate-y-2 transition-transform h-fit">
                                    <h3 className="text-2xl font-black text-slate-800 mb-4">Controle Total</h3>
                                    <p className="text-slate-500 font-medium mb-8">Nunca perca o dia da picada. Avisamos tudo sobre suas canetas e doses.</p>
                                    <div className="w-full bg-slate-50/50 rounded-[30px] shadow-inner min-h-[240px] md:min-h-[300px] relative flex items-center justify-center overflow-hidden">
                                        <img src={mascotImg} alt="Mounjoy Mascot" className="w-44 h-44 md:w-52 md:h-52 object-contain group-hover:scale-110 transition-transform duration-500" />
                                    </div>
                                </div>

                                {/* Box 2: Veja sua Evolução */}
                                <div
                                    ref={lenteRef}
                                    className="bg-white p-8 md:p-10 rounded-[40px] shadow-2xl flex flex-col items-center text-center group hover:-translate-y-2 transition-transform md:translate-y-8 h-fit cursor-pointer outline-none"
                                    tabIndex={0}
                                >
                                    <div className="w-full bg-slate-50/50 rounded-[30px] shadow-inner min-h-[240px] md:min-h-[300px] mb-8 relative flex items-center justify-center">
                                        {/* Card 1: Mirror */}
                                        <div className={`absolute w-36 h-36 md:w-44 md:h-44 bg-white border-2 border-dashed border-slate-300 rounded-[24px] p-2 shadow-xl transition-all duration-700 ease-in-out
                                            ${isLenteInView ? 'rotate-[5deg] translate-x-4 z-10' : 'rotate-0 translate-x-0 z-10 opacity-0'}
                                            group-hover:rotate-[18deg] group-hover:translate-x-20 group-hover:z-10
                                            group-active:rotate-[15deg] group-active:translate-x-16`}>
                                            <img src={mascotMirrorImg} alt="Mascot Mirror" className="w-full h-full object-contain rounded-[18px]" />
                                        </div>

                                        {/* Card 2: Results */}
                                        <div className={`absolute w-36 h-36 md:w-44 md:h-44 bg-white border-2 border-dashed border-slate-300 rounded-[24px] p-2 shadow-xl transition-all duration-700 ease-in-out
                                            ${isLenteInView ? 'rotate-[-2deg] -translate-x-4 z-20 opacity-100' : 'rotate-0 translate-x-0 z-20 opacity-0'}
                                            group-hover:rotate-[-10deg] group-hover:-translate-x-20 group-hover:z-20
                                            group-active:rotate-[-8deg] group-active:-translate-x-16`}>
                                            <img src={mascotResultsImg} alt="Mascot Results" className="w-full h-full object-contain rounded-[18px]" />
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-800 mb-4">Veja sua Evolução</h3>
                                    <p className="text-slate-500 font-medium">Compare seu "antes e depois" e compartilhe seu progresso!</p>
                                </div>

                                {/* Box 3: Mantenha-se Saudável */}
                                <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-2xl flex flex-col items-center text-center group hover:-translate-y-2 transition-transform h-fit">
                                    <div className="w-full bg-slate-50/50 rounded-[30px] shadow-inner min-h-[240px] md:min-h-[300px] mb-8 relative flex items-center justify-center overflow-hidden">
                                        <img src={mascotZenImg} alt="Mascot Zen" className="w-44 h-44 md:w-52 md:h-52 object-contain group-hover:scale-110 transition-transform duration-500" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-800 mb-4">Mantenha-se Saudável</h3>
                                    <p className="text-slate-500 font-medium">Dicas de hidratação e proteínas para você se sentir bem todos os dias.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Expansion Section - Brand Ticker (Vibrant Orange) */}
                <section className="px-0 pb-24 relative z-10 mt-[-40px] md:mt-[-80px] bg-[#fdf5eb]">
                    {/* Top Orange Layer (for Blue Box overlap) */}
                    <div className="bg-orange-500 h-48 w-full absolute top-0 left-0 z-0"></div>
                    
                    <div className="w-full bg-orange-500 rounded-b-[60px] md:rounded-b-[100px] pt-32 md:pt-48 pb-20 relative z-10 overflow-hidden shadow-2xl">
                        <div className="max-w-7xl mx-auto mb-12 text-center">
                            <p className="text-white/70 font-bold uppercase tracking-[0.2em] text-[10px] mb-4">Compatibilidade total</p>
                            <h3 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                                Funciona com todos os protocolos
                            </h3>
                        </div>

                        <div className="relative flex overflow-hidden group">
                            <div className="flex animate-ticker whitespace-nowrap gap-12 py-4">
                                {[
                                    'Mounjaro', 'Ozempic', 'Zepbound', 'Wegovy', 
                                    'Saxenda', 'Victoza', 'Trulicity', 'Rybelsus'
                                ].map((brand, i) => (
                                    <div key={i} className="flex items-center gap-4 bg-white/10 px-10 py-6 rounded-[30px] border border-white/20 transition-all hover:bg-white/20 hover:-translate-y-1">
                                        <span className="text-3xl font-black text-white italic tracking-tighter">
                                            {brand}
                                        </span>
                                    </div>
                                ))}
                                {/* Repeat for seamless loop */}
                                {[
                                    'Mounjaro', 'Ozempic', 'Zepbound', 'Wegovy', 
                                    'Saxenda', 'Victoza', 'Trulicity', 'Rybelsus'
                                ].map((brand, i) => (
                                    <div key={`repeat-${i}`} className="flex items-center gap-4 bg-white/10 px-10 py-6 rounded-[30px] border border-white/20 transition-all hover:bg-white/20 hover:-translate-y-1">
                                        <span className="text-3xl font-black text-white italic tracking-tighter">
                                            {brand}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Gradient Masks (Orange to Transparent) */}
                            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-orange-500 to-transparent z-10 pointer-events-none"></div>
                            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-orange-500 to-transparent z-10 pointer-events-none"></div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Testimonial */}
            <section className="px-6 py-32 max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row items-center gap-10">
                    <div className="relative shrink-0">
                        <div className="w-24 h-24 rounded-full border-4 border-orange-400 overflow-hidden shadow-xl bg-orange-50 flex items-center justify-center">
                            <Users className="text-orange-300" size={48} />
                        </div>
                    </div>
                    <div className="relative bg-orange-400 p-8 rounded-[40px] rounded-tl-none md:rounded-tl-none md:rounded-tr-[40px] shadow-2xl text-white">
                        <p className="text-xl font-bold leading-relaxed italic">
                            "com o Mounjoy sinto que tenho o controle total da minha jornada. O app transformou o acompanhamento de meu tratamento em algo leve e até prazeroso de fazer todos os dias."
                        </p>
                        <div className="hidden md:block absolute top-0 -left-4 w-4 h-4 bg-orange-400" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}></div>
                        <div className="md:hidden absolute -top-4 left-1/2 -translate-x-1/2 w-4 h-4 bg-orange-400" style={{ clipPath: 'polygon(50% 0, 0 100%, 100% 100%)' }}></div>
                    </div>
                </div>
            </section>

            {/* Bottom CTA Section */}
            <section className="px-6 pb-20">
                <div className="max-w-6xl mx-auto bg-[#093466] rounded-[50px] p-10 md:p-20 flex flex-col md:flex-row items-center justify-between text-white relative overflow-hidden group">
                    <div className="flex-1 space-y-6 relative z-10">
                        <h2 className="text-4xl md:text-6xl font-black">Pronto para entrar nessa jornada?</h2>
                        <p className="text-xl opacity-80 font-medium">Baixe o Mounjoy agora e comece a se sentir incrível.</p>
                        <Button
                            onClick={onStart}
                            className="bg-orange-400 hover:bg-orange-500 text-white font-black py-6 px-12 rounded-[30px] text-xl shadow-xl shadow-orange-950/20 w-full sm:w-auto mt-6"
                        >
                            Quero meu Mounjoy!
                        </Button>
                    </div>
                    <div className="mt-12 md:mt-0 flex items-center justify-center relative translate-y-10 group-hover:translate-y-0 transition-transform duration-700">
                        <img src="/scalade.png" alt="Mounjoy Mascot" className="h-64 object-contain" />
                    </div>
                </div>
            </section>

            {/* Playful Footer */}
            <footer className="px-6 py-12 text-center">
                <div className="flex justify-center mb-8">
                    <img src="/logomount.png" alt="Mounjoy Logo" className="h-10 opacity-30 grayscale" />
                </div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                    © 2026 Mounjoy. Feito com ❤️ e muita diversão.
                </p>
            </footer>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
                .animate-float {
                    animation: float 4s ease-in-out infinite;
                }
                @keyframes popIn {
                    0% { transform: scale(0.9); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-popIn {
                    animation: popIn 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes bubbleIn {
                    0% { transform: scale(0) translateY(20px); opacity: 0; }
                    70% { transform: scale(1.1) translateY(-5px); opacity: 1; }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
                .animate-bubbleIn {
                    animation: bubbleIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes ticker {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-ticker {
                    display: flex;
                    width: fit-content;
                    animation: ticker 30s linear infinite;
                }
                .animate-ticker:hover {
                    animation-play-state: paused;
                }
            ` }} />
        </div>
    );
};

export default FunLandingPage;
