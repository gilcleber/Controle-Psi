import React, { useState, useEffect } from 'react';
import { Plus, Download, Loader2, Trash2, Calendar, Search, ChevronDown, X, Edit2 } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { storage } from '@/services/storage';
import { Patient } from '@/types';

interface Transaction {
   id: string;
   description: string;
   amount: number;
   type: 'income' | 'expense';
   date: string;
   category?: string;
   patient_id?: string;
   payment_method?: string;
   status: string;
   patient?: Patient;
}

const Financials: React.FC = () => {
   const [transactions, setTransactions] = useState<Transaction[]>([]);
   const [loading, setLoading] = useState(true);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [patients, setPatients] = useState<Patient[]>([]);
   const [editingId, setEditingId] = useState<string | null>(null);

   // Date Filter State
   const [dateFilter, setDateFilter] = useState({
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
   });

   // Form State
   const [formData, setFormData] = useState({
      description: '',
      amount: '',
      type: 'income' as 'income' | 'expense',
      date: new Date().toISOString().split('T')[0],
      patient_id: '',
      payment_method: 'Pix'
   });

   useEffect(() => {
      fetchTransactions();
      loadPatients().then(() => {
         const preSelectedPatientId = localStorage.getItem('selectedPatientId');
         if (preSelectedPatientId) {
            setFormData(prev => ({ ...prev, patient_id: preSelectedPatientId }));
            setIsModalOpen(true);
            localStorage.removeItem('selectedPatientId');
         }
      });
   }, [dateFilter]);

   const loadPatients = async () => {
      const loaded = await storage.getPatients();
      setPatients(loaded);
   };

   const fetchTransactions = async () => {
      setLoading(true);
      try {
         const { data, error } = await supabase
            .from('transactions')
            .select('*, patient:patients(*)')
            .gte('date', dateFilter.startDate)
            .lte('date', dateFilter.endDate)
            .order('date', { ascending: false });

         if (error) throw error;
         setTransactions(data || []);
      } catch (error) {
         console.error('Error fetching transactions:', error);
      } finally {
         setLoading(false);
      }
   };

   const handleSave = async () => {
      if (!formData.description || !formData.amount) {
         alert('Descrição e valor são obrigatórios');
         return;
      }

      try {
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) return;

         const transactionData = {
            description: formData.description,
            amount: Number(formData.amount),
            type: formData.type,
            date: formData.date,
            patient_id: formData.patient_id || null,
            payment_method: formData.payment_method,
            user_id: user.id,
            status: 'paid'
         };

         if (editingId) {
            const { error } = await supabase
               .from('transactions')
               .update(transactionData)
               .eq('id', editingId);
            if (error) throw error;
         } else {
            const { error } = await supabase.from('transactions').insert([transactionData]);
            if (error) throw error;
         }

         await fetchTransactions();
         closeModal();
      } catch (error) {
         console.error('Error saving transaction:', error);
         alert('Erro ao salvar transação.');
      }
   };

   const handleDelete = async (id: string) => {
      if (!confirm('Tem certeza que deseja excluir esta transação?')) return;
      try {
         const { error } = await supabase.from('transactions').delete().eq('id', id);
         if (error) throw error;
         await fetchTransactions();
      } catch (error) {
         console.error('Error deleting transaction:', error);
         alert('Erro ao excluir transação.');
      }
   };

   const handleEdit = (t: Transaction) => {
      setEditingId(t.id);
      setFormData({
         description: t.description,
         amount: t.amount.toString(),
         type: t.type,
         date: t.date.split('T')[0],
         patient_id: t.patient_id || '',
         payment_method: t.payment_method || 'Pix'
      });
      setIsModalOpen(true);
   };

   const closeModal = () => {
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({
         description: '',
         amount: '',
         type: 'income',
         date: new Date().toISOString().split('T')[0],
         patient_id: '',
         payment_method: 'Pix'
      });
   };

   // Calculate Totals
   const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
   const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
   const balance = income - expense;

   return (
      <div className="p-8 h-full flex flex-col bg-[#f8f9fa] min-h-screen animate-fade-in">
         <div className="flex justify-between items-end mb-8">
            <div>
               <h2 className="text-2xl font-bold text-gray-800">Financeiro</h2>
               <p className="text-gray-500 text-sm mt-1">Gerencie suas finanças e acompanhe receitas e despesas</p>
            </div>
            <div className="flex items-end gap-4">
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Data Inicial</label>
                  <input
                     type="date"
                     className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#6A8164] focus:border-transparent outline-none"
                     value={dateFilter.startDate}
                     onChange={e => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  />
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Data Final</label>
                  <input
                     type="date"
                     className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#6A8164] focus:border-transparent outline-none"
                     value={dateFilter.endDate}
                     onChange={e => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  />
               </div>
               <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-[#6A8164] hover:bg-[#586e53] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-sm font-medium h-[42px]"
               >
                  <Plus size={18} />
                  Nova transação
               </button>
            </div>
         </div>

         <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <p className="text-sm text-gray-500 font-medium mb-2">Receitas</p>
               <h3 className="text-3xl font-bold text-green-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(income)}
               </h3>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <p className="text-sm text-gray-500 font-medium mb-2">Despesas</p>
               <h3 className="text-3xl font-bold text-red-500">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense)}
               </h3>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <p className="text-sm text-gray-500 font-medium mb-2">Saldo</p>
               <h3 className={`text-3xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
               </h3>
            </div>
         </div>

         <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
               <h3 className="text-lg font-bold text-gray-800">Transações</h3>
               <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 px-4 py-2 border border-gray-200 rounded-lg transition-colors">
                  <Download size={16} /> Exportar
               </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
               {loading ? (
                  <div className="flex items-center justify-center h-full">
                     <Loader2 className="animate-spin text-[#6A8164]" size={32} />
                  </div>
               ) : transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                     <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                        <Calendar size={32} className="text-gray-300" />
                     </div>
                     <p>Ainda não houve nenhuma transação neste período</p>
                  </div>
               ) : (
                  <table className="w-full text-left">
                     <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                        <tr>
                           <th className="px-6 py-4 rounded-l-lg">Data</th>
                           <th className="px-6 py-4">Descrição</th>
                           <th className="px-6 py-4">Paciente</th>
                           <th className="px-6 py-4">Método</th>
                           <th className="px-6 py-4 text-right">Valor</th>
                           <th className="px-6 py-4 rounded-r-lg text-center">Ações</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                        {transactions.map((t) => (
                           <tr key={t.id} className="hover:bg-gray-50 group transition-colors">
                              <td className="px-6 py-4 text-sm text-gray-600">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                              <td className="px-6 py-4 text-sm text-gray-800 font-medium">{t.description}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                 {t.patient ? `${t.patient.firstName} ${t.patient.lastName}` : '-'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                 <span className="px-2.5 py-1 bg-gray-100 rounded-md text-xs font-medium">{t.payment_method || 'Outro'}</span>
                              </td>
                              <td className={`px-6 py-4 text-sm font-bold text-right ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                                 {t.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(t.amount))}
                              </td>
                              <td className="px-6 py-4 text-center">
                                 <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                       onClick={() => handleEdit(t)}
                                       className="text-gray-400 hover:text-[#6A8164] p-2 hover:bg-green-50 rounded-full transition-colors"
                                       title="Editar"
                                    >
                                       <Edit2 size={16} />
                                    </button>
                                    <button
                                       onClick={() => handleDelete(t.id)}
                                       className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"
                                       title="Excluir"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               )}
            </div>
         </div>

         {/* Modal Nova Transação */}
         {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
               <div className="bg-white rounded-xl w-full max-w-md shadow-2xl animate-fade-in">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                     <h3 className="text-lg font-bold text-gray-800">
                        {editingId ? 'Editar transação' : 'Nova transação'}
                     </h3>
                     <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                     </button>
                  </div>
                  <div className="p-6 space-y-5">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de transação</label>
                        <div className="flex gap-6">
                           <label className="flex items-center gap-2 cursor-pointer group">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${formData.type === 'income' ? 'border-[#6A8164]' : 'border-gray-300 group-hover:border-[#6A8164]'}`}>
                                 {formData.type === 'income' && <div className="w-3 h-3 rounded-full bg-[#6A8164]" />}
                              </div>
                              <input
                                 type="radio"
                                 name="type"
                                 className="hidden"
                                 checked={formData.type === 'income'}
                                 onChange={() => setFormData({ ...formData, type: 'income' })}
                              />
                              <span className="text-sm text-gray-700">Entrada</span>
                           </label>
                           <label className="flex items-center gap-2 cursor-pointer group">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${formData.type === 'expense' ? 'border-red-500' : 'border-gray-300 group-hover:border-red-500'}`}>
                                 {formData.type === 'expense' && <div className="w-3 h-3 rounded-full bg-red-500" />}
                              </div>
                              <input
                                 type="radio"
                                 name="type"
                                 className="hidden"
                                 checked={formData.type === 'expense'}
                                 onChange={() => setFormData({ ...formData, type: 'expense' })}
                              />
                              <span className="text-sm text-gray-700">Saída</span>
                           </label>
                        </div>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Paciente (opcional)</label>
                        <div className="relative">
                           <select
                              className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent bg-white appearance-none"
                              value={formData.patient_id}
                              onChange={e => setFormData({ ...formData, patient_id: e.target.value })}
                           >
                              <option value="">Selecione um paciente</option>
                              <option value="">Nenhum</option>
                              {patients.map(p => (
                                 <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                              ))}
                           </select>
                           <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
                        <input
                           type="text"
                           className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent"
                           placeholder="Ex: Pagamento de atendimento"
                           value={formData.description}
                           onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor</label>
                        <div className="relative">
                           <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                           <input
                              type="number"
                              className="w-full border border-gray-300 rounded-lg p-2.5 pl-7 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent"
                              placeholder="0,00"
                              value={formData.amount}
                              onChange={e => setFormData({ ...formData, amount: e.target.value })}
                           />
                        </div>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Data</label>
                        <input
                           type="date"
                           className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent"
                           value={formData.date}
                           onChange={e => setFormData({ ...formData, date: e.target.value })}
                        />
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Método de pagamento</label>
                        <div className="relative">
                           <select
                              className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent bg-white appearance-none"
                              value={formData.payment_method}
                              onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                           >
                              <option value="Pix">Pix</option>
                              <option value="Dinheiro">Dinheiro</option>
                              <option value="Cartão de crédito">Cartão de crédito</option>
                              <option value="Cartão de débito">Cartão de débito</option>
                              <option value="Transferência">Transferência</option>
                              <option value="Outro">Outro</option>
                           </select>
                           <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>
                     </div>
                  </div>
                  <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                     <button
                        onClick={closeModal}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white border border-gray-300 rounded-lg transition-colors"
                     >
                        Cancelar
                     </button>
                     <button
                        onClick={handleSave}
                        className="px-6 py-2 text-sm font-medium bg-[#6A8164] text-white rounded-lg hover:bg-[#586e53] shadow-sm transition-colors"
                     >
                        Salvar
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default Financials;