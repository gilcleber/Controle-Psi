import React, { useState, useEffect } from 'react';
import { FileText, Printer, FileCheck } from 'lucide-react';
import { storage } from '@/services/storage';
import { Patient } from '@/types';

export default function DocumentGenerator() {
    const [activeTab, setActiveTab] = useState<'receipt' | 'certificate'>('receipt');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState('');

    // Receipt State
    const [amount, setAmount] = useState('');
    const [serviceDescription, setServiceDescription] = useState('Sessão de Psicoterapia');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Certificate State
    const [certificateText, setCertificateText] = useState('');

    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async () => {
        const data = await storage.getPatients();
        setPatients(data);
    };

    const handlePrint = () => {
        window.print();
    };

    const selectedPatient = patients.find(p => p.id === selectedPatientId);

    return (
        <div className="p-8 bg-[#f8f9fa] min-h-screen print:p-0 print:bg-white">
            {/* No-Print Interface */}
            <div className="max-w-4xl mx-auto print:hidden">
                <h1 className="text-2xl font-bold text-text-main mb-6 flex items-center gap-2">
                    <FileText className="text-primary-dark" />
                    Gerador de Documentos
                </h1>

                <div className="bg-white rounded-xl shadow-sm border border-secondary-light p-6 mb-8">
                    <div className="flex gap-4 border-b border-gray-100 mb-6">
                        <button
                            onClick={() => setActiveTab('receipt')}
                            className={`pb-2 px-4 font-medium transition-colors border-b-2 ${activeTab === 'receipt'
                                    ? 'border-primary text-primary-dark'
                                    : 'border-transparent text-text-light hover:text-text-main'
                                }`}
                        >
                            Recibo
                        </button>
                        <button
                            onClick={() => setActiveTab('certificate')}
                            className={`pb-2 px-4 font-medium transition-colors border-b-2 ${activeTab === 'certificate'
                                    ? 'border-primary text-primary-dark'
                                    : 'border-transparent text-text-light hover:text-text-main'
                                }`}
                        >
                            Atestado / Declaração
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1.5">Paciente</label>
                            <select
                                value={selectedPatientId}
                                onChange={(e) => setSelectedPatientId(e.target.value)}
                                className="w-full border border-secondary rounded-lg p-2.5 focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                                <option value="">Selecione...</option>
                                {patients.map(p => (
                                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1.5">Data</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full border border-secondary rounded-lg p-2.5 focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>

                        {activeTab === 'receipt' ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-1.5">Valor (R$)</label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0,00"
                                        className="w-full border border-secondary rounded-lg p-2.5 focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-text-main mb-1.5">Descrição do Serviço</label>
                                    <input
                                        type="text"
                                        value={serviceDescription}
                                        onChange={(e) => setServiceDescription(e.target.value)}
                                        className="w-full border border-secondary rounded-lg p-2.5 focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-text-main mb-1.5">Texto do Atestado</label>
                                <textarea
                                    value={certificateText}
                                    onChange={(e) => setCertificateText(e.target.value)}
                                    rows={5}
                                    className="w-full border border-secondary rounded-lg p-2.5 focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Declaro para os devidos fins que..."
                                />
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={() => setCertificateText(`Declaro para os devidos fins que ${selectedPatient ? selectedPatient.firstName + ' ' + selectedPatient.lastName : '__________________'} encontra-se em acompanhamento psicológico sob meus cuidados.`)}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        Modelo Acompanhamento
                                    </button>
                                    <button
                                        onClick={() => setCertificateText(`Declaro para os devidos fins que ${selectedPatient ? selectedPatient.firstName + ' ' + selectedPatient.lastName : '__________________'} compareceu à sessão de psicoterapia nesta data, no período de ____ às ____.`)}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        Modelo Comparecimento
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handlePrint}
                            className="bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2 font-medium"
                        >
                            <Printer size={18} /> Imprimir Documento
                        </button>
                    </div>
                </div>
            </div>

            {/* Print Friendly Preview Area */}
            <div className="max-w-[21cm] mx-auto bg-white p-[2cm] shadow-lg print:shadow-none print:w-full print:max-w-none mb-10 min-h-[29.7cm]">
                <div className="text-center mb-12 border-b-2 border-gray-800 pb-6 print:border-black">
                    <h2 className="text-2xl font-bold uppercase tracking-wider mb-2">Psicologia Clínica</h2>
                    <p className="text-sm text-gray-600">Seu Nome / CRP 00/00000</p>
                    {/* Placeholder for Logo */}
                </div>

                <div className="space-y-6 text-lg leading-relaxed font-serif">
                    <h3 className="text-xl font-bold text-center mb-8 uppercase underline">
                        {activeTab === 'receipt' ? 'R E C I B O' : 'D E C L A R A Ç Ã O'}
                    </h3>

                    {activeTab === 'receipt' ? (
                        <>
                            <p>
                                Recebi de <strong>{selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : '_______________________________________'}</strong>
                                {selectedPatient?.cpf && <span className="text-sm block text-gray-500">CPF: {selectedPatient.cpf}</span>}
                            </p>
                            <p>
                                A importância de <strong>R$ {amount || '_______'}</strong> referente a <strong>{serviceDescription}</strong>.
                            </p>
                        </>
                    ) : (
                        <p className="whitespace-pre-wrap">
                            {certificateText || 'Texto da declaração aqui...'}
                        </p>
                    )}

                    <p className="mt-12 text-right">
                        Cidade/UF, {new Date(date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
                    </p>

                    <div className="mt-24 pt-4 border-t border-black w-64 ml-auto text-center">
                        <p className="font-bold">Psicólogo(a) Responsável</p>
                        <p className="text-sm">CRP 00/00000</p>
                    </div>
                </div>
            </div>

            <div className="text-center print:hidden text-gray-400 text-sm pb-8">
                Visualização de Impressão (A4)
            </div>

            <style>
                {`
                    @media print {
                        @page { margin: 0; size: auto; }
                        body * { visibility: hidden; }
                        .print\\:hidden { display: none !important; }
                        .max-w-\\[21cm\\] { 
                            visibility: visible; 
                            position: absolute; 
                            left: 0; 
                            top: 0; 
                            width: 100%; 
                            margin: 0;
                            padding: 2cm;
                            box-shadow: none;
                        }
                        .max-w-\\[21cm\\] * { visibility: visible; }
                    }
                `}
            </style>
        </div>
    );
}
