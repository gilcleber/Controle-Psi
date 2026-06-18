import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, MessageCircle, Trash2, Loader2, Plus, Calendar as CalendarIcon, X, Edit2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { Patient } from '@/types';
import { storage } from '@/services/storage';

interface Appointment {
   id: string;
   date: string; // YYYY-MM-DD
   time?: string; // HH:mm
   patient_id: string;
   patient?: Patient;
   notes?: string;
   status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

const Agenda: React.FC = () => {
   const [view, setView] = useState<'month' | 'week' | 'day'>('month');
   const [currentDate, setCurrentDate] = useState(new Date());
   const [appointments, setAppointments] = useState<Appointment[]>([]);
   const [loading, setLoading] = useState(false);
   const [patients, setPatients] = useState<Patient[]>([]);

   // Modal State
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [editingId, setEditingId] = useState<string | null>(null);
   const [newAppointment, setNewAppointment] = useState({
      patientId: '',
      date: '',
      time: '00:00',
      status: 'pending' as 'pending' | 'confirmed' | 'completed' | 'cancelled',
      isRecurring: false,
      recurrenceWeeks: 4
   });

   const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

   useEffect(() => {
      fetchAppointments();
      loadPatients().then(() => {
         const preSelectedPatientId = localStorage.getItem('selectedPatientId');
         if (preSelectedPatientId) {
            setNewAppointment(prev => ({ ...prev, patientId: preSelectedPatientId }));
            setIsModalOpen(true);
            localStorage.removeItem('selectedPatientId');
         }
      });
   }, [currentDate, view]);

   const loadPatients = async () => {
      const loaded = await storage.getPatients();
      setPatients(loaded);
   };

   const fetchAppointments = async () => {
      setLoading(true);
      try {
         let start, end;

         if (view === 'month') {
            start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
            end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();
         } else if (view === 'week') {
            const day = currentDate.getDay();
            const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(currentDate);
            monday.setDate(diff);
            start = monday.toISOString();
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            end = sunday.toISOString();
         } else {
            start = new Date(currentDate.setHours(0, 0, 0, 0)).toISOString();
            end = new Date(currentDate.setHours(23, 59, 59, 999)).toISOString();
         }

         const { data, error } = await supabase
            .from('sessions')
            .select('*, patient:patients(*)')
            .gte('date', start)
            .lte('date', end);

         if (error) throw error;

         const formatted: Appointment[] = (data || []).map((item: any) => {
            let localDate = item.date;
            let localTime = item.time || '00:00'; // Usa a nova coluna 'time'

            if (item.date.includes('T')) {
               const dateObj = new Date(item.date);
               localDate = dateObj.toLocaleDateString('en-CA');
               // Se não houver a coluna time preenchida, tentamos extrair da data antiga para retrocompatibilidade
               if (!item.time) {
                   localTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
               }
            } else {
               localDate = item.date.split('T')[0];
            }

            return {
               id: item.id,
               date: localDate,
               time: localTime,
            patient_id: item.patient_id,
            patient: item.patient,
            notes: item.notes,
            status: item.status || 'pending'
         };
      });

         setAppointments(formatted);
      } catch (error) {
         console.error('Error fetching appointments:', error);
      } finally {
         setLoading(false);
      }
   };

   const handlePrev = () => {
      const newDate = new Date(currentDate);
      if (view === 'month') newDate.setMonth(newDate.getMonth() - 1);
      else if (view === 'week') newDate.setDate(newDate.getDate() - 7);
      else newDate.setDate(newDate.getDate() - 1);
      setCurrentDate(newDate);
   };

   const handleNext = () => {
      const newDate = new Date(currentDate);
      if (view === 'month') newDate.setMonth(newDate.getMonth() + 1);
      else if (view === 'week') newDate.setDate(newDate.getDate() + 7);
      else newDate.setDate(newDate.getDate() + 1);
      setCurrentDate(newDate);
   };

   const handleSaveAppointment = async () => {
      if (!newAppointment.patientId || !newAppointment.date) {
         alert('Preencha os campos obrigatórios');
         return;
      }

      try {
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) return;

         const sessionsToInsert = [];

         // Base session data
         const baseSession = {
            patient_id: newAppointment.patientId,
            user_id: user.id,
            notes: 'Agendamento',
            status: newAppointment.status,
            time: newAppointment.time // Salva na nova coluna
         };

         if (editingId) {
            // Update existing
            const { error } = await supabase
               .from('sessions')
               .update({
                  ...baseSession,
                  date: newAppointment.date
               })
               .eq('id', editingId);

            if (error) throw error;

         } else {
            // Create new (handle recurrence)
            // Ensure iterations is a valid number, fallback to 1
            const iterations = newAppointment.isRecurring ? (Number(newAppointment.recurrenceWeeks) || 1) : 1;

            if (iterations < 1) {
                throw new Error("Número de semanas inválido");
            }

             for (let i = 0; i < iterations; i++) {
               const date = new Date(`${newAppointment.date}T12:00:00`); // Meio dia para evitar problemas de fuso
               date.setDate(date.getDate() + (i * 7)); // Add weeks

               sessionsToInsert.push({
                  ...baseSession,
                  date: date.toLocaleDateString('en-CA'), // Salva apenas YYYY-MM-DD
                  time: newAppointment.time
               });
            }

            const { error } = await supabase.from('sessions').insert(sessionsToInsert);
            if (error) {
               console.error("Erro Supabase:", error);
               throw error;
            }
         }

         fetchAppointments();
         closeModal();
      } catch (error: any) {
         console.error('Error saving appointment:', error);
         alert(`Erro ao agendar: ${error.message || 'Falha no banco de dados'}`);
      }
   };

   const handleDeleteAppointment = async () => {
      if (!editingId) return;
      if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;

      try {
         const { error } = await supabase.from('sessions').delete().eq('id', editingId);
         if (error) throw error;

         fetchAppointments();
         closeModal();
      } catch (error) {
         console.error('Error deleting appointment:', error);
         alert('Erro ao excluir.');
      }
   };

   const openModal = (appt?: Appointment, selectedDateStr?: string) => {
      if (appt) {
         setEditingId(appt.id);
         setNewAppointment({
            patientId: appt.patient_id,
            date: appt.date,
            time: appt.time || '00:00',
            status: appt.status || 'pending',
            isRecurring: false,
            recurrenceWeeks: 4
         });
      } else {
         setEditingId(null);
         
         // Use selectedDateStr if provided, otherwise today in local timezone (YYYY-MM-DD)
         const defaultDate = selectedDateStr || new Date().toLocaleDateString('en-CA');
         
         setNewAppointment({
            patientId: '',
            date: defaultDate,
            time: '08:00',
            status: 'pending',
            isRecurring: false,
            recurrenceWeeks: 4
         });
      }
      setIsModalOpen(true);
   };

   const closeModal = () => {
      setIsModalOpen(false);
      setEditingId(null);
   };

   const handleWhatsApp = (e: React.MouseEvent, phone: string | undefined, name: string | undefined, date: string, time: string) => {
      e.stopPropagation();
      if (!phone) {
         alert('Cliente sem telefone cadastrado.');
         return;
      }

      const cleanPhone = phone.replace(/\D/g, '');
      const formattedDate = new Date(date).toLocaleDateString('pt-BR');
      const message = `Olá ${name}, confirmando nosso atendimento de terapia para o dia ${formattedDate} às ${time}.`;
      const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;

      window.open(url, '_blank');
   };

   // Calendar Logic
   const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
   const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
   const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

   const patientsWithAppointments = new Set(appointments.map(a => a.patient_id));
   const patientsWithoutAppointments = patients.filter(p => !patientsWithAppointments.has(p.id) && p.status === 'ativo');

   const getStatusColor = (status?: string) => {
      switch (status) {
         case 'confirmed': return 'bg-green-100 text-green-700 border-green-200';
         case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
         case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
         default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      }
   };

   return (
      <div className="p-8 h-full flex flex-col bg-[#f8f9fa] min-h-screen">
         <div className="flex justify-between items-center mb-8">
            <div>
               <h2 className="text-2xl font-bold text-gray-800">Agenda</h2>
               <p className="text-gray-500 text-sm mt-1">Gerencie seus atendimentos e compromissos de maneira prática</p>
            </div>
         </div>

         <div className="flex gap-6 h-full">
            {/* Main Calendar Area */}
            <div className="flex-1 flex flex-col">
               <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-bold text-gray-800 capitalize">
                        {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                     </h3>
                     <div className="flex items-center gap-2">
                        <button onClick={handlePrev} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft size={20} /></button>
                        <button onClick={handleNext} className="p-1 hover:bg-gray-100 rounded"><ChevronRight size={20} /></button>
                        <div className="flex bg-gray-100 rounded-lg p-1 ml-4">
                           <button onClick={() => setView('month')} className={`px-3 py-1 text-sm rounded-md shadow-sm transition-colors ${view === 'month' ? 'bg-[#6A8164] text-white' : 'text-gray-600 hover:text-gray-900'}`}>Mês</button>
                           <button onClick={() => setView('week')} className={`px-3 py-1 text-sm rounded-md shadow-sm transition-colors ${view === 'week' ? 'bg-[#6A8164] text-white' : 'text-gray-600 hover:text-gray-900'}`}>Semana</button>
                           <button onClick={() => setView('day')} className={`px-3 py-1 text-sm rounded-md shadow-sm transition-colors ${view === 'day' ? 'bg-[#6A8164] text-white' : 'text-gray-600 hover:text-gray-900'}`}>Hoje</button>
                        </div>
                     </div>
                  </div>

                  {loading ? (
                     <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="animate-spin text-[#6A8164]" size={32} />
                     </div>
                  ) : view === 'month' ? (
                     <>
                        <div className="grid grid-cols-7 mb-4">
                           {weekDays.map(day => (
                              <div key={day} className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">{day}</div>
                           ))}
                        </div>
                        <div className="grid grid-cols-7 flex-1 gap-4">
                           {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                              <div key={`empty-${i}`} className="min-h-[80px]"></div>
                           ))}
                           {days.map(day => {
                              const dayAppts = appointments.filter(a => {
                                 const parts = a.date.split('-');
                                 return parseInt(parts[2]) === day;
                              });
                              const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

                              return (
                                 <div
                                    key={day}
                                    className="flex flex-col items-center gap-1 min-h-[80px] group cursor-pointer hover:bg-gray-50 rounded-lg transition-colors p-1"
                                    onClick={() => {
                                       const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                       const dateStr = d.toLocaleDateString('en-CA');
                                       openModal(undefined, dateStr);
                                    }}
                                 >
                                    <span className={`text-sm font-medium w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isToday ? 'bg-[#6A8164] text-white' : 'text-gray-500'}`}>
                                       {day}
                                    </span>
                                    <div className="flex flex-col gap-1 w-full px-1">
                                       {dayAppts.map((appt) => (
                                          <div
                                             key={appt.id}
                                             className={`h-1.5 w-full rounded-full ${getStatusColor(appt.status).replace('bg-', 'bg-').split(' ')[0]}`}
                                             title={`${appt.time} - ${appt.patient?.firstName} (${appt.status})`}
                                             onClick={(e) => {
                                                e.stopPropagation();
                                                openModal(appt);
                                             }}
                                          ></div>
                                       ))}
                                    </div>
                                 </div>
                              )
                           })}
                        </div>
                     </>
                  ) : (
                     <div className="flex-1 overflow-y-auto">
                        <div className="grid grid-cols-[60px_1fr] divide-x divide-gray-100">
                           {/* Time Labels */}
                           <div className="pr-2 py-4 space-y-8">
                              {Array.from({ length: 13 }).map((_, i) => {
                                 const hour = i + 8; // Start at 8:00
                                 return (
                                    <div key={hour} className="text-xs text-gray-400 text-right h-12">
                                       {hour}:00
                                    </div>
                                 );
                              })}
                           </div>

                           {/* Grid */}
                           <div className="relative">
                              {/* Header for Week View */}
                              {view === 'week' && (
                                 <div className="grid grid-cols-7 border-b border-gray-100 mb-2 sticky top-0 bg-white z-10">
                                    {weekDays.map((day, index) => {
                                       const d = new Date(currentDate);
                                       const dayDiff = index - d.getDay();
                                       d.setDate(d.getDate() + dayDiff);
                                       const isToday = d.getDate() === new Date().getDate() && d.getMonth() === new Date().getMonth();

                                       return (
                                          <div key={day} className={`text-center py-2 border-b-2 ${isToday ? 'border-[#6A8164] text-[#6A8164]' : 'border-transparent text-gray-500'}`}>
                                             <div className="text-xs font-semibold uppercase">{day}</div>
                                             <div className={`text-sm ${isToday ? 'font-bold' : ''}`}>{d.getDate()}</div>
                                          </div>
                                       );
                                    })}
                                 </div>
                              )}

                              {/* Day View Header */}
                              {view === 'day' && (
                                 <div className="text-center py-2 border-b border-gray-100 mb-2 sticky top-0 bg-white z-10">
                                    <div className="text-sm font-bold text-[#6A8164]">{weekDays[currentDate.getDay()]} {currentDate.getDate()}</div>
                                 </div>
                              )}

                              {/* Time Slots Background */}
                              <div className="absolute inset-0 top-[45px] z-0">
                                 {Array.from({ length: 13 }).map((_, i) => (
                                    <div key={i} className="h-20 border-b border-gray-50 w-full"></div>
                                 ))}
                              </div>

                              {/* Appointments Layer */}
                              <div className="relative z-10 top-[45px] grid grid-cols-1 h-full">
                                 {view === 'week' ? (
                                    <div className="grid grid-cols-7 h-full absolute w-full">
                                       {weekDays.map((_, dayIndex) => {
                                          const dayDate = new Date(currentDate);
                                          const dayDiff = dayIndex - dayDate.getDay();
                                          dayDate.setDate(dayDate.getDate() + dayDiff);
                                          const dateStr = dayDate.toLocaleDateString('en-CA');
                                          const dayAppts = appointments.filter(a => a.date.startsWith(dateStr));

                                          return (
                                             <div key={dayIndex} className="relative h-full border-r border-gray-50 last:border-0"
                                                onClick={() => {
                                                   openModal(undefined, dateStr);
                                                }}
                                             >
                                                {dayAppts.map(appt => {
                                                   const hour = parseInt(appt.time?.split(':')[0] || '0');
                                                   const minute = parseInt(appt.time?.split(':')[1] || '0');
                                                   let visualHour = hour;
                                                   if (visualHour < 8) visualHour = 8;
                                                   if (visualHour > 20) visualHour = 20;
                                                   const top = (visualHour - 8) * 80 + (minute / 60) * 80;

                                                   return (
                                                      <div
                                                         key={appt.id}
                                                         className={`absolute left-1 right-1 border-l-2 p-1 rounded text-[10px] overflow-hidden hover:z-20 hover:shadow-md transition-all cursor-pointer ${getStatusColor(appt.status)}`}
                                                         style={{ top: `${top}px`, height: '70px' }}
                                                         title={`${appt.time} - ${appt.patient?.firstName}`}
                                                         onClick={(e) => {
                                                            e.stopPropagation();
                                                            openModal(appt);
                                                         }}
                                                      >
                                                         <div className="font-bold">{appt.time}</div>
                                                         <div className="truncate">{appt.patient?.firstName}</div>
                                                         <div className="absolute bottom-1 right-1">
                                                            <button
                                                               onClick={(e) => handleWhatsApp(e, appt.patient?.phone, appt.patient?.firstName, appt.date, appt.time || '00:00')}
                                                               className="p-0.5 hover:bg-green-100 text-green-600 rounded-full transition-colors"
                                                               title="Confirmar via WhatsApp"
                                                            >
                                                               <MessageCircle size={12} />
                                                            </button>
                                                         </div>
                                                      </div>
                                                   );
                                                })}
                                             </div>
                                          );
                                       })}
                                    </div>
                                 ) : (
                                    <div className="relative h-full w-full">
                                       {appointments.filter(a => a.date.startsWith(currentDate.toISOString().split('T')[0])).map(appt => {
                                          const hour = parseInt(appt.time?.split(':')[0] || '0');
                                          const minute = parseInt(appt.time?.split(':')[1] || '0');
                                          let visualHour = hour;
                                          if (visualHour < 8) visualHour = 8;
                                          if (visualHour > 20) visualHour = 20;
                                          const top = (visualHour - 8) * 80 + (minute / 60) * 80;

                                          return (
                                             <div
                                                key={appt.id}
                                                className={`absolute left-2 right-2 border-l-4 p-2 rounded text-xs overflow-hidden hover:shadow-md transition-all cursor-pointer flex justify-between items-start ${getStatusColor(appt.status)}`}
                                                style={{ top: `${top}px`, height: '70px' }}
                                                onClick={(e) => {
                                                   e.stopPropagation();
                                                   openModal(appt);
                                                }}
                                             >
                                                <div>
                                                   <div className="font-bold text-sm">{appt.time}</div>
                                                   <div className="font-medium">{appt.patient?.firstName} {appt.patient?.lastName}</div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                   <div className="text-[10px] bg-white/50 px-1.5 py-0.5 rounded uppercase font-bold tracking-wide">
                                                      {appt.status === 'pending' ? 'Pendente' :
                                                         appt.status === 'confirmed' ? 'Confirmado' :
                                                            appt.status === 'completed' ? 'Concluído' : 'Cancelado'}
                                                   </div>
                                                   <button
                                                      onClick={(e) => handleWhatsApp(e, appt.patient?.phone, appt.patient?.firstName, appt.date, appt.time || '00:00')}
                                                      className="p-1 hover:bg-green-100 text-green-600 rounded-full transition-colors"
                                                      title="Confirmar via WhatsApp"
                                                   >
                                                      <MessageCircle size={14} />
                                                   </button>
                                                </div>
                                             </div>
                                          );
                                       })}
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>
                  )}
               </div>

               {/* Bottom Section: Patients without appointments */}
               <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h4 className="font-bold text-gray-800 mb-4 text-sm">Clientes ativos sem agendamento</h4>
                  <div className="space-y-2">
                     {patientsWithoutAppointments.slice(0, 3).map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#A8B5A6] text-white flex items-center justify-center text-xs font-bold">
                                 {p.firstName[0]}{p.lastName[0]}
                              </div>
                              <span className="text-sm font-medium text-gray-700">{p.firstName} {p.lastName}</span>
                           </div>
                           <button
                              onClick={() => {
                                 setNewAppointment(prev => ({ ...prev, patientId: p.id }));
                                 setIsModalOpen(true);
                              }}
                              className="text-xs flex items-center gap-1 text-gray-500 hover:text-[#6A8164] bg-white border border-gray-200 px-3 py-1.5 rounded-md transition-colors"
                           >
                              <CalendarIcon size={14} /> Agendar
                           </button>
                        </div>
                     ))}
                     {patientsWithoutAppointments.length === 0 && (
                        <p className="text-sm text-gray-400 text-center">Todos os clientes ativos possuem agendamento.</p>
                     )}
                  </div>
               </div>
            </div>

            {/* Right Sidebar: Meus Clientes */}
            <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-fit">
               <h3 className="font-bold text-gray-800 mb-4">Meus clientes</h3>
               <button
                  onClick={() => openModal()}
                  className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 mb-6 font-medium"
               >
                  <Plus size={16} /> Novo atendimento
               </button>

               <div className="space-y-4">
                  {patients.slice(0, 5).map(p => (
                     <div key={p.id} className="flex items-center gap-3 group cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                        <div className="w-8 h-8 rounded-full bg-[#8CA386] text-white flex items-center justify-center text-xs font-bold">
                           {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div>
                           <p className="text-sm font-medium text-gray-800">{p.firstName} {p.lastName}</p>
                           <p className="text-xs text-gray-500">R$ {p.sessionPrice},00</p>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div >

         {/* Modal Agendar Atendimento */}
         {
            isModalOpen && (
               <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                  <div className="bg-white rounded-xl w-full max-w-md shadow-2xl animate-fade-in">
                     <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-800">
                           {editingId ? 'Editar Atendimento' : 'Agendar Atendimento'}
                        </h3>
                        <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                           <X size={20} />
                        </button>
                     </div>
                     <div className="p-6 space-y-4">
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1.5">Cliente:</label>
                           <select
                              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent bg-white"
                              value={newAppointment.patientId}
                              onChange={(e) => setNewAppointment({ ...newAppointment, patientId: e.target.value })}
                           >
                              <option value="">Selecione o cliente</option>
                              {patients.map(p => (
                                 <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                              ))}
                           </select>
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1.5">Data e Hora</label>
                           <div className="flex gap-2">
                              <input
                                 type="date"
                                 className="flex-1 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent"
                                 value={newAppointment.date}
                                 onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                              />
                              <input
                                 type="time"
                                 className="w-24 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent"
                                 value={newAppointment.time}
                                 onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                              />
                           </div>
                        </div>

                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                           <select
                              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent bg-white"
                              value={newAppointment.status}
                              onChange={(e) => setNewAppointment({ ...newAppointment, status: e.target.value as any })}
                           >
                              <option value="pending">Pendente</option>
                              <option value="confirmed">Confirmado</option>
                              <option value="completed">Concluído</option>
                              <option value="cancelled">Cancelado</option>
                           </select>
                        </div>

                        {!editingId && (
                           <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                 <input
                                    type="checkbox"
                                    id="recurring"
                                    className="rounded border-gray-300 text-[#6A8164] focus:ring-[#6A8164]"
                                    checked={newAppointment.isRecurring}
                                    onChange={(e) => setNewAppointment({ ...newAppointment, isRecurring: e.target.checked })}
                                 />
                                 <label htmlFor="recurring" className="text-sm text-gray-600">Repetir semanalmente</label>
                              </div>
                              {newAppointment.isRecurring && (
                                 <div className="flex items-center gap-2 text-sm text-gray-600 pl-6">
                                    <span>Por</span>
                                    <input
                                       type="number"
                                       min="1"
                                       max="12"
                                       value={newAppointment.recurrenceWeeks}
                                       onChange={(e) => setNewAppointment({ ...newAppointment, recurrenceWeeks: parseInt(e.target.value) })}
                                       className="w-16 border border-gray-300 rounded p-1 text-center"
                                    />
                                    <span>semanas</span>
                                 </div>
                              )}
                           </div>
                        )}
                     </div>
                     <div className="p-6 bg-gray-50 flex justify-between items-center rounded-b-xl">
                        {editingId ? (
                           <button
                              onClick={handleDeleteAppointment}
                              className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1"
                           >
                              <Trash2 size={16} /> Excluir
                           </button>
                        ) : <div></div>}

                        <div className="flex gap-3">
                           {editingId && (
                              <button
                                 onClick={(e) => {
                                    const appt = appointments.find(a => a.id === editingId);
                                    if (appt) handleWhatsApp(e, appt.patient?.phone, appt.patient?.firstName, appt.date, appt.time || '00:00')
                                 }}
                                 className="px-3 py-2 border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium flex items-center gap-2"
                              >
                                 <MessageCircle size={16} /> Confirmar
                              </button>
                           )}
                           <button
                              onClick={closeModal}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors text-sm font-medium"
                           >
                              Cancelar
                           </button>
                           <button
                              onClick={handleSaveAppointment}
                              className="px-6 py-2 bg-[#6A8164] text-white rounded-lg hover:bg-[#586e53] transition-colors text-sm font-medium shadow-sm"
                           >
                              Salvar
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            )
         }
      </div >
   );
};

export default Agenda;