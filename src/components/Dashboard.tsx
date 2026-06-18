import React, { useEffect, useState } from 'react';
import { Calendar, Clock, User, CheckCircle, Clock3, CalendarDays, ArrowRight } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';

interface DashboardSession {
  id: string;
  date: string;
  time: string;
  status: string;
  patient: {
    firstName: string;
    lastName: string;
    phone: string;
  };
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [todaySessions, setTodaySessions] = useState<DashboardSession[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<DashboardSession[]>([]);
  const [unreadAnamnesis, setUnreadAnamnesis] = useState<number>(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      const localTodayDate = today.toLocaleDateString('en-CA');

      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 15); // Next 15 days
      const localFutureDate = futureDate.toLocaleDateString('en-CA');

      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('id, date, time, status, patient:patients(first_name, last_name, phone)')
        .eq('user_id', user.id)
        .gte('date', localTodayDate)
        .lte('date', localFutureDate + 'T23:59:59')
        .order('date', { ascending: true });

      if (error) {
          console.error("Supabase error:", error);
      }

      const { count, error: anamnesisError } = await supabase
        .from('anamnesis_forms')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      if (!anamnesisError) {
          setUnreadAnamnesis(count || 0);
      }

      const todayList: DashboardSession[] = [];
      const upcomingList: DashboardSession[] = [];

      (sessions || []).forEach((s: any) => {
        // Tratar snake_case do cliente (supabase)
        const patientData = {
            firstName: s.patient?.first_name || '',
            lastName: s.patient?.last_name || '',
            phone: s.patient?.phone || ''
        };

        let localDate = s.date;
        let localTime = s.time || '00:00';

        if (s.date.includes('T')) {
            const dateObj = new Date(s.date);
            localDate = dateObj.toLocaleDateString('en-CA');
            if (!s.time) {
               localTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            }
        }
        
        const sessionObj = {
          id: s.id,
          date: localDate,
          time: localTime,
          status: s.status || 'pending',
          patient: patientData
        };

        if (localDate === localTodayDate) {
          todayList.push(sessionObj);
        } else {
          upcomingList.push(sessionObj);
        }
      });

      todayList.sort((a, b) => a.time.localeCompare(b.time));
      upcomingList.sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());

      setTodaySessions(todayList);
      setUpcomingSessions(upcomingList);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
      try {
          const { error } = await supabase.from('sessions').update({ status: newStatus }).eq('id', id);
          if (error) throw error;
          
          // Update local state without full refetch for better UX
          setTodaySessions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
          setUpcomingSessions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
      } catch (err) {
          console.error("Erro ao atualizar status:", err);
          alert("Erro ao atualizar o status do agendamento.");
      }
  };

  const renderStatusDropdown = (session: DashboardSession) => {
    const bgColors = {
        'confirmed': 'bg-green-100 text-green-700',
        'completed': 'bg-blue-100 text-blue-700',
        'cancelled': 'bg-red-100 text-red-700',
        'pending': 'bg-yellow-100 text-yellow-700'
    };
    const currentColor = bgColors[session.status as keyof typeof bgColors] || bgColors.pending;

    return (
        <select 
            value={session.status}
            onChange={(e) => handleStatusChange(session.id, e.target.value)}
            className={`px-3 py-1 text-xs rounded-full font-medium border border-transparent cursor-pointer hover:border-gray-300 focus:ring-0 ${currentColor} outline-none text-center transition-colors`}
        >
            <option value="pending" className="bg-white text-gray-800">Pendente</option>
            <option value="confirmed" className="bg-white text-gray-800">Confirmado</option>
            <option value="completed" className="bg-white text-gray-800">Concluído</option>
            <option value="cancelled" className="bg-white text-gray-800">Cancelado</option>
        </select>
    );
  };

  const formatDateBR = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6A8164]"></div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in bg-background min-h-screen">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Minha Página</h2>
          <p className="text-gray-500 text-sm mt-1">Acompanhe seus atendimentos do dia e próximos compromissos</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
            <CalendarDays size={18} className="text-[#6A8164]" />
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {unreadAnamnesis > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
                <div className="bg-green-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm relative">
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                    {unreadAnamnesis}
                </div>
                <div>
                    <h3 className="text-green-800 font-bold text-lg">Nova Ficha Recebida!</h3>
                    <p className="text-green-600 text-sm">Você tem {unreadAnamnesis} {unreadAnamnesis === 1 ? 'ficha de anamnese nova aguardando' : 'fichas de anamnese novas aguardando'} leitura.</p>
                </div>
            </div>
            <a href="/?page=records" className="bg-white text-green-700 hover:bg-green-100 border border-green-200 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
                Ir para Prontuários
            </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Atendimentos de Hoje */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                    <Clock size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Atendimentos Hoje</h3>
            </div>
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">{todaySessions.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {todaySessions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <CheckCircle size={40} className="mb-3 opacity-30 text-green-500" />
                    <p>Você não tem atendimentos agendados para hoje.</p>
                </div>
            ) : (
                todaySessions.map((session) => (
                    <div key={session.id} className="p-4 rounded-lg border border-gray-100 hover:border-green-200 hover:shadow-md transition-all bg-gray-50/50 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-[#6A8164] text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
                                {session.patient.firstName?.[0]}{session.patient.lastName?.[0]}
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800">{session.patient.firstName} {session.patient.lastName}</h4>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                    <Clock3 size={14} />
                                    <span className="font-medium">{session.time}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {renderStatusDropdown(session)}
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>

        {/* Próximos Atendimentos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <Calendar size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Próximos Agendamentos</h3>
            </div>
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">{upcomingSessions.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {upcomingSessions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <CalendarDays size={40} className="mb-3 opacity-30" />
                    <p>Nenhum atendimento agendado para os próximos dias.</p>
                </div>
            ) : (
                upcomingSessions.map((session) => (
                    <div key={session.id} className="p-4 rounded-lg border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all bg-white flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm">
                                {session.patient.firstName?.[0]}{session.patient.lastName?.[0]}
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm">{session.patient.firstName} {session.patient.lastName}</h4>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                    <span className="text-[#6A8164] font-medium">{formatDateBR(session.date)}</span>
                                    <span>•</span>
                                    <span>{session.time}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {renderStatusDropdown(session)}
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;