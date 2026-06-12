import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabaseClient';
import { User, Save } from 'lucide-react';

const ProfileCompletion: React.FC = () => {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Check if name is already set in metadata
    const hasName = user?.user_metadata?.name || user?.user_metadata?.full_name;

    if (!user || hasName) {
        return null; // Don't show if user is not logged in or name exists
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                data: { name: name.trim() }
            });

            if (updateError) throw updateError;

            // Reload or force update context ideally, but a simple reload works to refresh user state
            window.location.reload();

        } catch (err: any) {
            console.error('Error updating profile:', err);
            setError('Erro ao salvar nome. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">

                <div className="bg-primary-dark p-6 text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
                        <User size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Olá! Bem-vindo(a)</h2>
                    <p className="text-primary-light text-sm mt-1">Para continuar, precisamos saber seu nome.</p>
                </div>

                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">
                                Como gostaria de ser chamado?
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full p-3 border border-secondary rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="Seu nome completo"
                                required
                                minLength={3}
                            />
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm bg-red-50 p-2 rounded text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white py-3 rounded-lg font-bold transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Salvando...' : (
                                <>
                                    <Save size={20} />
                                    Salvar e Continuar
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-4 text-center text-xs text-text-light">
                        Seus dados estão seguros conosco.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileCompletion;
