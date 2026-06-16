// src/services/deepgramService.ts

// usar any em import.meta.env para evitar erro de tipagem em build
const apiKey = (import.meta.env as any).VITE_DEEPGRAM_API_KEY as string | undefined;

/**
 * Envia um áudio (Blob) para a API do Deepgram e retorna a transcrição em texto.
 */
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  if (!apiKey) {
    throw new Error("VITE_DEEPGRAM_API_KEY não configurada no arquivo .env");
  }

  try {
    const response = await fetch(
      "https://api.deepgram.com/v1/listen?language=pt-BR&model=nova-2&smart_format=true&punctuate=true",
      {
        method: "POST",
        headers: {
          "Authorization": `Token ${apiKey}`,
          "Content-Type": audioBlob.type || "audio/webm",
        },
        body: audioBlob,
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Erro na resposta do Deepgram:", errorData);
      throw new Error(`Erro na API do Deepgram: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extrai o texto da transcrição
    const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
    
    return transcript.trim();
  } catch (error) {
    console.error("Erro ao enviar áudio para o Deepgram:", error);
    throw error;
  }
};
