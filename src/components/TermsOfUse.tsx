import React from 'react';
import { X } from 'lucide-react';

interface TermsOfUseProps {
    isOpen: boolean;
    onClose: () => void;
}

const TermsOfUse: React.FC<TermsOfUseProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-background">
                    <h2 className="text-xl font-bold text-primary-dark">Termos de Uso e Privacidade</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 text-sm text-text-main leading-relaxed space-y-4">
                    <p>Seja bem-vindo ao <strong>ControlePsi</strong>.</p>

                    <h3 className="font-bold text-primary">1. Aceitação</h3>
                    <p>Ao utilizar este sistema, você concorda com os termos aqui presentes. O sistema foi desenvolvido para auxiliar terapeutas na gestão de seus atendimentos.</p>

                    <h3 className="font-bold text-primary">2. Privacidade e Dados</h3>
                    <p>Nós levamos a privacidade a sério. Todos os dados inseridos são de responsabilidade do profissional.</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Os dados dos clientes são sigilosos.</li>
                        <li>Recomendamos o uso de senhas fortes.</li>
                        <li>O sistema utiliza criptografia padrão para comunicação.</li>
                    </ul>

                    <h3 className="font-bold text-primary">3. Responsabilidades</h3>
                    <p>O uso ético das informações é de inteira responsabilidade do usuário (terapeuta/psicólogo).</p>

                    <h3 className="font-bold text-primary">4. Contato</h3>
                    <p>Em caso de dúvidas ou suporte, entre em contato com o administrador do sistema.</p>

                    <div className="mt-8 p-4 bg-secondary-light/30 rounded-lg text-xs text-text-light text-center">
                        &copy; {new Date().getFullYear()} ControlePsi. Todos os direitos reservados.
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium"
                    >
                        Entendi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TermsOfUse;
