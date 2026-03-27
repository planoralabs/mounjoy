import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from './ui/BaseComponents';
import { Mail, Lock, Chrome, ArrowRight, UserPlus, LogIn, ChevronLeft } from 'lucide-react';

const Login = ({ onBack }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, signup, loginWithGoogle } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await signup(email, password);
            }
        } catch (err) {
            setError('Falha ao autenticar. Verifique seus dados.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            await loginWithGoogle();
        } catch (err) {
            setError('Falha ao entrar com Google.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 pb-12 font-sans select-none overflow-hidden relative">
            {/* Background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-indigo-100 rounded-full blur-[80px] opacity-60"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-brand-100 rounded-full blur-[100px] opacity-40"></div>

            {/* Back Button */}
            <button
                onClick={onBack}
                className="absolute top-8 left-8 p-3 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-slate-600 hover:shadow-md transition-all active:scale-95 z-50"
                title="Voltar"
            >
                <ChevronLeft size={24} />
            </button>

            <div className="w-full max-w-md z-10">
                <div className="flex flex-col items-center mb-10">
                    <img src="/logomount.png" alt="Mounjoy Logo" className="h-16 w-auto object-contain mb-8" />
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">Sua jornada começa aqui</p>
                </div>

                <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[40px] shadow-2xl shadow-slate-200/50 border border-white flex flex-col gap-6">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">
                            {isLogin ? 'Bem-vindo de volta' : 'Criar nova conta'}
                        </h2>
                        <p className="text-sm text-slate-500 font-medium">
                            {isLogin ? 'Sentimos sua falta! Entre para continuar.' : 'Junte-se a nós para transformar sua saúde.'}
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold border border-red-100 animate-in fade-in slide-in-from-top-2 duration-300">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                <Mail size={18} />
                            </div>
                            <input
                                type="email"
                                placeholder="Seu e-mail"
                                className="w-full h-14 pl-12 pr-4 bg-slate-50/50 border-none rounded-2xl text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                placeholder="Sua senha"
                                className="w-full h-14 pl-12 pr-4 bg-slate-50/50 border-none rounded-2xl text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 rounded-2xl bg-indigo-500 hover:bg-indigo-600 font-black text-white shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 group mt-2"
                        >
                            {loading ? 'Processando...' : isLogin ? 'Entrar Agora' : 'Criar Conta'}
                            {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                        </Button>
                    </form>

                    <div className="flex items-center gap-4 py-2">
                        <div className="flex-1 h-[1px] bg-slate-100"></div>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Ou continue com</span>
                        <div className="flex-1 h-[1px] bg-slate-100"></div>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full h-14 rounded-2xl bg-white border border-slate-100 hover:bg-slate-50 font-bold text-slate-600 shadow-sm flex items-center justify-center gap-3 transition-colors active:scale-95"
                    >
                        <Chrome size={20} className="text-slate-500" />
                        Entrar com Google
                    </button>
                </div>

                <div className="mt-10 flex flex-col items-center gap-2">
                    <p className="text-sm font-medium text-slate-400">
                        {isLogin ? 'Ainda não tem conta?' : 'Já possui conta?'}
                    </p>
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="flex items-center gap-2 px-6 py-2 rounded-full border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 text-slate-600 font-bold text-sm transition-all active:scale-95"
                    >
                        {isLogin ? (
                            <>
                                <UserPlus size={16} className="text-indigo-500" />
                                Criar conta gratuita
                            </>
                        ) : (
                            <>
                                <LogIn size={16} className="text-indigo-500" />
                                Fazer login
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
