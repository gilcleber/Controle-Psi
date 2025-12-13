// src/services/backupService.ts
import { supabase } from './supabaseClient';

export type BackupPackage = {
    app: 'ControlePsi';
    version: string;
    createdAt: string;
    data: {
        patients: any[];
        sessions: any[];
        transactions: any[];
        session_records: any[];
    };
};

export async function createBackup(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Fetch all data
    const { data: patients } = await supabase.from('patients').select('*').eq('user_id', user.id);
    const { data: sessions } = await supabase.from('sessions').select('*').eq('user_id', user.id);
    const { data: transactions } = await supabase.from('transactions').select('*').eq('user_id', user.id);
    const { data: session_records } = await supabase.from('session_records').select('*').eq('user_id', user.id);

    const pkg: BackupPackage = {
        app: 'ControlePsi',
        version: '1.0',
        createdAt: new Date().toISOString(),
        data: {
            patients: patients || [],
            sessions: sessions || [],
            transactions: transactions || [],
            session_records: session_records || []
        }
    };

    return JSON.stringify(pkg, null, 2);
}

export async function downloadBackupFile(filename = 'controlepsi-backup.json') {
    try {
        const json = await createBackup();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Erro ao gerar backup:', error);
        alert('Erro ao gerar backup. Verifique o console.');
    }
}

export async function restoreBackupFromString(fileContent: string): Promise<{ success: boolean; message: string; errors: string[] }> {
    const errors: string[] = [];

    try {
        const parsed = JSON.parse(fileContent) as BackupPackage;

        if (parsed.app !== 'ControlePsi' || !parsed.data) {
            return { success: false, message: 'Arquivo inválido ou incompatível.', errors: ['Formato inválido'] };
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, message: 'Usuário não autenticado.', errors: ['Sem usuário'] };

        // Helper to upsert data
        const restoreTable = async (table: string, rows: any[]) => {
            if (!rows.length) return;
            // Ensure user_id is correct (security)
            const rowsWithUser = rows.map(r => ({ ...r, user_id: user.id }));

            const { error } = await supabase.from(table).upsert(rowsWithUser, { onConflict: 'id' });
            if (error) {
                errors.push(`Erro na tabela ${table}: ${error.message}`);
            }
        };

        // Restore in order (patients first due to foreign keys if any, though Supabase might handle deferred checks, better safe)
        await restoreTable('patients', parsed.data.patients);
        await restoreTable('sessions', parsed.data.sessions);
        await restoreTable('transactions', parsed.data.transactions);
        await restoreTable('session_records', parsed.data.session_records);

        if (errors.length > 0) {
            return { success: false, message: 'Backup restaurado com alguns erros.', errors };
        }

        return { success: true, message: 'Backup restaurado com sucesso!', errors: [] };

    } catch (error) {
        return { success: false, message: 'Erro ao processar arquivo.', errors: [String(error)] };
    }
}