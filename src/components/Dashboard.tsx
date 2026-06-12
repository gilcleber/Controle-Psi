import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DollarSign, Calendar, RefreshCw, Loader2, Download } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({
    income: 0,
    receivable: 0,
    sessions: 0,
    reschedules: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);

  // Date Filters
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchDashboardData();
  }, [dateFilter]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Transactions for Income (Filtered by Date)
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, type, date')
        .eq('user_id', user.id)
        .gte('date', dateFilter.startDate)
        .lte('date', dateFilter.endDate);

      // 2. Fetch Sessions (Filtered by Date)
      const { data: sessions } = await supabase
        .from('sessions')
        .select('date')
        .eq('user_id', user.id)
        .gte('date', dateFilter.startDate)
        .lte('date', dateFilter.endDate);

      // Calculate KPIs
      let totalIncome = 0;
      let totalExpense = 0;

      transactions?.forEach(t => {
        if (t.type === 'income') totalIncome += Number(t.amount);
        if (t.type === 'expense') totalExpense += Number(t.amount);
      });

      const totalSessions = sessions?.length || 0;

      setKpi({
        income: totalIncome,
        receivable: totalExpense,
        sessions: totalSessions,
        reschedules: 0 // Placeholder as we don't have reschedule tracking yet
      });

      // Prepare Chart Data (Group by Day within range)
      // For simplicity, we'll show the last 7 days of the selected range or the whole range if small
      // Let's just show the days present in the data to avoid huge empty charts
      const dataMap = new Map();

      transactions?.forEach(t => {
        const date = t.date;
        if (!dataMap.has(date)) dataMap.set(date, { date, income: 0, sessions: 0 });
        if (t.type === 'income') {
          const entry = dataMap.get(date);
          entry.income += Number(t.amount);
        }
      });

      sessions?.forEach(s => {
        const date = s.date.split('T')[0];
        if (!dataMap.has(date)) dataMap.set(date, { date, income: 0, sessions: 0 });
        const entry = dataMap.get(date);
        entry.sessions += 1;
      });

      const chart = Array.from(dataMap.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(item => ({
          name: item.date.split('-').slice(1).reverse().join('/'), // DD/MM
          income: item.income,
          sessions: item.sessions
        }));

      setChartData(chart);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-[#6A8164]" size={48} />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in bg-background min-h-screen">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-gray-500 text-sm mt-1">Acompanhe seus indicadores financeiros e de atendimento</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-600 shadow-sm">
            <input
              type="date"
              value={dateFilter.startDate}
              onChange={e => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
              className="outline-none text-gray-600 bg-transparent cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-600 shadow-sm">
            <input
              type="date"
              value={dateFilter.endDate}
              onChange={e => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
              className="outline-none text-gray-600 bg-transparent cursor-pointer"
            />
          </div>
          <button
            onClick={() => {
              const headers = ['Data', 'Faturamento', 'Sessões'];
              const csvContent = [
                headers.join(','),
                ...chartData.map(row => `${row.name},${row.income},${row.sessions}`)
              ].join('\n');

              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.setAttribute('href', url);
              link.setAttribute('download', `dashboard_export_${dateFilter.startDate}_${dateFilter.endDate}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <Download size={16} />
            Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Faturamento</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-0.5">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpi.income)}
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Despesas</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-0.5">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpi.receivable)}
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Sessões</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-0.5">{kpi.sessions}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
            <RefreshCw size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Reagendamentos</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-0.5">{kpi.reschedules}</h3>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-base font-bold text-gray-800 mb-6">Faturamentos (R$)</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="income" fill="#6A8164" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-base font-bold text-gray-800 mb-6">Sessões</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="sessions" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;