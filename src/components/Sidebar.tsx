// src/components/Sidebar.tsx
import React, { useRef, useState } from 'react';
import { Page } from '@/types';
import {
  LayoutDashboard,
  Users,
  FileText,
  BrainCircuit,
  Calendar,
  MessageCircle,
  DollarSign,
  LogOut,
  Download,
  Upload,
  Loader2
} from 'lucide-react';
import { downloadBackupFile, restoreBackupFromString } from '@/services/backupService';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const [backupLoading, setBackupLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const menuItems = [
    { page: Page.DASHBOARD, label: 'Minha página', icon: LayoutDashboard },
    { page: Page.PATIENTS, label: 'Pacientes', icon: Users },
    { page: Page.RECORDS, label: 'Prontuários', icon: FileText },
    { page: Page.AI_ASSISTANT, label: 'Inteligência artificial', icon: BrainCircuit },
    { page: Page.AGENDA, label: 'Agenda', icon: Calendar },
    { page: Page.CONFIRMATIONS, label: 'Confirmações', icon: MessageCircle },
    { page: Page.FINANCIAL, label: 'Financeiro', icon: DollarSign },
  ];

  const handleExport = async () => {
    if (backupLoading) return;
    setBackupLoading(true);
    try {
      await downloadBackupFile('controlepsi-backup.json');
      alert('Backup gerado e baixado com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar backup.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!window.confirm('ATENÇÃO: A importação irá atualizar/adicionar dados existentes no banco de dados. Recomenda-se fazer um backup antes. Deseja continuar?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setBackupLoading(true);
    try {
      const text = await f.text();
      const result = await restoreBackupFromString(text);

      if (result.success) {
        alert(result.message);
        if (window.confirm('Backup restaurado. Deseja recarregar a página para atualizar os dados?')) {
          window.location.reload();
        }
      } else {
        alert(`Erro: ${result.message}\n${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao processar arquivo.');
    } finally {
      setBackupLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <aside className="w-64 bg-[#6A8164] text-white flex flex-col h-screen fixed left-0 top-0 shadow-xl z-50 font-sans">
      <div className="p-6 flex items-center gap-3 mb-4">
        <div className="bg-white/20 p-2 rounded-lg">
          <BrainCircuit size={24} className="text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">ControlePsi</h1>
          <p className="text-[10px] text-green-100 opacity-80 leading-tight max-w-[120px]">Proteção inteligente, uso descomplicado</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = currentPage === item.page;
          const Icon = item.icon;
          return (
            <button
              key={String(item.page)}
              onClick={() => onNavigate(item.page)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium
                ${isActive
                  ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm'
                  : 'text-green-50 hover:bg-white/10 hover:text-white'
                }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 mt-auto space-y-2">
        {/* Backup Controls */}
        <div className="pt-4 border-t border-white/10 mb-2">
          <button
            onClick={handleExport}
            disabled={backupLoading}
            className="w-full flex items-center gap-3 px-4 py-2 text-green-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-xs font-medium"
          >
            {backupLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Exportar Backup
          </button>
          <button
            onClick={handleImportClick}
            disabled={backupLoading}
            className="w-full flex items-center gap-3 px-4 py-2 text-green-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-xs font-medium"
          >
            {backupLoading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Importar Backup
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            className="hidden"
          />
        </div>

        <button className="w-full flex items-center gap-3 px-4 py-3 text-green-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-sm font-medium">
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;