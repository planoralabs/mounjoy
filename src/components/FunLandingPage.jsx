import React from 'react';
import { ArrowRight, Trophy, Users, Star, Smartphone, CheckCircle2, Zap, Heart } from 'lucide-react';
import { Button } from './ui/BaseComponents';
const scalerImg = '/scaler.png';
const waterImg = '/water.png';
const proteinImg = '/protein.png';
const penImg = '/pen.png';
const fiberImg = '/fiber.png';
const landingfunImg = '/landingfun.png';

const FunLandingPage = ({ onStart, onLogin, onToggleTheme }) => {
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

            {/* Hero Section - The "Fun" Vibe */}
            <section className="relative w-full overflow-hidden min-h-[600px] md:min-h-[850px]">
                {/* Content Container */}
                <div className="max-w-7xl mx-auto px-6 h-full flex flex-col md:flex-row items-center">
                    <div className="flex-1 space-y-8 text-center md:text-left z-20 pt-32 pb-20 md:pb-40">
                        <h1 className="text-5xl font-black text-[#093466] leading-[1.1] md:text-7xl">
                            Mounjoy: Sua jornada <br />
                            <span className="text-orange-500">GLP-1</span> nunca foi <br />
                            tão leve! 🎈
                        </h1>
                        <p className="text-xl text-slate-600 font-medium max-w-lg">
                            O suporte definitivo para usuários de Mounjaro, Ozempic e protocolos de emagrecimento. Gerencie doses, acompanhe evolução e veja sua transformação.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <Button 
                                onClick={onStart} 
                                className="bg-orange-500 hover:bg-orange-600 text-white font-black py-6 px-10 rounded-[30px] text-xl shadow-xl shadow-orange-200 border-none w-full sm:w-auto"
                            >
                                Começar grátis hoje!
                            </Button>
                        </div>
                    </div>
                    
                    {/* Spacer for desktop layout */}
                    <div className="flex-1 hidden md:block h-full"></div>
                </div>

                {/* Image Section - Absolute right/bottom and potentially bleeding */}
                <div className="absolute bottom-0 right-0 w-full md:w-3/5 h-full pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-orange-200/50 rounded-full blur-3xl -z-10 animate-pulse"></div>
                    <img 
                        src={landingfunImg} 
                        alt="Mounjoy New Fun Hero" 
                        className="w-[130%] min-w-[700px] md:min-w-[1200px] h-auto drop-shadow-2xl animate-popIn absolute bottom-0 right-0 z-10 origin-bottom-right transform translate-y-4 translate-x-4 md:translate-y-0 md:translate-x-0"
                    />
                </div>
            </section>

            {/* Wavy Feature Banner - Removing MT to align with Hero */}
            <section className="relative bg-[#2359ac] pt-20 pb-20">
                {/* Wave Decorative Header SVG */}
                <div className="absolute top-0 left-0 w-full overflow-hidden leading-none rotate-180 -mt-[1px] z-20">
                    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[calc(140%+1.3px)] h-[60px]" style={{ fill: '#fdf5eb' }}>
                        <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25"></path>
                        <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5V0Z" opacity=".5"></path>
                        <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"></path>
                    </svg>
                </div>

                <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 relative z-30">
                    <div className="bg-white p-10 rounded-[40px] shadow-2xl flex flex-col items-center text-center group hover:-translate-y-2 transition-transform h-fit">
                        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Zap className="text-orange-500" size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-4">Lente Mágica</h3>
                        <p className="text-slate-500 font-medium">Compare suas fotos de "antes e depois" com zoom automático. Sua mudança é real!</p>
                    </div>

                    <div className="bg-white p-10 rounded-[40px] shadow-2xl flex flex-col items-center text-center group hover:-translate-y-2 transition-transform translate-y-8 h-fit">
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Smartphone className="text-blue-500" size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-4">Controle Total</h3>
                        <p className="text-slate-500 font-medium">Nunca perca o dia da picada. Avisamos tudo sobre suas canetas e doses.</p>
                    </div>

                    <div className="bg-white p-10 rounded-[40px] shadow-2xl flex flex-col items-center text-center group hover:-translate-y-2 transition-transform h-fit">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Heart className="text-red-400" size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-4">Bio-Cuidados</h3>
                        <p className="text-slate-500 font-medium">Dicas de hidratação e proteínas para você se sentir bem todos os dias.</p>
                    </div>
                </div>
            </section>

            {/* Testimonial - Playful Bubble */}
            <section className="px-6 py-32 max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row items-center gap-10">
                    <div className="relative shrink-0">
                        <div className="w-24 h-24 rounded-full border-4 border-orange-400 overflow-hidden shadow-xl bg-orange-50 flex items-center justify-center">
                            <Users className="text-orange-300" size={48} />
                        </div>
                    </div>
                    <div className="relative bg-orange-400 p-8 rounded-[40px] rounded-tl-none shadow-2xl text-white">
                        <p className="text-xl font-bold leading-relaxed italic">
                            "Eu amei o mascote e a comunidade super animada! O Mounjoy fez com que o acompanhamento do meu tratamento parecesse um jogo divertido, não uma obrigação."
                        </p>
                        {/* Little triangle for bubble */}
                        <div className="absolute top-0 -left-4 w-4 h-4 bg-orange-400" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}></div>
                    </div>
                </div>
            </section>

            {/* Bottom CTA Section */}
            <section className="px-6 pb-20">
                <div className="max-w-6xl mx-auto bg-[#093466] rounded-[50px] p-10 md:p-20 flex flex-col md:flex-row items-center justify-between text-white relative overflow-hidden group">
                    <div className="flex-1 space-y-6 relative z-10">
                        <h2 className="text-4xl md:text-6xl font-black">Pronto para entrar no jogo?</h2>
                        <p className="text-xl opacity-80 font-medium">Baixe o Mounjoy agora e comece a se sentir incrível.</p>
                        <Button 
                            onClick={onStart}
                            className="bg-orange-400 hover:bg-orange-500 text-white font-black py-6 px-12 rounded-[30px] text-xl shadow-xl shadow-orange-950/20 w-full sm:w-auto mt-6"
                        >
                            Quero meu Mounjoy!
                        </Button>
                    </div>
                    <div className="mt-12 md:mt-0 flex items-center justify-center relative translate-y-10 group-hover:translate-y-0 transition-transform duration-700">
                        <img src="/mascotstrong.png" alt="Peeking Mascot" className="h-64 object-contain" />
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
            
            <style dangerouslySetInnerHTML={{ __html: `
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
            ` }} />
        </div>
    );
};

export default FunLandingPage;
