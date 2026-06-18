import React, { useState, useEffect, useRef } from 'react';
import { Patient, SessionRecord } from '@/types';
import { storage } from '@/services/storage';
import { supabase } from '@/services/supabaseClient';
import { FileText, Plus, ChevronDown, Sparkles, Loader2, Mic, StopCircle, Trash2 } from 'lucide-react';
import { summarizeSessionNotes } from '@/services/geminiService';
import AnamnesisViewer from './AnamnesisViewer';

const Records: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => {
    return localStorage.getItem('selectedPatientId') || '';
  });
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnamnesisModalOpen, setIsAnamnesisModalOpen] = useState(false);
  const [patientAnamnesis, setPatientAnamnesis] = useState<any>(null);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      localStorage.setItem('selectedPatientId', selectedPatientId);
      loadSessions(selectedPatientId);
      loadAnamnesis(selectedPatientId);
    } else {
      setSessions([]);
      setPatientAnamnesis(null);
    }
  }, [selectedPatientId]);

  const loadAnamnesis = async (patientId: string) => {
    try {
      const { data } = await supabase
        .from('anamnesis_forms')
        .select('*')
        .eq('patient_id', patientId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();
        
      setPatientAnamnesis(data);
    } catch (e) {
        setPatientAnamnesis(null);
    }
  };

  const loadPatients = async () => {
    try {
      const loadedPatients = await storage.getPatients();
      setPatients(loadedPatients);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const loadSessions = async (patientId: string) => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('patient_id', patientId)
        .order('date', { ascending: false });

      if (error) throw error;

      const formattedSessions: SessionRecord[] = (data || []).map((s: any) => ({
        id: s.id,
        patientId: s.patient_id,
        date: s.date,
        notes: s.notes,
        summary: s.summary,
        tags: s.tags || []
      }));

      setSessions(formattedSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  useEffect(() => {
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
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Seu navegador não suporta reconhecimento de voz.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  // Structured Mode State
  const [recordMode, setRecordMode] = useState<'free' | 'structured'>('free');
  const [structuredData, setStructuredData] = useState({
    subject: '', // Queixa/Assunto
    mood: '', // Humor/Afeto
    discussion: '', // O que foi trabalhado
    plan: '' // Próximos passos
  });

  // Load existing notes into structured data if format matches
  useEffect(() => {
    if (sessionNotes && sessionNotes.includes('[ASSUNTO]:')) {
      const subject = sessionNotes.match(/\[ASSUNTO\]: (.*?)(?=\n\[|$)/s)?.[1] || '';
      const mood = sessionNotes.match(/\[HUMOR\]: (.*?)(?=\n\[|$)/s)?.[1] || '';
      const discussion = sessionNotes.match(/\[DISCUSSÃO\]: (.*?)(?=\n\[|$)/s)?.[1] || '';
      const plan = sessionNotes.match(/\[PLANO\]: (.*?)(?=\n\[|$)/s)?.[1] || '';

      setStructuredData({ subject, mood, discussion, plan });
      setRecordMode('structured');
    }
  }, [sessionNotes]);

  const getFormattedNotes = () => {
    if (recordMode === 'free') return sessionNotes;
    return `[ASSUNTO]: ${structuredData.subject}\n\n[HUMOR]: ${structuredData.mood}\n\n[DISCUSSÃO]: ${structuredData.discussion}\n\n[PLANO]: ${structuredData.plan}`;
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Tem certeza que deseja excluir este atendimento? Esta ação não pode ser desfeita.')) return;
    
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw error;
      
      await loadSessions(selectedPatientId);
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Erro ao excluir atendimento.');
    }
  };

  const handleSummarize = async () => {
    const textToSummarize = getFormattedNotes();
    if (!textToSummarize.trim()) return;
    setIsSummarizing(true);
    try {
      const summary = await summarizeSessionNotes(textToSummarize);
      setAiSummary(summary);
    } catch (error) {
      alert("Erro ao conectar com a IA.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSaveSession = async () => {
    const finalNotes = getFormattedNotes();

    if (!selectedPatientId || !finalNotes.trim()) {
      alert('Selecione um cliente e adicione anotações.');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current User:', user);

      if (!user) {
        alert('Erro: Usuário não autenticado.');
        return;
      }

      const newSession = {
        patient_id: selectedPatientId,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        notes: finalNotes,
        summary: aiSummary,
        tags: [], // Could extract tags from AI later
        user_id: user.id
      };

      console.log('Saving session:', newSession);

      const { data, error } = await supabase
        .from('sessions')
        .insert([newSession])
        .select();

      if (error) {
        console.error('Supabase Insert Error:', error);
        throw error;
      }

      console.log('Session saved successfully:', data);

      await loadSessions(selectedPatientId);
      setIsNewSessionModalOpen(false);
      setSessionNotes('');
      setAiSummary('');
    } catch (error: any) {
      console.error('Error saving session (catch block):', error);
      alert(`Erro ao salvar atendimento: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Prontuários</h2>
        <p className="text-gray-500">Visualize e edite os prontuários dos seus clientes</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
        <div className="w-full md:w-1/3 mb-6 relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Escolha o cliente</label>
          <div className="relative">
            <select
              className="w-full appearance-none border border-gray-300 rounded-lg p-3 pr-10 focus:ring-[#6A8164] focus:border-[#6A8164] bg-white cursor-pointer"
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
            >
              <option value="" disabled>Selecione um cliente</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
          </div>
        </div>

        {!selectedPatient ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-lg bg-gray-50/50">
            <FileText size={64} className="mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-gray-600">Selecione um cliente</h3>
            <p className="max-w-md text-center mt-2 text-sm">Escolha um cliente na lista acima para visualizar seu histórico, criar novas sessões e usar a IA para resumos.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col animate-fade-in">
            <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#6A8164] text-white flex items-center justify-center text-xl font-bold">
                  {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{selectedPatient.firstName} {selectedPatient.lastName}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">ativo</span>
                    <span className="text-sm text-gray-500">CPF: {selectedPatient.cpf}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {patientAnamnesis && (
                  <button
                    onClick={() => {
                      setIsAnamnesisModalOpen(true);
                      if (!patientAnamnesis.is_read) {
                        supabase.from('anamnesis_forms').update({is_read: true}).eq('id', patientAnamnesis.id).then();
                        setPatientAnamnesis({...patientAnamnesis, is_read: true});
                      }
                    }}
                    className="bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-all relative"
                  >
                    {!patientAnamnesis.is_read && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>}
                    <FileText size={18} />
                    Ver Ficha Recebida
                  </button>
                )}
                <button
                  onClick={() => setIsNewSessionModalOpen(true)}
                  className="bg-[#6A8164] hover:bg-[#586e53] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-all"
                >
                  <Plus size={18} />
                  Novo atendimento
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6">
              {sessions.length === 0 ? (
                <div className="text-center text-gray-400 py-10">
                  Nenhum atendimento registrado para este cliente.
                </div>
              ) : (
                sessions.map(session => (
                  <div key={session.id} className="border-l-2 border-gray-200 pl-6 relative pb-6 group">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 bg-gray-200 rounded-full border-2 border-white"></div>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-medium text-gray-600">{new Date(session.date).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      <button 
                        onClick={() => handleDeleteSession(session.id)} 
                        className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100" 
                        title="Excluir Atendimento"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{session.summary || session.notes}</p>
                      {session.tags && session.tags.length > 0 && (
                        <div className="mt-3 flex gap-2">
                          {session.tags.map((tag, idx) => (
                            <span key={idx} className="text-xs bg-white border border-gray-200 px-2 py-1 rounded text-gray-500">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Session Modal with AI */}
      {isNewSessionModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Novo Atendimento</h3>
                <p className="text-sm text-gray-500">{selectedPatient?.firstName} {selectedPatient?.lastName} - {new Date().toLocaleDateString()}</p>
              </div>
              <button onClick={() => setIsNewSessionModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
              {/* Left: Raw Notes */}
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex rounded-lg bg-gray-100 p-1">
                    <button
                      onClick={() => setRecordMode('free')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${recordMode === 'free' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Texto Livre
                    </button>
                    <button
                      onClick={() => setRecordMode('structured')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${recordMode === 'structured' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Estruturado
                    </button>
                  </div>

                  {recordMode === 'free' && (
                    <button
                      onClick={toggleRecording}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isRecording
                        ? 'bg-red-100 text-red-600 animate-pulse border border-red-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                        }`}
                    >
                      {isRecording ? <><StopCircle size={14} /> Gravando...</> : <><Mic size={14} /> Gravar Áudio</>}
                    </button>
                  )}
                </div>

                {recordMode === 'free' ? (
                  <>
                    <textarea
                      className="flex-1 w-full border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent resize-none text-base leading-relaxed"
                      placeholder="Digite aqui ou grave o áudio do atendimento..."
                      value={sessionNotes}
                      onChange={(e) => setSessionNotes(e.target.value)}
                    />
                    <p className="text-xs text-gray-400 mt-2">Dica: Use o botão de gravar para transcrever o atendimento em tempo real.</p>
                  </>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Queixa / Assunto Principal</label>
                      <input
                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={structuredData.subject}
                        onChange={(e) => setStructuredData({ ...structuredData, subject: e.target.value })}
                        placeholder="Sobre o que falaram hoje?"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Humor / Afeto</label>
                      <input
                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={structuredData.mood}
                        onChange={(e) => setStructuredData({ ...structuredData, mood: e.target.value })}
                        placeholder="Como o cliente estava se sentindo?"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discussão / Intervenções</label>
                      <textarea
                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary focus:border-transparent"
                        rows={4}
                        value={structuredData.discussion}
                        onChange={(e) => setStructuredData({ ...structuredData, discussion: e.target.value })}
                        placeholder="Detalhes do atendimento e intervenções realizadas..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Plano / Próximos Passos</label>
                      <textarea
                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary focus:border-transparent"
                        rows={2}
                        value={structuredData.plan}
                        onChange={(e) => setStructuredData({ ...structuredData, plan: e.target.value })}
                        placeholder="O que ficou combinado para a próxima?"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right: AI Summary */}
              <div className="w-full md:w-[400px] flex flex-col bg-green-50/50 rounded-lg border border-green-100 p-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-[#6A8164]" />
                    <span className="font-semibold text-gray-800">Resumo Inteligente (IA)</span>
                  </div>
                  <button
                    onClick={handleSummarize}
                    disabled={isSummarizing || (recordMode === 'free' ? !sessionNotes : !structuredData.subject)}
                    className="text-xs bg-[#6A8164] text-white px-3 py-1.5 rounded-md hover:bg-[#586e53] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSummarizing ? <Loader2 size={12} className="animate-spin" /> : 'Gerar Resumo'}
                  </button>
                </div>

                <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-700 overflow-y-auto shadow-inner">
                  {aiSummary ? (
                    <div className="whitespace-pre-wrap">{aiSummary}</div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center p-4">
                      <Sparkles size={32} className="mb-2 opacity-30" />
                      <p>Clique em "Gerar Resumo" para transformar suas anotações em um registro clínico estruturado.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white rounded-b-xl">
              <button
                onClick={() => setIsNewSessionModalOpen(false)}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSession}
                disabled={isSaving}
                className="px-6 py-2.5 bg-[#6A8164] text-white rounded-lg hover:bg-[#586e53] transition-colors font-medium shadow-sm flex items-center gap-2"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                Salvar Atendimento
              </button>
            </div>
          </div>
        </div>
      )}

      {isAnamnesisModalOpen && selectedPatient && patientAnamnesis && (
        <AnamnesisViewer
          form={patientAnamnesis}
          patientName={`${selectedPatient.firstName} ${selectedPatient.lastName}`}
          onClose={() => setIsAnamnesisModalOpen(false)}
        />
      )}
    </div>
  );
};

export default Records;