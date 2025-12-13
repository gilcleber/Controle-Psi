export enum Page {
    DASHBOARD = 'dashboard',
    PATIENTS = 'patients',
    RECORDS = 'records',
    AI_ASSISTANT = 'ai_assistant',
    AGENDA = 'agenda',
    CONFIRMATIONS = 'confirmations',
    FINANCIAL = 'financial',
}

export interface Patient {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    cpf: string;
    status: 'ativo' | 'inativo' | 'retorno';
    sessionPrice: number;
}

export interface SessionRecord {
    id: string;
    patientId: string;
    date: string;
    notes: string;
    summary?: string;
    tags?: string[];
}