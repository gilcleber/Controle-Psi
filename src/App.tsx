// App.tsx
import React, { useState } from 'react';
import { Page } from '@/types';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import Patients from '@/components/Patients';
import Records from '@/components/Records';
import Agenda from '@/components/Agenda';
import Financials from '@/components/Financials';
import Confirmations from '@/components/Confirmations';
import AiAssistant from '@/components/AiAssistant';
import Login from '@/components/Login';
import AdminPanel from '@/components/AdminPanel';
import LicenseLockScreen from '@/components/LicenseLockScreen';
import ProfileCompletion from '@/components/ProfileCompletion';
import DocumentGenerator from './components/DocumentGenerator';
import AnamnesisForm from './components/AnamnesisForm';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { BrainCircuit, LogOut } from 'lucide-react';

// Header Component
const Header = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-white h-16 border-b border-secondary-light flex items-center justify-between px-8 shadow-sm">
      <div className="flex items-center gap-2 text-primary-dark">
        <BrainCircuit size={20} />
        <span className="font-semibold text-text-light text-sm">ControlePsi</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-light">Olá, <span className="font-bold text-text-main">{user?.email?.split('@')[0]}</span></span>
        <div className="w-8 h-8 rounded-full bg-primary-dark text-white flex items-center justify-center font-bold text-sm">
          {user?.email?.[0].toUpperCase()}
        </div>
        <button onClick={signOut} className="ml-2 text-gray-400 hover:text-red-500 transition-colors" title="Sair">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};

const AuthenticatedApp: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);

  const renderContent = () => {
    switch (currentPage) {
      case Page.DASHBOARD:
        return <Dashboard />;
      case Page.PATIENTS:
        return <Patients onNavigate={setCurrentPage} />;
      case Page.RECORDS:
        return <Records />;
      case Page.AI_ASSISTANT:
        return <AiAssistant />;
      case Page.AGENDA:
        return <Agenda />;
      case Page.CONFIRMATIONS:
        return <Confirmations />;
      case Page.FINANCIAL:
        return <Financials />;
      case Page.DOCUMENTS:
        return <DocumentGenerator />;
      case Page.ADMIN:
        return <AdminPanel />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background font-sans text-text-main">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />

      <div className="ml-64 flex-1 flex flex-col h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto relative">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

const AppContent = () => {
  const { user, loading, license } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7F5]">
        <div className="animate-spin text-[#6A8164]">
          <BrainCircuit size={48} />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Admin Bypass
  const adminEmails = ['gilcleberproducoes@gmail.com', 'gilcleberlocutor@gmail.com'];
  const isAdmin = user.email && adminEmails.includes(user.email);

  // Check License
  const isExpired = license?.expiration_date && new Date(license.expiration_date) < new Date();
  const hasActiveLicense = license && license.status === 'active' && !isExpired;

  if (!isAdmin && !hasActiveLicense) {
    return <LicenseLockScreen />;
  }

  return (
    <>
      <ProfileCompletion />
      <AuthenticatedApp />
    </>
  );
};

const App: React.FC = () => {
  if (window.location.pathname === '/anamnese') {
    return <AnamnesisForm />;
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;