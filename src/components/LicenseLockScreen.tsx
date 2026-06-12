import React from 'react';
import { Lock, LogOut, Copy, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const LicenseLockScreen: React.FC = () => {
    const { user, signOut, license } = useAuth();
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        if (user?.id) {
            navigator.clipboard.writeText(user.id);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const getStatusMessage = () => {
        if (license?.status === 'blocked') return 'Sua conta foi bloqueada.';
        if (license?.expiration_date && new Date(license.expiration_date) < new Date()) return 'Sua licença expirou.';
        return 'Aguardando liberação do administrador.';
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock size={40} className="text-red-500" />
                </div>

                <h1 className="text-2xl font-bold text-gray-800 mb-2">Acesso Restrito</h1>
                <p className="text-gray-600 mb-8">
                    {getStatusMessage()}
                    <br />
                    Para liberar seu acesso, envie o código abaixo para o administrador.
                </p>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8 relative group">
                    <p className="font-mono text-sm text-gray-800 break-all">{user?.id}</p>
                    <button
                        onClick={handleCopy}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-[#6A8164] transition-colors"
                        title="Copiar ID"
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                </div>

                <button
                    onClick={signOut}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                    <LogOut size={18} />
                    Sair da conta
                </button>
            </div>
        </div>
    );
};

export default LicenseLockScreen;
