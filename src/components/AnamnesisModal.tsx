import React, { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import { Loader2, Link as LinkIcon, CheckCircle, FileText, Copy } from 'lucide-react';

interface AnamnesisModalProps {
    patientId: string;
    patientName: string;
    onClose: () => void;
}

export default function AnamnesisModal({ patientId, patientName, onClose }: AnamnesisModalProps) {
    const [loading, setLoading] = useState(true);
    const [anamnesisData, setAnamnesisData] = useState<any>(null);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadAnamnesis();
    }, [patientId]);

    const loadAnamnesis = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('anamnesis_forms')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                setAnamnesisData(data);
            }
        } catch (error) {
            console.error('Erro ao buscar anamnese:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateLink = async () => {
        setGenerating(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const { data, error } = await supabase
                .from('anamnesis_forms')
                .insert([{
                    patient_id: patientId,
                    therapist_id: user.id,
                    status: 'pending'
                }])
                .select()
                .single();

            if (error) throw error;
            setAnamnesisData(data);
        } catch (error) {
            console.error('Erro ao gerar anamnese:', error);
            alert('Erro ao gerar o link da ficha de anamnese.');
        } finally {
            setGenerating(false);
        }
    };

    const copyLink = () => {
        if (!anamnesisData) return;
        const link = `${window.location.origin}/anamnese?id=${anamnesisData.id}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-3xl shadow-2xl h-[85vh] flex flex-col animate-fade-in">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Ficha de Anamnese</h3>
                        <p className="text-sm text-gray-500">Cliente: {patientName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="animate-spin text-[#6A8164]" size={32} />
                        </div>
                    ) : !anamnesisData ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6">
                            <FileText size={64} className="text-gray-300 mb-4" />
                            <h4 className="text-lg font-bold text-gray-800 mb-2">Nenhuma Ficha de Anamnese</h4>
                            <p className="text-gray-500 mb-6 max-w-md">
                                Este cliente ainda não possui uma ficha de anamnese. Clique no botão abaixo para gerar um link único e enviá-lo ao cliente pelo WhatsApp.
                            </p>
                            <button
                                onClick={generateLink}
                                disabled={generating}
                                className="bg-[#6A8164] hover:bg-[#586e53] text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-sm transition-all disabled:opacity-70"
                            >
                                {generating ? <Loader2 size={18} className="animate-spin" /> : <LinkIcon size={18} />}
                                Gerar Link para Anamnese
                            </button>
                        </div>
                    ) : anamnesisData.status === 'pending' ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                <LinkIcon size={32} className="text-blue-500" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-800 mb-2">Aguardando Preenchimento</h4>
                            <p className="text-gray-500 mb-6 max-w-md">
                                O link já foi gerado. Copie o link abaixo e envie para o cliente. Assim que ele preencher, as respostas aparecerão aqui automaticamente.
                            </p>
                            
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 w-full max-w-md flex items-center gap-3">
                                <div className="truncate flex-1 text-sm text-gray-600 text-left font-mono">
                                    {window.location.origin}/anamnese?id={anamnesisData.id}
                                </div>
                                <button
                                    onClick={copyLink}
                                    className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
                                    title="Copiar Link"
                                >
                                    {copied ? <CheckCircle size={18} className="text-green-500" /> : <Copy size={18} />}
                                </button>
                            </div>
                            {copied && <span className="text-green-600 text-sm mt-2 font-medium">Link copiado!</span>}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-green-50 text-green-800 p-4 rounded-lg flex items-center gap-3 border border-green-100 mb-6">
                                <CheckCircle size={24} className="text-green-600 shrink-0" />
                                <div>
                                    <h4 className="font-bold">Ficha Preenchida</h4>
                                    <p className="text-sm text-green-700">Preenchido em: {new Date(anamnesisData.completed_at).toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    <h5 className="font-bold text-gray-800 text-sm mb-2">1. Motivo da Consulta (Queixa Principal)</h5>
                                    <p className="text-gray-700 whitespace-pre-wrap">{anamnesisData.main_complaint || 'Não informado'}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    <h5 className="font-bold text-gray-800 text-sm mb-2">2. Histórico Médico e Psicológico</h5>
                                    <p className="text-gray-700 whitespace-pre-wrap">{anamnesisData.medical_history || 'Não informado'}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    <h5 className="font-bold text-gray-800 text-sm mb-2">3. Histórico Familiar</h5>
                                    <p className="text-gray-700 whitespace-pre-wrap">{anamnesisData.family_history || 'Não informado'}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    <h5 className="font-bold text-gray-800 text-sm mb-2">4. Medicação Atual</h5>
                                    <p className="text-gray-700 whitespace-pre-wrap">{anamnesisData.current_medication || 'Não informado'}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    <h5 className="font-bold text-gray-800 text-sm mb-2">5. Qualidade do Sono</h5>
                                    <p className="text-gray-700 whitespace-pre-wrap">{anamnesisData.sleep_quality || 'Não informado'}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    <h5 className="font-bold text-gray-800 text-sm mb-2">6. Rotina e Hábitos</h5>
                                    <p className="text-gray-700 whitespace-pre-wrap">{anamnesisData.routine || 'Não informado'}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    <h5 className="font-bold text-gray-800 text-sm mb-2">7. Expectativas com a Terapia</h5>
                                    <p className="text-gray-700 whitespace-pre-wrap">{anamnesisData.expectations || 'Não informado'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end bg-gray-50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
