import React, { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import { BrainCircuit, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface TemplateField {
    name: string;
    label: string;
    type: string;
    required: boolean;
}

export default function AnamnesisForm() {
    const params = new URLSearchParams(window.location.search);
    const therapistId = params.get('t');
    const templateId = params.get('template');
    
    // Suporte ao formato antigo para retrocompatibilidade
    const legacyFormId = params.get('id');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [template, setTemplate] = useState<any>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});

    useEffect(() => {
        if (therapistId && templateId) {
            loadTemplate(templateId);
        } else if (legacyFormId) {
            checkLegacyForm(legacyFormId);
        } else {
            setError('Link inválido. Parâmetros ausentes.');
            setLoading(false);
        }
    }, [therapistId, templateId, legacyFormId]);

    const loadTemplate = async (id: string) => {
        try {
            const { data, error } = await supabase
                .from('form_templates')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) throw new Error('Modelo de ficha não encontrado.');
            if (!data.is_active) throw new Error('Este modelo de ficha não está mais ativo.');

            setTemplate(data);
            
            // Initialize empty form data
            const initialData: Record<string, string | boolean> = {};
            data.fields.forEach((f: TemplateField) => {
                initialData[f.name] = f.type === 'checkbox' ? false : '';
            });
            setFormData(initialData);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const checkLegacyForm = async (id: string) => {
        try {
            const { data, error } = await supabase
                .from('anamnesis_forms')
                .select('id, status')
                .eq('id', id)
                .single();

            if (error || !data) throw new Error('Ficha não encontrada ou link inválido.');
            if (data.status === 'completed') throw new Error('Esta ficha de anamnese já foi preenchida.');

            // Fallback for old static form
            setError('Este formato de link expirou. Por favor, solicite o novo link ao seu terapeuta.');
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
            const standardFields = ['first_name', 'last_name', 'email', 'phone', 'cpf', 'birth_date'];
            
            const patientData: Record<string, any> = {};
            const anamnesisAnswers: Record<string, any> = {};

            Object.keys(formData).forEach(key => {
                let value = formData[key];
                
                // Tratar datas vazias e strings vazias para não quebrar o banco de dados
                if (value === '') {
                    value = null;
                }

                if (standardFields.includes(key)) {
                    patientData[key] = value;
                } else {
                    anamnesisAnswers[key] = value;
                }
            });

            // RPC call para bypassar RLS e inserir/atualizar paciente e anamnese
            const { data, error } = await supabase.rpc('submit_public_anamnesis', {
                p_therapist_id: therapistId,
                p_template_id: templateId,
                p_patient_data: patientData,
                p_anamnesis_answers: anamnesisAnswers
            });

            if (error) throw error;
            if (data && data.success === false) throw new Error(data.error || 'Erro interno no banco de dados');

            setSuccess(true);
        } catch (err: any) {
            console.error('Erro ao salvar anamnese:', err);
            setError('Ocorreu um erro ao enviar suas respostas. Tente novamente ou contate seu terapeuta.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleChange = (name: string, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F5F7F5] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#6A8164]" size={48} />
            </div>
        );
    }

    if (error && !template) {
        return (
            <div className="min-h-screen bg-[#F5F7F5] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center border border-gray-100">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="text-red-500 text-2xl" />
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
                    <p className="text-sm text-gray-400 font-medium">Você pode fechar esta tela com segurança.</p>
                </div>
            </div>
        );
    }

    const themeColor = template?.accent_color || '#6A8164';

    return (
        <div className="min-h-screen bg-[#F5F7F5] py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                {/* Cabeçalho do Formulário */}
                {template?.logo_url ? (
                    <div className="w-full h-48 bg-gray-100 relative">
                        <img 
                            src={template.logo_url} 
                            alt="Banner do Consultório" 
                            className="w-full h-full object-contain"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                    </div>
                ) : null}

                <div className="px-8 py-10 text-center text-white relative" style={{ backgroundColor: themeColor }}>
                    {!template?.logo_url && (
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <BrainCircuit size={32} className="text-white" />
                            </div>
                        </div>
                    )}
                    <h1 className="text-3xl font-bold mb-3">{template?.name || 'Ficha de Anamnese'}</h1>
                    <p className="text-white/90 max-w-xl mx-auto text-sm leading-relaxed">
                        {template?.description || 'Por favor, preencha os dados abaixo. Suas respostas são tratadas com sigilo e segurança, sendo de uso exclusivo do seu terapeuta.'}
                    </p>
                </div>

                {error && (
                    <div className="m-8 bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-3">
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {/* Renderização Dinâmica dos Campos */}
                    {template?.fields?.map((field: TemplateField, idx: number) => (
                        <div key={idx} className="bg-gray-50/50 p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                {idx + 1}. {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>

                            {field.type === 'text' || field.type === 'email' || field.type === 'date' ? (
                                <input
                                    type={field.name === 'phone' ? 'tel' : field.type}
                                    required={field.required}
                                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:border-transparent transition-all"
                                    style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
                                    value={formData[field.name] || ''}
                                    onChange={(e) => {
                                        let val = e.target.value;
                                        if (field.name === 'phone') {
                                            // Allow only digits, parens, dash, space, plus
                                            val = val.replace(/[^\d()+\-\s]/g, '');
                                        } else if (field.name === 'cpf') {
                                            // Allow only digits, dots, dashes
                                            val = val.replace(/[^\d.-]/g, '');
                                        }
                                        handleChange(field.name, val);
                                    }}
                                />
                            ) : field.type === 'textarea' ? (
                                <textarea
                                    required={field.required}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:border-transparent transition-all"
                                    style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
                                    value={formData[field.name] || ''}
                                    onChange={(e) => handleChange(field.name, e.target.value)}
                                />
                            ) : field.type === 'checkbox' ? (
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        required={field.required}
                                        className="w-5 h-5 rounded border-gray-300 focus:ring-2 transition-all cursor-pointer"
                                        style={{ accentColor: themeColor }}
                                        checked={formData[field.name] || false}
                                        onChange={(e) => handleChange(field.name, e.target.checked)}
                                    />
                                    <span className="text-sm text-gray-600">Sim, concordo.</span>
                                </div>
                            ) : null}
                        </div>
                    ))}

                    <div className="pt-8 border-t border-gray-100 flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting}
                            style={{ backgroundColor: submitting ? '#9ca3af' : themeColor }}
                            className="text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all flex items-center gap-3 disabled:cursor-not-allowed text-lg w-full sm:w-auto justify-center hover:opacity-90"
                        >
                            {submitting && <Loader2 className="animate-spin" size={24} />}
                            Finalizar e Enviar
                        </button>
                    </div>
                </form>
                
                <div className="text-center pb-6 text-xs text-gray-400 flex items-center justify-center gap-1">
                    <BrainCircuit size={12} /> Protegido por ControlePsi
                </div>
            </div>
        </div>
    );
}
