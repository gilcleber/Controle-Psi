import React, { useState } from 'react';
import { supabase } from '@/services/supabaseClient';
import { BrainCircuit, Loader2 } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setMessage('Verifique seu email para confirmar o cadastro!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro ao tentar autenticar.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F7F5] flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                        <BrainCircuit size={32} className="text-[#6A8164]" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">ControlePsi</h1>
                    <p className="text-gray-500 text-sm">Gestão Inteligente para Terapeutas</p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
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
                        className="w-full bg-[#6A8164] text-white py-3 rounded-lg font-medium hover:bg-[#586e53] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading && <Loader2 size={18} className="animate-spin" />}
                        {isSignUp ? 'Criar Conta' : 'Entrar'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-sm text-gray-500 hover:text-[#6A8164] transition-colors"
                    >
                        {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Crie uma agora'}
                    </button>
                </div>
            </div>
        </div>
    );
}
