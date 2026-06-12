// src/services/geminiService.ts
import { GoogleGenAI } from "@google/genai";

/**
 * Serviço para chamar a Gemini (Google GenAI).
 *
 * A chave da API deve estar no arquivo .env como: VITE_GEMINI_API_KEY=sua_chave_aqui
 * (opcional) Se não tiver a chave, a função devolve um texto de fallback.
 */

// usar any em import.meta.env para evitar erro de tipagem em build
const apiKey = (import.meta.env as any).VITE_GEMINI_API_KEY as string | undefined;

let ai: GoogleGenAI | null = null;
if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.error("Erro ao inicializar GoogleGenAI:", err);
    ai = null;
  }
} else {
  console.warn("VITE_GEMINI_API_KEY não está definida. Chamadas à IA usarão fallback.");
}

/**
 * Gera um resumo a partir das notas brutas.
 * Retorna mensagem amigável em caso de erro ou ausência de chave.
 */
export const summarizeSessionNotes = async (rawNotes: string): Promise<string> => {
  if (!ai) {
    console.warn("summarizeSessionNotes: cliente de IA não disponível, retornando fallback.");
    return "Resumo não disponível (API key não configurada).";
  }

  try {
    const response: any = await ai.models.generateContent({
      model: "gemini-1.5-flash", // Modelo rápido e econômico
      contents: `
Você é um assistente de IA especializado em psicologia e documentação clínica.
Sua tarefa é ler as anotações brutas de uma sessão de terapia abaixo e criar um resumo clínico profissional, conciso e estruturado (formato SOAP ou similar, mas focado em resumo).
Mantenha um tom formal e objetivo.

Anotações brutas:
"${rawNotes}"
      `,
      config: {
        maxOutputTokens: 500,
        temperature: 0.3,
      },
    });

    // Robust parsing logic
    if (!response) return "Não foi possível gerar o resumo (resposta vazia).";

    // 1. Direct text property (some SDK versions)
    if (typeof response.text === "function") {
      try {
        const text = response.text();
        if (text) return text.trim();
      } catch (e) { /* ignore */ }
    }
    if (typeof response.text === "string" && response.text.trim()) {
      return response.text.trim();
    }

    // 2. Candidates array (standard API response)
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];

      // Try candidate.content.parts[0].text
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const part = candidate.content.parts[0];
        if (part.text) return part.text.trim();
      }

      // Try candidate.output (older/other formats)
      if (typeof candidate.output === 'string') return candidate.output.trim();
    }

    console.warn("Gemini Response Structure (Unexpected):", JSON.stringify(response, null, 2));
    return "Resumo não disponível (formato de resposta inesperado).";

  } catch (error) {
    console.error("Erro ao resumir sessão (summarizeSessionNotes):", error);
    return "Falha ao gerar resumo (erro de conexão com a IA).";
  }
};