import React, { useEffect, useState } from 'react';
import { supabase } from '@/services/supabaseClient';
import { UserLicense } from '@/types';
import { Check, X, Calendar, Search, Shield, Loader2 } from 'lucide-react';

const AdminPanel: React.FC = () => {
    const [licenses, setLicenses] = useState<UserLicense[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLicenses();
    }, []);

    const fetchLicenses = async () => {
        try {
            const { data, error } = await supabase
                .from('user_licenses')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLicenses(data || []);
        } catch (error) {
            console.error('Error fetching licenses:', error);
            alert('Erro ao carregar licenças. Verifique se você é administrador.');
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (userId: string, status: 'active' | 'blocked' | 'pending') => {
        try {
            const { error } = await supabase
                .from('user_licenses')
                .update({ status })
                .eq('user_id', userId);

            if (error) throw error;
            fetchLicenses();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Erro ao atualizar status.');
        }
    };

    const updateExpiration = async (userId: string, date: string) => {
        try {
            const { error } = await supabase
                .from('user_licenses')
                .update({ expiration_date: date })
                .eq('user_id', userId);

            if (error) throw error;
            fetchLicenses();
        } catch (error) {
            console.error('Error updating expiration:', error);
            alert('Erro ao atualizar validade.');
        }
    };

    const filteredLicenses = licenses.filter(l =>
        l.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.user_id.includes(searchTerm)
    );

    return (
        <div className="p-8 bg-[#f8f9fa] min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
                            <Shield className="text-primary-dark" />
                            Administração de Licenças
                        </h1>
                        <p className="text-text-light mt-1">Gerencie o acesso dos usuários ao sistema</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-secondary-light overflow-hidden">
                    <div className="p-4 border-b border-secondary-light bg-background flex gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por email ou ID..."
                                className="w-full pl-10 pr-4 py-2 border border-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Usuário / Email</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Validade</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center">
                                            <Loader2 className="animate-spin mx-auto text-primary" />
                                        </td>
                                    </tr>
                                ) : filteredLicenses.map(license => (
                                    <tr key={license.user_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-800">{license.email}</span>
                                                <span className="text-xs text-gray-400 font-mono">{license.user_id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${license.status === 'active'
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : license.status === 'blocked'
                                                    ? 'bg-red-50 text-red-700 border-red-200'
                                                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                }`}>
                                                {license.status === 'active' ? 'Ativo' : license.status === 'blocked' ? 'Bloqueado' : 'Pendente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-gray-400" />
                                                <input
                                                    type="date"
                                                    className="text-sm border-none bg-transparent focus:ring-0 p-0 text-gray-600 cursor-pointer hover:text-gray-900"
                                                    value={license.expiration_date ? new Date(license.expiration_date).toISOString().split('T')[0] : ''}
                                                    onChange={(e) => updateExpiration(license.user_id, e.target.value)}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        alert(`Detalhes do Usuário:\n\nEmail: ${license.email}\nID: ${license.user_id}\nStatus: ${license.status}\n\n(Para ver o Nome, é necessário configuração adicional no banco de dados)`);
                                                    }}
                                                    className="p-2 text-primary hover:bg-secondary-light rounded-lg transition-colors"
                                                    title="Ver Detalhes"
                                                >
                                                    <div className="w-5 h-5 flex items-center justify-center">
                                                        👁️
                                                    </div>
                                                </button>
                                                {license.status !== 'active' && (
                                                    <button
                                                        onClick={() => updateStatus(license.user_id, 'active')}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Aprovar / Ativar"
                                                    >
                                                        <Check size={18} />
                                                    </button>
                                                )}
                                                {license.status !== 'blocked' && (
                                                    <button
                                                        onClick={() => updateStatus(license.user_id, 'blocked')}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Bloquear"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default AdminPanel;
