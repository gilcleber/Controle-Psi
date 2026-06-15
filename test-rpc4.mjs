import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    console.log("Calling RPC omitting birth_date...");
    const { data, error } = await supabase.rpc('submit_public_anamnesis', {
        p_therapist_id: 'bad3dd9f-4bca-49cb-aa2d-509b7281558b',
        p_template_id: 'bad3dd9f-4bca-49cb-aa2d-509b7281558b',
        p_patient_data: { first_name: "gil", last_name: "cleber", email: "test@test.com" },
        p_anamnesis_answers: { birth_date: "1973-02-23", "7": "teste" }
    });
    console.log("Data:", data);
    console.log("Error:", error);
}
test();
