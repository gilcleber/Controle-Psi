-- Migração Supabase para Anamnese V2 (Modelos Dinâmicos e Submissão Pública)

-- 1. Tabela de Modelos de Formulário (Form Templates)
CREATE TABLE IF NOT EXISTS public.form_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    accent_color TEXT DEFAULT '#6A8164',
    fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Políticas RLS para form_templates
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

-- Terapeutas podem gerenciar seus próprios modelos
CREATE POLICY "Therapists can manage their own templates" 
    ON public.form_templates
    FOR ALL 
    USING (auth.uid() = user_id);

-- O público (pacientes) pode ler modelos ativos para preencher (precisamos do ID do modelo na URL)
CREATE POLICY "Public can view active templates" 
    ON public.form_templates
    FOR SELECT 
    USING (is_active = true);


-- 2. Atualização da tabela anamnesis_forms existente
-- Vamos adicionar uma coluna de JSONB para respostas dinâmicas e o ID do modelo
ALTER TABLE public.anamnesis_forms 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.form_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;


-- 3. Função (RPC) segura para criar Paciente + Anamnese de uma vez só via formulário público
-- SECURITY DEFINER permite que o script rode com privilégios de bypass RLS, essencial para acesso público.
CREATE OR REPLACE FUNCTION public.submit_public_anamnesis(
    p_therapist_id UUID,
    p_template_id UUID,
    p_patient_data JSONB,
    p_anamnesis_answers JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_patient_id UUID;
    v_form_id UUID;
BEGIN
    -- Verificar se o paciente já existe (pelo email ou CPF, associado a este terapeuta)
    SELECT id INTO v_patient_id 
    FROM public.patients 
    WHERE user_id = p_therapist_id 
      AND (
          (p_patient_data->>'email' IS NOT NULL AND email = p_patient_data->>'email') 
          OR 
          (p_patient_data->>'cpf' IS NOT NULL AND cpf = p_patient_data->>'cpf')
      )
    LIMIT 1;

    -- Se não existe, cria um novo paciente
    IF v_patient_id IS NULL THEN
        INSERT INTO public.patients (
            user_id, 
            first_name, 
            last_name, 
            email, 
            phone, 
            cpf, 
            birth_date,
            status
        ) VALUES (
            p_therapist_id,
            p_patient_data->>'first_name',
            p_patient_data->>'last_name',
            p_patient_data->>'email',
            p_patient_data->>'phone',
            p_patient_data->>'cpf',
            p_patient_data->>'birth_date',
            'ativo'
        ) RETURNING id INTO v_patient_id;
    END IF;

    -- Cria o registro da Anamnese vinculado ao paciente
    INSERT INTO public.anamnesis_forms (
        patient_id,
        user_id,
        template_id,
        status,
        answers,
        is_read,
        completed_at
    ) VALUES (
        v_patient_id,
        p_therapist_id,
        p_template_id,
        'completed',
        p_anamnesis_answers,
        false,
        NOW()
    ) RETURNING id INTO v_form_id;

    RETURN jsonb_build_object('success', true, 'patient_id', v_patient_id, 'form_id', v_form_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
