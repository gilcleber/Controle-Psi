import React from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';

interface AnamnesisViewerProps {
    form: any;
    patientName: string;
    onClose: () => void;
}

const AnamnesisViewer: React.FC<AnamnesisViewerProps> = ({ form, patientName, onClose }) => {
    // Organiza as respostas
    const answers = form.answers || {};

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-3xl shadow-2xl h-[85vh] flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#6A8164] text-white rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <FileText size={24} />
                        <div>
                            <h3 className="text-xl font-bold">Ficha de Anamnese Respondida</h3>
                            <p className="text-green-100 text-sm">Paciente: {patientName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-green-100 hover:text-white text-3xl leading-none">&times;</button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
                    <div className="mb-6 flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-100">
                        <CheckCircle2 size={20} />
                        <span className="text-sm font-medium">Respondida em: {new Date(form.completed_at).toLocaleDateString('pt-BR')} às {new Date(form.completed_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                    </div>

                    <div className="space-y-6">
                        {Object.entries(answers).map(([key, value], idx) => (
                            <div key={key} className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
                                <h4 className="font-bold text-gray-700 mb-2 capitalize border-b border-gray-50 pb-2">
                                    {key.replace(/_/g, ' ')}
                                </h4>
                                {typeof value === 'boolean' ? (
                                    <p className="text-gray-600">{value ? 'Sim' : 'Não'}</p>
                                ) : (
                                    <p className="text-gray-600 whitespace-pre-wrap">{value as string || 'Não informado.'}</p>
                                )}
                            </div>
                        ))}
                        {Object.keys(answers).length === 0 && (
                            <p className="text-center text-gray-400 py-8">Nenhuma resposta adicional além dos dados básicos do paciente.</p>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end bg-white rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AnamnesisViewer;
