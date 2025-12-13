import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from the root .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Missing Supabase URL or Anon Key in .env file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyConnection() {
    console.log('Verifying Supabase connection...');
    console.log(`URL: ${supabaseUrl}`);

    try {
        // Try to fetch 1 patient just to check connection
        const { data, error } = await supabase
            .from('patients')
            .select('count')
            .limit(1)
            .single();

        if (error) {
            // If table is empty or other error, it might still be connected but query failed
            // But let's check specifically for connection issues
            throw error;
        }

        console.log('✅ Supabase connection successful!');
        console.log('Query result:', data);

    } catch (error: any) {
        console.error('❌ Supabase connection failed or query error.');
        console.error('Error details:', error.message || error);

        // If it's a 404 or similar, it might be the table doesn't exist, but connection is ok.
        // But for "patients" table, it should exist in this app.
    }
}

verifyConnection();
