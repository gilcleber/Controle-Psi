import React, { useState, useEffect } from 'react';
import { Patient, Page } from '@/types';
import { storage } from '@/services/storage';
import { Plus, Search, Edit2, Trash2, FileText, Calendar, DollarSign } from 'lucide-react';

interface PatientsProps {
  onNavigate?: (page: Page) => void;
}

const Patients: React.FC<PatientsProps> = ({ onNavigate }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');

  // Form state
  const [formData, setFormData] = useState<Partial<Patient>>({
    firstName: '',
    lastName: '',
    cpf: '',
    phone: '',
    email: '',
    status: 'ativo',
    sessionPrice: 0,
    birthDate: '',
    religion: '',
    medication: '',
    sessionLink: ''
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const loadedPatients = await storage.getPatients();
      setPatients(loadedPatients);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.firstName || !formData.lastName) {
      alert('Nome e Sobrenome são obrigatórios');
      return;
    }

    try {
      if (editingPatient) {
        const updated: Patient = {
          ...editingPatient,
          ...formData as Patient
        };
        await storage.updatePatient(updated);
      } else {
        const newPatient: Patient = {
          id: crypto.randomUUID(),
          ...formData as Patient,
          sessionPrice: formData.sessionPrice || 150
        };
        await storage.addPatient(newPatient);
      }

      await loadPatients();
      closeModal();
    } catch (error) {
      alert('Erro ao salvar cliente. Tente novamente.');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        await storage.deletePatient(id);
        await loadPatients();
      } catch (error) {
        alert('Erro ao excluir cliente.');
      }
    }
  };

  const openModal = (patient?: Patient) => {
    if (patient) {
      setEditingPatient(patient);
      setFormData(patient);
    } else {
      setEditingPatient(null);
      setFormData({
        firstName: '',
        lastName: '',
        cpf: '',
        phone: '',
        email: '',
        status: 'ativo',
        sessionPrice: 150,
        birthDate: '',
        religion: '',
        medication: '',
        sessionLink: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPatient(null);
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch = `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = activeTab === 'active' ? p.status === 'ativo' : p.status !== 'ativo';
    return matchesSearch && matchesStatus;
  });

  const handleNavigateTo = (page: Page) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col bg-[#f8f9fa] min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Meus clientes</h2>
          <p className="text-gray-500 text-sm mt-1">Gerencie seus clientes e visualize informações importantes</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-[#6A8164] hover:bg-[#586e53] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-sm font-medium"
        >
          <Plus size={18} />
          Adicionar cliente
        </button>
      </div>

      <div className="flex gap-4 mb-8">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${activeTab === 'active' ? 'bg-white border border-gray-200 text-gray-800 shadow-sm' : 'bg-transparent text-gray-500 hover:bg-gray-100'}`}
          >
            Clientes ativos
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">{patients.filter(p => p.status === 'ativo').length}</span>
          </button>
          <button
            onClick={() => setActiveTab('inactive')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'inactive' ? 'bg-white border border-gray-200 text-gray-800 shadow-sm' : 'bg-transparent text-gray-500 hover:bg-gray-100'}`}
          >
            Clientes inativos
          </button>
        </div>
        <div className="flex-1 flex justify-end">
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Buscar nome de clientes"
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8164] focus:border-transparent bg-white shadow-sm text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          </div>
        </div>
      </div>

      {patients.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          Nenhum cliente cadastrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-4">
          {filteredPatients.map((patient) => (
            <div key={patient.id} className="bg-white p-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{patient.firstName} {patient.lastName}</h3>
                  <p className="text-xs text-gray-500 mt-1">CPF: {patient.cpf || 'Não informado'}</p>
                  <p className="text-xs text-gray-500">Telefone: {patient.phone || 'Não informado'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openModal(patient)} className="text-gray-400 hover:text-[#6A8164] transition-colors"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(patient.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {patient.status === 'ativo' && <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-[10px] uppercase tracking-wide rounded-full font-bold">ativo</span>}
                {patient.status === 'inativo' && <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-[10px] uppercase tracking-wide rounded-full font-bold">inativo</span>}
                {patient.status === 'retorno' && <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] uppercase tracking-wide rounded-full font-bold">retorno</span>}
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-between text-xs font-medium text-gray-500">
                <button 
                  onClick={() => {
                    localStorage.setItem('selectedPatientId', patient.id);
                    handleNavigateTo(Page.RECORDS);
                  }} 
                  className="flex items-center gap-2 hover:text-[#6A8164] transition-colors"
                >
                  <FileText size={14} /> Prontuário
                </button>
                <button 
                  onClick={() => {
                    localStorage.setItem('selectedPatientId', patient.id);
                    handleNavigateTo(Page.AGENDA);
                  }} 
                  className="flex items-center gap-2 hover:text-[#6A8164] transition-colors"
                >
                  <Calendar size={14} /> Agendar
                </button>
                <button 
                  onClick={() => {
                    localStorage.setItem('selectedPatientId', patient.id);
                    handleNavigateTo(Page.FINANCIAL);
                  }} 
                  className="flex items-center gap-2 hover:text-[#6A8164] transition-colors"
                >
                  <DollarSign size={14} /> Financeiro
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">{editingPatient ? 'Editar cliente' : 'Novo cliente'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-8 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent transition-all"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Sobrenome</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent transition-all"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">CPF</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent transition-all"
                    placeholder="000.000.000-00"
                    value={formData.cpf}
                    onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Data de Nascimento</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent transition-all"
                    value={formData.birthDate || ''}
                    onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Celular</label>
                  <input
                    type="tel"
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent transition-all"
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Religião</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent transition-all"
                    value={formData.religion || ''}
                    onChange={e => setFormData({ ...formData, religion: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Medicação</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent transition-all"
                    placeholder="Não definida"
                    value={formData.medication || ''}
                    onChange={e => setFormData({ ...formData, medication: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Link para atendimento</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent transition-all"
                    placeholder="Cole aqui o link"
                    value={formData.sessionLink || ''}
                    onChange={e => setFormData({ ...formData, sessionLink: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 items-center">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor por atendimento (R$)</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#6A8164] focus:border-transparent transition-all"
                    value={formData.sessionPrice}
                    onChange={e => setFormData({ ...formData, sessionPrice: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-3 mt-6">
                  <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input type="checkbox" name="toggle" id="toggle" className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" checked={formData.status === 'ativo'} onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'ativo' : 'inativo' })} />
                    <label htmlFor="toggle" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${formData.status === 'ativo' ? 'bg-[#6A8164]' : 'bg-gray-300'}`}></label>
                  </div>
                  <label htmlFor="toggle" className="text-sm text-gray-700">Cliente ativo: {formData.status === 'ativo' ? 'sim' : 'não'}</label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <div className="flex gap-2">
                  {['ativo', 'em pausa', 'finalizado', 'novo', 'retorno'].map(tag => (
                    <button key={tag} className="px-3 py-1 rounded-full border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors font-medium"
              >
                Sair sem salvar
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-[#6A8164] text-white rounded-lg hover:bg-[#586e53] transition-colors font-medium shadow-sm"
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

export default Patients;