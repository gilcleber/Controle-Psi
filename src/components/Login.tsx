import React, { useState } from 'react';
import { supabase } from '@/services/supabaseClient';
import { BrainCircuit, Loader2, ArrowLeft } from 'lucide-react';
import TermsOfUse from './TermsOfUse';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [showTerms, setShowTerms] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin,
                    }
                });
                if (error) throw error;

                if (data.session) {
                    // Login automático (Confirmação desativada)
                    // O AuthContext vai redirecionar automaticamente
                } else {
                    setMessage('Verifique seu email para confirmar o cadastro!');
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err: any) {
            console.error(err);
            let errorMessage = 'Ocorreu um erro ao tentar autenticar.';
            if (err.message.includes('Invalid login credentials')) {
                errorMessage = 'Email ou senha incorretos.';
            } else if (err.message.includes('Email not confirmed')) {
                errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.';
            } else if (err.message.includes('User already registered')) {
                errorMessage = 'Este email já está cadastrado.';
            } else if (err.message.includes('Password should be at least')) {
                errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin,
            });
            if (error) throw error;
            setMessage('Email de redefinição enviado! Verifique sua caixa de entrada (e spam).');
            setIsForgotPassword(false);
        } catch (err: any) {
            console.error(err);
            setError('Erro ao solicitar redefinição. Verifique se o email está correto.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                }
            });
            if (error) throw error;
        } catch (err: any) {
            console.error(err);
            setError('Erro ao conectar com Google.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F7F5] flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-secondary-light rounded-full flex items-center justify-center mb-4">
                        <BrainCircuit size={32} className="text-primary-dark" />
                    </div>
                    <h1 className="text-2xl font-bold text-text-main">ControlePsi</h1>
                    <p className="text-text-light text-sm">Gestão Inteligente para Terapeutas</p>
                </div>

                {isForgotPassword ? (
                    <form onSubmit={handleResetPassword} className="space-y-4 animate-fade-in">
                        <div className="text-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-700">Recuperar Senha</h2>
                            <p className="text-xs text-gray-500">Digite seu email para receber o link de redefinição.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                required
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent outline-none transition-all"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#6A8164] text-white py-3 rounded-lg font-medium hover:bg-[#586e53] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading && <Loader2 size={18} className="animate-spin" />}
                            Enviar Link
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setIsForgotPassword(false);
                                setError(null);
                                setMessage(null);
                            }}
                            className="w-full text-gray-500 py-2 text-sm hover:text-gray-700 flex items-center justify-center gap-1"
                        >
                            <ArrowLeft size={14} />
                            Voltar para o Login
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleAuth} className="space-y-4 animate-fade-in">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                required
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent outline-none transition-all"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                            <input
                                type="password"
                                required
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent outline-none transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            {!isSignUp && (
                                <div className="flex justify-end mt-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsForgotPassword(true);
                                            setError(null);
                                            setMessage(null);
                                        }}
                                        className="text-xs text-[#6A8164] hover:underline"
                                    >
                                        Esqueci minha senha
                                    </button>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100">
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary-dark text-white py-3 rounded-lg font-medium hover:bg-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading && <Loader2 size={18} className="animate-spin" />}
                            {isSignUp ? 'Criar Conta' : 'Entrar'}
                        </button>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">Ou continue com</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google
                        </button>

                        <div className="mt-6 text-center space-y-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSignUp(!isSignUp);
                                    setError(null);
                                    setMessage(null);
                                }}
                                className="text-sm text-text-light hover:text-primary-dark transition-colors"
                            >
                                {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Crie uma agora'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowTerms(true)}
                                className="block w-full text-xs text-secondary underline hover:text-primary transition-colors"
                            >
                                Termos de Uso e Privacidade
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <TermsOfUse isOpen={showTerms} onClose={() => setShowTerms(false)} />
        </div>
    );
}
