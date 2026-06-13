import { Patient } from '@/types';
import { supabase } from './supabaseClient';

// Helper to get current user ID
const getUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
};

export const storage = {
  getPatients: async (): Promise<Patient[]> => {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching patients:', error);
      return [];
    }

    // Map snake_case from DB to camelCase for frontend
    return (data || []).map((p: any) => ({
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      cpf: p.cpf,
      phone: p.phone,
      email: p.email,
      status: p.status,
      sessionPrice: p.session_price,
      birthDate: p.birth_date,
      religion: p.religion,
      medication: p.medication,
      sessionLink: p.session_link
    }));
  },

  savePatients: async (patients: Patient[]) => {
    console.warn('savePatients is deprecated in favor of direct DB calls');
  },

  addPatient: async (patient: Patient) => {
    const userId = await getUserId();

    // Map camelCase to snake_case for DB
    const dbPatient = {
      first_name: patient.firstName,
      last_name: patient.lastName,
      cpf: patient.cpf,
      phone: patient.phone,
      email: patient.email,
      status: patient.status,
      session_price: patient.sessionPrice,
      birth_date: patient.birthDate,
      religion: patient.religion,
      medication: patient.medication,
      session_link: patient.sessionLink,
      user_id: userId
    };

    const { data, error } = await supabase
      .from('patients')
      .insert([dbPatient])
      .select()
      .single();

    if (error) {
      console.error('Error adding patient:', error);
      throw error;
    }
    return data;
  },

  updatePatient: async (updatedPatient: Patient) => {
    // Map camelCase to snake_case for DB
    const dbPatient = {
      first_name: updatedPatient.firstName,
      last_name: updatedPatient.lastName,
      cpf: updatedPatient.cpf,
      phone: updatedPatient.phone,
      email: updatedPatient.email,
      status: updatedPatient.status,
      session_price: updatedPatient.sessionPrice,
      birth_date: updatedPatient.birthDate,
      religion: updatedPatient.religion,
      medication: updatedPatient.medication,
      session_link: updatedPatient.sessionLink
    };

    const { data, error } = await supabase
      .from('patients')
      .update(dbPatient)
      .eq('id', updatedPatient.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating patient:', error);
      throw error;
    }
    return data;
  },

  deletePatient: async (id: string) => {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting patient:', error);
      throw error;
    }
  }
};
