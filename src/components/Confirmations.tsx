import React, { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import { Patient } from '@/types';
import { Check, X, MessageCircle } from 'lucide-react';

interface SessionToConfirm {
    id: string;
    date: string;
    time: string;
    patient: Patient;
    status: 'pending' | 'confirmed' | 'cancelled';
}

const Confirmations: React.FC = () => {
    const [daysRange, setDaysRange] = useState(3);
    const [sessions, setSessions] = useState<SessionToConfirm[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSessions();
    }, [daysRange]);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const today = new Date();
            const futureDate = new Date();
            futureDate.setDate(today.getDate() + daysRange);

            const { data, error } = await supabase
                .from('sessions')
                .select('id, date, time, status, patient:patients(*)')
                .gte('date', today.toISOString())
                .lte('date', futureDate.toISOString())
                .order('date', { ascending: true });

            if (error) throw error;

            // Transform data to match interface (handling potential missing fields)
            const formatted: SessionToConfirm[] = (data || []).map((item: any) => {
                let sessionTime = item.time || '00:00';
                if (!item.time && item.date.includes('T')) {
                    const dateObj = new Date(item.date);
                    sessionTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                }

                return {
                    id: item.id,
                    date: item.date.split('T')[0],
                    time: sessionTime,
                    patient: item.patient,
                    status: item.status || 'pending'
                };
            });

            setSessions(formatted);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (id: string) => {
        // Logic to update status in DB (would need a status column in sessions table)
        // For now, we'll just alert
        alert(`Confirmar atendimento ${id} (Implementar atualização de status no banco)`);
    };

    return (
        <div className="p-8 h-full flex flex-col bg-[#f8f9fa] min-h-screen animate-fade-in">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Confirmações</h2>
                    <p className="text-gray-500 text-sm mt-1">Envie lembretes e confirmações de atendimentos para seus clientes</p>
                </div>
                <div className="flex gap-2">
                    {/* Fake Data buttons removed */}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Próximas atendimentos</h3>

                <p className="text-sm text-gray-500 mb-4">Deslize a barra abaixo para filtrar os clientes com atendimentos nos próximos dias</p>

                <div className="flex items-center gap-4 mb-2">
                    <span className="text-gray-400 text-xs">&lt;</span>
                    <input
                        type="range"
                        min="1"
                        max="30"
                        value={daysRange}
                        onChange={(e) => setDaysRange(Number(e.target.value))}
                        className="w-full h-2 bg-[#A8B5A6] rounded-lg appearance-none cursor-pointer accent-[#6A8164]"
                    />
                    <span className="text-gray-400 text-xs">&gt;</span>
                </div>
                <div className="text-center mb-8">
                    <span className="text-xs font-medium text-gray-600">Próximos: <span className="text-[#6A8164] font-bold">{daysRange} dias</span></span>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6A8164]"></div>
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="text-center py-12">
                        <h4 className="text-gray-600 font-medium mb-2">Não há atendimentos para confirmar</h4>
                        <p className="text-gray-400 text-sm">Todas as próximas atendimentos já foram confirmadas ou não existem agendamentos para os próximos dias.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sessions.map(session => (
                            <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[#A8B5A6] text-white flex items-center justify-center font-bold">
                                        {session.patient?.firstName?.[0]}{session.patient?.lastName?.[0]}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800">{session.patient?.firstName} {session.patient?.lastName}</h4>
                                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                                            <span>{session.date.split('-').reverse().join('/')}</span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                            <span>{session.time}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors" title="Confirmar Presença">
                                        <Check size={20} />
                                    </button>
                                    <button className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Cancelar Atendimento">
                                        <X size={20} />
                                    </button>
                                    <button className="p-2 text-[#6A8164] hover:bg-[#6A8164]/10 rounded-full transition-colors" title="Enviar Lembrete WhatsApp">
                                        <MessageCircle size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Confirmations;
