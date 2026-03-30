import React from 'react';

/**
 * 🛡️ Security Guard: Error Boundary
 * OWASP Pillar 05: Previne que falhas no código mostrem dados técnicos (stack traces) 
 * ou deixem o usuário com uma tela "morta".
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Você poderia enviar este log para um Sentry ou similar (OWASP Pillar 09)
        console.error("Mounjoy Error caught:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center font-sans">
                    <img src="/logomount.png" alt="Mounjoy" className="h-12 w-auto mb-8 opacity-40 grayscale" />
                    <h2 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Opa! Algo deu errado.</h2>
                    <p className="text-slate-500 mb-8 max-w-sm font-medium">
                        Ocorreu um erro inesperado no aplicativo. Por segurança, reiniciamos sua sessão.
                    </p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-10 py-4 bg-brand-600 text-white rounded-full font-black shadow-lg shadow-brand-100 active:scale-95 transition-all"
                    >
                        Recarregar Mounjoy
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
