import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    console.log("Calling RPC with full data...");
    const { data, error } = await supabase.rpc('submit_public_anamnesis', {
        p_therapist_id: '01df44fa-2e6a-4934-bc2c-5b65103a4cd1', // need a valid uuid format, but it might just fail with "therapist not found" or something
        p_template_id: '01df44fa-2e6a-4934-bc2c-5b65103a4cd1',
        p_patient_data: { 
            first_name: "gil cleber", 
            last_name: "santos", 
            email: "gilcleberlocutor@gmail.com",
            phone: "19991511288",
            cpf: "19424165803",
            birth_date: "1973-02-23" // value from date picker
        },
        p_anamnesis_answers: {
            "7": "teste",
            "8": "teste",
            "9": "teste",
            "10": "teste"
        }
    });
    console.log("Data:", data);
    console.log("Error:", error);
}
test();
