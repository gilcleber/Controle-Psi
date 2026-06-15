import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    console.log("Testing direct insert...");
    const { data, error } = await supabase.from('anamnesis_forms').insert([{
        patient_id: '01df44fa-2e6a-4934-bc2c-5b65103a4cd1',
        template_id: '01df44fa-2e6a-4934-bc2c-5b65103a4cd1',
        status: 'completed',
        answers: {}
    }]);
    console.log("Data:", data);
    console.log("Error:", error);
}
test();
