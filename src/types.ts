export enum Page {
    DASHBOARD = 'dashboard',
    PATIENTS = 'patients',
    RECORDS = 'records',
    AI_ASSISTANT = 'ai_assistant',
    AGENDA = 'agenda',
    CONFIRMATIONS = 'confirmations',
    FINANCIAL = 'financial',
    TEMPLATES = 'templates',
    ADMIN = 'admin',
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
    birthDate?: string;
    religion?: string;
    medication?: string;
    sessionLink?: string;
}

export interface SessionRecord {
    id: string;
    patientId: string;
    date: string;
    notes: string;
    summary?: string;
    tags?: string[];
}

export interface Appointment {
    id: string;
    date: string;
    time?: string;
    patient_id: string;
    patient?: Patient;
    notes?: string;
    status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

export interface UserLicense {
    user_id: string;
    email: string;
    status: 'pending' | 'active' | 'blocked';
    expiration_date?: string;
    created_at: string;
}