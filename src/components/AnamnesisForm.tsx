import React, { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import { BrainCircuit, CheckCircle2, Loader2 } from 'lucide-react';

export default function AnamnesisForm() {
    // Quando configurarmos o React Router, pegaremos o formId da URL
    const params = new URLSearchParams(window.location.search);
    const formId = params.get('id');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        main_complaint: '',
        medical_history: '',
        family_history: '',
        current_medication: '',
        sleep_quality: '',
        routine: '',
        expectations: ''
    });

    useEffect(() => {
        if (formId) {
            checkFormValidity();
        } else {
            setError('Link inválido. Por favor, solicite um novo link ao seu terapeuta.');
            setLoading(false);
        }
    }, [formId]);

    const checkFormValidity = async () => {
        try {
            const { data, error } = await supabase
                .from('anamnesis_forms')
                .select('id, status')
                .eq('id', formId)
                .single();

            if (error || !data) {
                throw new Error('Ficha não encontrada ou link inválido.');
            }

            if (data.status === 'completed') {
                throw new Error('Esta ficha de anamnese já foi preenchida.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const { error } = await supabase
                .from('anamnesis_forms')
                .update({
                    ...formData,
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .eq('id', formId);

            if (error) throw error;
            setSuccess(true);
        } catch (err: any) {
            console.error('Erro ao salvar anamnese:', err);
            setError('Ocorreu um erro ao enviar suas respostas. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F5F7F5] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#6A8164]" size={48} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#F5F7F5] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center border border-gray-100">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-red-500 text-2xl font-bold">!</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Acesso Indisponível</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-[#F5F7F5] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center border border-gray-100">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={32} className="text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Ficha Enviada!</h2>
                    <p className="text-gray-600 mb-6">
                        Suas respostas foram salvas com sucesso e já estão disponíveis no prontuário do seu terapeuta.
                    </p>
                    <p className="text-sm text-gray-400">Você pode fechar esta aba com segurança.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F7F5] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                <div className="bg-[#6A8164] px-8 py-10 text-center text-white">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <BrainCircuit size={32} className="text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Ficha de Anamnese</h1>
                    <p className="text-green-100 max-w-xl mx-auto">
                        Por favor, responda o questionário abaixo com a maior quantidade de detalhes possível.
                        Estas informações são confidenciais e ajudarão o seu terapeuta a compreender melhor o seu caso.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">1. Motivo da Consulta (Queixa Principal)</label>
                        <p className="text-xs text-gray-500 mb-3">O que te trouxe à terapia neste momento? Como você tem se sentido recentemente?</p>
                        <textarea
                            required
                            rows={4}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent transition-all"
                            value={formData.main_complaint}
                            onChange={(e) => setFormData({ ...formData, main_complaint: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">2. Histórico Médico e Psicológico</label>
                        <p className="text-xs text-gray-500 mb-3">Já fez terapia antes? Possui algum diagnóstico (ansiedade, depressão, TDAH, etc)? Já fez ou faz algum tratamento médico?</p>
                        <textarea
                            required
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent transition-all"
                            value={formData.medical_history}
                            onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">3. Histórico Familiar</label>
                        <p className="text-xs text-gray-500 mb-3">Como é a sua relação com sua família? Existem casos de transtornos mentais na família?</p>
                        <textarea
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent transition-all"
                            value={formData.family_history}
                            onChange={(e) => setFormData({ ...formData, family_history: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">4. Medicação Atual</label>
                            <p className="text-xs text-gray-500 mb-3">Toma algum remédio? Qual e qual a dosagem?</p>
                            <textarea
                                rows={2}
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent transition-all"
                                value={formData.current_medication}
                                onChange={(e) => setFormData({ ...formData, current_medication: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">5. Qualidade do Sono</label>
                            <p className="text-xs text-gray-500 mb-3">Como você dorme? Tem insônia, acorda muito, pesadelos?</p>
                            <textarea
                                rows={2}
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent transition-all"
                                value={formData.sleep_quality}
                                onChange={(e) => setFormData({ ...formData, sleep_quality: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">6. Rotina e Hábitos</label>
                        <p className="text-xs text-gray-500 mb-3">Como é o seu dia a dia? Trabalho, estudos, lazer, exercícios físicos, alimentação.</p>
                        <textarea
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent transition-all"
                            value={formData.routine}
                            onChange={(e) => setFormData({ ...formData, routine: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">7. Expectativas com a Terapia</label>
                        <p className="text-xs text-gray-500 mb-3">O que você espera alcançar com o processo terapêutico?</p>
                        <textarea
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent transition-all"
                            value={formData.expectations}
                            onChange={(e) => setFormData({ ...formData, expectations: e.target.value })}
                        />
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-[#6A8164] hover:bg-[#586e53] text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all flex items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed text-lg w-full md:w-auto justify-center"
                        >
                            {submitting && <Loader2 className="animate-spin" size={24} />}
                            Enviar Ficha de Anamnese
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
