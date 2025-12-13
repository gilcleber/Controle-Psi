import React, { useState, useEffect, useRef } from 'react';
import { Patient } from '@/types';
import { storage } from '@/services/storage';
import { supabase } from '@/services/supabaseClient';
import { Mic, StopCircle, ChevronDown, Sparkles, Loader2 } from 'lucide-react';
import { summarizeSessionNotes } from '@/services/geminiService';

const AiAssistant: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string>('');
    const [isRecording, setIsRecording] = useState(false);
    const [timer, setTimer] = useState(0);
    const [sessionNotes, setSessionNotes] = useState('');
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [aiSummary, setAiSummary] = useState('');

    const recognitionRef = useRef<any>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        loadPatients();

        // Initialize Speech Recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'pt-BR';

            recognitionRef.current.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setSessionNotes(prev => prev + (prev ? ' ' : '') + finalTranscript);
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                stopRecording();
            };
        }
    }, []);

    const loadPatients = async () => {
        try {
            const loadedPatients = await storage.getPatients();
            setPatients(loadedPatients);
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    };

    const startRecording = () => {
        if (!selectedPatientId) {
            alert('Por favor, selecione um paciente primeiro.');
            return;
        }
        if (!recognitionRef.current) {
            alert('Seu navegador não suporta reconhecimento de voz.');
            return;
        }

        recognitionRef.current.start();
        setIsRecording(true);

        // Start Timer
        timerRef.current = setInterval(() => {
            setTimer(prev => prev + 1);
        }, 1000);
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsRecording(false);
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleSaveSession = async () => {
        if (!sessionNotes) return;

        // Generate Summary if not already done
        let summaryToSave = aiSummary;
        if (!summaryToSave) {
            setIsSummarizing(true);
            try {
                summaryToSave = await summarizeSessionNotes(sessionNotes);
                setAiSummary(summaryToSave);
            } catch (error) {
                console.error("Error summarizing", error);
            } finally {
                setIsSummarizing(false);
            }
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const newSession = {
                patient_id: selectedPatientId,
                date: new Date().toISOString().split('T')[0],
                notes: sessionNotes,
                summary: summaryToSave,
                tags: [],
                user_id: user.id
            };

            const { error } = await supabase.from('sessions').insert([newSession]);
            if (error) throw error;

            alert('Sessão salva com sucesso!');
            setSessionNotes('');
            setAiSummary('');
            setTimer(0);
            setSelectedPatientId('');
        } catch (error) {
            console.error('Error saving session:', error);
            alert('Erro ao salvar sessão.');
        }
    };

    return (
        <div className="p-8 h-full flex flex-col bg-white animate-fade-in">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Inteligência Artificial</h2>
                <p className="text-gray-500">Use a IA para criar resumos das suas sessões de terapia</p>
            </div>

            <div className="flex-1 flex flex-col items-center max-w-3xl mx-auto w-full">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Use a Inteligência Artificial para fazer um resumo da sessão</h3>

                <div className="w-full bg-white rounded-xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100 p-8 mb-10">
                    <h4 className="text-xl font-bold text-gray-800 mb-1">Escolha o paciente</h4>
                    <p className="text-sm text-gray-500 mb-6">Selecione o paciente para associar esta gravação</p>

                    <div className="relative mb-12">
                        <select
                            className="w-full appearance-none border border-gray-200 rounded-lg p-3 pr-10 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent bg-white text-gray-700 shadow-sm"
                            value={selectedPatientId}
                            onChange={(e) => setSelectedPatientId(e.target.value)}
                        >
                            <option value="" disabled>Pacientes</option>
                            {patients.map(p => (
                                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                    </div>

                    <div className="flex flex-col items-center justify-center">
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg mb-4 ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-[#A8B5A6] hover:bg-[#96a594]'
                                }`}
                        >
                            {isRecording ? <StopCircle size={32} className="text-white" /> : <Mic size={32} className="text-white" />}
                        </button>
                        <div className="text-2xl font-bold text-gray-800 tracking-wider">{formatTime(timer)}</div>
                        <p className="text-xs text-gray-500 mt-1">Tempo total da sessão</p>
                    </div>
                </div>

                {sessionNotes && (
                    <div className="w-full mb-8 animate-fade-in">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{sessionNotes}</p>
                        </div>
                        <button
                            onClick={handleSaveSession}
                            className="w-full bg-[#6A8164] text-white py-3 rounded-lg font-medium hover:bg-[#586e53] transition-colors flex items-center justify-center gap-2"
                        >
                            {isSummarizing ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                            Salvar e Gerar Resumo
                        </button>
                    </div>
                )}

                <div className="w-full text-left">
                    <h4 className="font-bold text-gray-800 mb-4 text-sm">Leia atentamente antes de usar:</h4>
                    <ul className="space-y-3 text-xs text-gray-500 leading-relaxed">
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></span>
                            Preferencialmente utilize o navegador <strong className="text-gray-700">Google Chrome</strong> para fazer a escuta da sua sessão.
                        </li>
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></span>
                            Para usar a Inteligência Artificial para fazer o resumo da sua sessão, você deve usar um celular ou um computador que <strong className="text-gray-700">não esteja na mesma chamada da sessão online com seu paciente</strong>. Isso é necessário para que a Inteligência Artificial possa escutar você e o seu paciente falando.
                        </li>
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></span>
                            O seu celular ou computador que ficará escutando precisa ficar nessa tela com o cronômetro correndo. Caso você desligue, saia dessa tela, você escutará um BEEP indicando que precisa voltar para essa tela. Enquanto você não retornar para essa tela o BEEP não irá parar.
                        </li>
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></span>
                            A Inteligência Artificial não consegue ver a imagem ou vídeo, ou seja, se você ficar escutando o BEEP não vai ativar o vídeo da sua sessão.
                        </li>
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></span>
                            Enquanto a escuta estiver em andamento, uma <strong className="text-gray-700">tarja vermelha</strong> ficará no topo da tela indicando que a escuta está acontecendo e impedindo a navegação por outras abas do aplicativo. Quando a escuta for finalizada essa tarja é removida e você poderá navegar normalmente pelo aplicativo.
                        </li>
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></span>
                            Para preservar sua privacidade e a do seu paciente, a IA começa a escutar após você pressionar o botão microfone e termina quando a sessão finalizar ou quando você parar a gravação. Durante a sessão, caso você fique sem conexão de internet, você não terá prejuízo para receber o resumo da sessão.
                        </li>
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></span>
                            O tempo total da sessão será de no máximo 80 minutos.
                        </li>
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></span>
                            Quando o cronômetro marcar 40 minutos ele ficará vermelho para informar que faltam 10 minutos para encerrar a sessão.
                        </li>
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></span>
                            Caso você tenha uma sessão mais longa do que o normal, você terá uma <strong className="text-gray-700">tolerância de até 10 minutos</strong> após os 70 minutos da sessão para fazer isso sem que utilize seus créditos. Após os 80 segundos do início da sessão o crédito será cobrado do seu saldo.
                        </li>
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></span>
                            Ao finalizar a sessão um resumo da sessão será disponibilizado na aba "Minhas Sessões", cerca de 3 a 5 minutos após o término da sessão. Procure pelo nome do paciente e a data que realizou essa sessão.
                        </li>
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></span>
                            Por questões de proteção dos dados a plataforma ControlePsi <strong className="text-gray-700">não grava e não armazena</strong> o áudio da sessão.
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AiAssistant;
