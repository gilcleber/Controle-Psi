import React, { useState, useEffect, useRef } from 'react';
import { Patient } from '@/types';
import { storage } from '@/services/storage';
import { supabase } from '@/services/supabaseClient';
import { Mic, StopCircle, ChevronDown, Sparkles, Loader2 } from 'lucide-react';
import { summarizeSessionNotes } from '@/services/geminiService';

const AiAssistant: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string>(() => {
        return localStorage.getItem('selectedPatientId') || '';
    });

    useEffect(() => {
        if (selectedPatientId) {
            localStorage.setItem('selectedPatientId', selectedPatientId);
        }
    }, [selectedPatientId]);
    const [isRecording, setIsRecording] = useState(false);
    const [timer, setTimer] = useState(0);
    const [sessionNotes, setSessionNotes] = useState('');
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [aiSummary, setAiSummary] = useState('');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<BlobPart[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async () => {
        try {
            const loadedPatients = await storage.getPatients();
            setPatients(loadedPatients);
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    };

    const startRecording = async () => {
        if (!selectedPatientId) {
            alert('Por favor, selecione um paciente primeiro.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                // Stop all tracks to release the microphone
                stream.getTracks().forEach(track => track.stop());
                
                await handleTranscription(audioBlob);
            };

            mediaRecorder.start(1000); // collect data every second
            setIsRecording(true);

            // Start Timer
            timerRef.current = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Erro ao acessar microfone:", err);
            alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const handleTranscription = async (audioBlob: Blob) => {
        setIsTranscribing(true);
        try {
            // dynamically import deepgram service so it doesn't break if not present
            const { transcribeAudio } = await import('@/services/deepgramService');
            const transcript = await transcribeAudio(audioBlob);
            
            if (transcript) {
                setSessionNotes(prev => prev + (prev ? '\n\n' : '') + transcript);
            } else {
                alert('Áudio muito curto ou nenhuma fala detectada.');
            }
        } catch (error) {
            console.error("Erro ao transcrever:", error);
            alert('Erro ao processar o áudio no servidor (Deepgram).');
        } finally {
            setIsTranscribing(false);
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

            alert('Atendimento salvo com sucesso!');
            setSessionNotes('');
            setAiSummary('');
            setTimer(0);
            setSelectedPatientId('');
        } catch (error) {
            console.error('Error saving session:', error);
            alert('Erro ao salvar atendimento.');
        }
    };

    return (
        <div className="p-8 h-full flex flex-col bg-white animate-fade-in">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Inteligência Artificial</h2>
                <p className="text-gray-500">Use a IA para criar resumos das suas atendimentos de terapia</p>
            </div>

            <div className="flex-1 flex flex-col items-center max-w-3xl mx-auto w-full">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Use a Inteligência Artificial para fazer um resumo da atendimento</h3>

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
                        <p className="text-xs text-gray-500 mt-1">Tempo total da atendimento</p>
                    </div>
                </div>

                {isTranscribing && (
                    <div className="w-full mb-8 flex flex-col items-center justify-center p-8 bg-white border border-gray-100 rounded-xl shadow-sm animate-pulse">
                        <Loader2 className="animate-spin text-[#6A8164] mb-3" size={32} />
                        <p className="text-sm font-medium text-gray-600">Processando áudio via Deepgram...</p>
                        <p className="text-xs text-gray-400 text-center mt-2 max-w-xs">Isso pode levar alguns segundos dependendo do tamanho da gravação.</p>
                    </div>
                )}

                {sessionNotes && !isTranscribing && (
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
                    <h4 className="font-bold text-gray-800 mb-4 text-sm">Como funciona o assistente de IA:</h4>
                    <ul className="space-y-4 text-xs text-gray-500 leading-relaxed">
                        <li className="flex gap-3 items-start">
                            <span className="block w-1.5 h-1.5 rounded-full bg-[#6A8164] mt-1.5 flex-shrink-0"></span>
                            <span>Você pode usar o seu <strong className="text-gray-700">celular</strong> para gravar o áudio da sessão, deixando o computador livre para o atendimento online por vídeo.</span>
                        </li>
                        <li className="flex gap-3 items-start">
                            <span className="block w-1.5 h-1.5 rounded-full bg-[#6A8164] mt-1.5 flex-shrink-0"></span>
                            <span>A gravação começa ao clicar no microfone e termina apenas quando você clicar no botão de parar. O cronômetro não se fechará sozinho.</span>
                        </li>
                        <li className="flex gap-3 items-start">
                            <span className="block w-1.5 h-1.5 rounded-full bg-[#6A8164] mt-1.5 flex-shrink-0"></span>
                            <span>Após a sessão, clique em <strong className="text-[#6A8164]">Salvar e Gerar Resumo</strong>. O sistema processará o áudio, criará um resumo clínico profissional e o salvará <strong className="text-gray-700">automaticamente no Prontuário do paciente</strong>.</span>
                        </li>
                        <li className="flex gap-3 items-start">
                            <span className="block w-1.5 h-1.5 rounded-full bg-[#6A8164] mt-1.5 flex-shrink-0"></span>
                            <span>Privacidade garantida: O áudio da sessão <strong className="text-red-500">não é gravado permanentemente e nem armazenado</strong>. Ele é apenas processado momentaneamente para gerar o texto e logo em seguida é descartado.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AiAssistant;
