import React, { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import { FileText, Plus, Save, Loader2, Copy, Eye, LayoutTemplate, Trash2 } from 'lucide-react';

interface FormTemplate {
    id: string;
    name: string;
    description: string;
    logo_url: string;
    accent_color: string;
    fields: any[];
    is_active: boolean;
}

const defaultFields = [
    { name: 'first_name', label: 'Nome', type: 'text', required: true },
    { name: 'last_name', label: 'Sobrenome', type: 'text', required: true },
    { name: 'email', label: 'E-mail', type: 'email', required: true },
    { name: 'phone', label: 'WhatsApp / Telefone', type: 'text', required: true },
    { name: 'cpf', label: 'CPF', type: 'text', required: true },
    { name: 'birth_date', label: 'Data de Nascimento', type: 'date', required: true },
    { name: 'main_complaint', label: 'Motivo da busca por atendimento (Queixa principal)', type: 'textarea', required: true }
];

const FormTemplates: React.FC = () => {
    const [templates, setTemplates] = useState<FormTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userAuth, setUserAuth] = useState<any>(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setUserAuth(user);
            if (!user) return;

            const { data, error } = await supabase
                .from('form_templates')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                setTemplates(data);
                setSelectedTemplate(data[0]);
            } else {
                // Criar os 3 modelos base se for a primeira vez
                createInitialTemplates(user.id);
            }
        } catch (error) {
            console.error('Error loading templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const createInitialTemplates = async (userId: string) => {
        const initialTemplates = [
            {
                user_id: userId,
                name: 'Ficha Oficial (Adultos)',
                description: 'Ficha padrão para atendimento clínico geral adulto.',
                logo_url: '',
                accent_color: '#6A8164',
                fields: [...defaultFields, 
                    { name: 'medication', label: 'Usa alguma medicação contínua? Qual?', type: 'textarea', required: false },
                    { name: 'previous_therapy', label: 'Já fez terapia antes? Como foi?', type: 'textarea', required: false }
                ]
            },
            {
                user_id: userId,
                name: 'Ficha Jovens / Adolescentes',
                description: 'Linguagem mais acessível para público jovem.',
                logo_url: '',
                accent_color: '#3B82F6',
                fields: [...defaultFields,
                    { name: 'instagram', label: 'Qual o seu Instagram?', type: 'text', required: false },
                    { name: 'hobbies', label: 'Quais são seus hobbies/interesses?', type: 'textarea', required: false },
                    { name: 'relationship', label: 'Como é sua relação em casa?', type: 'textarea', required: false }
                ]
            },
            {
                user_id: userId,
                name: 'Ficha Espiritual (Igreja)',
                description: 'Inclui perguntas sobre espiritualidade e fé.',
                logo_url: '',
                accent_color: '#8B5CF6',
                fields: [...defaultFields,
                    { name: 'religion', label: 'Tem um credo ou uma fé que você acredita? Qual?', type: 'text', required: true },
                    { name: 'spiritual_life', label: 'Como descreveria sua vida espiritual hoje?', type: 'textarea', required: true },
                    { name: 'volunteer', label: 'Você compreende que este é um atendimento voluntário?', type: 'checkbox', required: true }
                ]
            }
        ];

        try {
            const { data, error } = await supabase.from('form_templates').insert(initialTemplates).select();
            if (error) throw error;
            if (data) {
                setTemplates(data);
                setSelectedTemplate(data[0]);
            }
        } catch (error) {
            console.error('Error creating initial templates:', error);
        }
    };

    const handleSaveTemplate = async () => {
        if (!selectedTemplate) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('form_templates')
                .update({
                    name: selectedTemplate.name,
                    description: selectedTemplate.description,
                    logo_url: selectedTemplate.logo_url,
                    accent_color: selectedTemplate.accent_color,
                    fields: selectedTemplate.fields
                })
                .eq('id', selectedTemplate.id);

            if (error) throw error;
            alert('Modelo salvo com sucesso!');
            loadTemplates();
        } catch (error) {
            console.error('Error saving template:', error);
            alert('Erro ao salvar modelo.');
        } finally {
            setSaving(false);
        }
    };

    const handleCopyLink = () => {
        if (!selectedTemplate || !userAuth) return;
        // O link genérico tem o therapist ID (t) e o template ID (template)
        const link = `${window.location.origin}/anamnese?t=${userAuth.id}&template=${selectedTemplate.id}`;
        navigator.clipboard.writeText(link);
        alert('Link genérico copiado! Envie este link para os NOVOS pacientes.');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-screen bg-background">
                <Loader2 className="animate-spin text-[#6A8164]" size={48} />
            </div>
        );
    }

    return (
        <div className="p-8 h-full flex flex-col bg-background min-h-screen">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Modelos de Fichas</h2>
                <p className="text-gray-500">Configure suas fichas de anamnese para envio aos novos pacientes</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8 h-full">
                {/* Lista de Modelos */}
                <div className="w-full md:w-1/3 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-[70vh]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><LayoutTemplate size={18} /> Seus Modelos</h3>
                    </div>
                    
                    <div className="space-y-3 overflow-y-auto pr-2">
                        {templates.map(template => (
                            <div 
                                key={template.id} 
                                onClick={() => setSelectedTemplate(template)}
                                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                    selectedTemplate?.id === template.id 
                                        ? 'border-[#6A8164] bg-[#6A8164]/5 shadow-sm' 
                                        : 'border-gray-100 hover:border-gray-300 bg-gray-50'
                                }`}
                            >
                                <h4 className="font-bold text-gray-800 text-sm mb-1">{template.name}</h4>
                                <p className="text-xs text-gray-500 line-clamp-2">{template.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Editor do Modelo */}
                {selectedTemplate ? (
                    <div className="w-full md:w-2/3 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-[70vh]">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Editando: {selectedTemplate.name}</h3>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleCopyLink}
                                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center gap-2"
                                >
                                    <Copy size={16} /> Copiar Link Genérico
                                </button>
                                <button 
                                    onClick={handleSaveTemplate}
                                    disabled={saving}
                                    className="px-4 py-2 bg-[#6A8164] text-white rounded-lg hover:bg-[#586e53] transition-colors text-sm font-medium flex items-center gap-2"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar Alterações
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                            {/* Basic Config */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Modelo</label>
                                    <input 
                                        value={selectedTemplate.name}
                                        onChange={(e) => setSelectedTemplate({...selectedTemplate, name: e.target.value})}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-[#6A8164]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cor Tema (HEX)</label>
                                    <input 
                                        type="color"
                                        value={selectedTemplate.accent_color}
                                        onChange={(e) => setSelectedTemplate({...selectedTemplate, accent_color: e.target.value})}
                                        className="w-full h-11 border border-gray-300 rounded-lg p-1 focus:ring-[#6A8164] cursor-pointer"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Link do Logotipo / Banner de Topo (URL)</label>
                                    <input 
                                        value={selectedTemplate.logo_url}
                                        onChange={(e) => setSelectedTemplate({...selectedTemplate, logo_url: e.target.value})}
                                        placeholder="https://suaimagem.com/logo.png"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-[#6A8164]"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Cole aqui o link da imagem que vai ficar no topo da ficha para o seu paciente ver.</p>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-6">
                                <h4 className="font-bold text-gray-800 mb-4 flex items-center justify-between">
                                    Perguntas da Ficha
                                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">As 7 primeiras perguntas (dados do paciente) são obrigatórias pelo sistema.</span>
                                </h4>
                                
                                <div className="space-y-3">
                                    {selectedTemplate.fields.map((field, idx) => (
                                        <div key={idx} className={`p-4 rounded-lg border ${idx < 7 ? 'border-gray-200 bg-gray-50' : 'border-gray-300 bg-white'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex-1">
                                                    <input 
                                                        value={field.label}
                                                        onChange={(e) => {
                                                            const newFields = [...selectedTemplate.fields];
                                                            newFields[idx].label = e.target.value;
                                                            setSelectedTemplate({...selectedTemplate, fields: newFields});
                                                        }}
                                                        disabled={idx < 7}
                                                        className={`w-full font-medium ${idx < 7 ? 'bg-transparent text-gray-600' : 'bg-white border border-gray-200 rounded p-1.5 focus:ring-[#6A8164]'}`}
                                                    />
                                                </div>
                                                <div className="flex gap-2 items-center ml-4">
                                                    <select 
                                                        value={field.type}
                                                        onChange={(e) => {
                                                            const newFields = [...selectedTemplate.fields];
                                                            newFields[idx].type = e.target.value;
                                                            setSelectedTemplate({...selectedTemplate, fields: newFields});
                                                        }}
                                                        disabled={idx < 7}
                                                        className="text-xs border border-gray-300 rounded p-1 bg-white"
                                                    >
                                                        <option value="text">Texto Curto</option>
                                                        <option value="textarea">Texto Longo</option>
                                                        <option value="checkbox">Caixa de Seleção</option>
                                                    </select>
                                                    
                                                    {idx >= 7 && (
                                                        <button 
                                                            onClick={() => {
                                                                const newFields = [...selectedTemplate.fields];
                                                                newFields.splice(idx, 1);
                                                                setSelectedTemplate({...selectedTemplate, fields: newFields});
                                                            }}
                                                            className="text-red-400 hover:text-red-600 p-1"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <button 
                                    onClick={() => {
                                        setSelectedTemplate({
                                            ...selectedTemplate,
                                            fields: [...selectedTemplate.fields, { name: `custom_${Date.now()}`, label: 'Nova Pergunta...', type: 'text', required: false }]
                                        });
                                    }}
                                    className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-[#6A8164] hover:text-[#6A8164] transition-colors flex items-center justify-center gap-2 font-medium"
                                >
                                    <Plus size={18} /> Adicionar Pergunta
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full md:w-2/3 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center h-[70vh] text-gray-400">
                        <LayoutTemplate size={48} className="mb-4 opacity-30" />
                        <p>Selecione um modelo ao lado para editar.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FormTemplates;
