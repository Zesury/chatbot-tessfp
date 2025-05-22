// Archivo: api/grok.js
// Este archivo maneja las solicitudes a la API de Grok
import fetch from 'node-fetch';

// Función para manejar solicitudes POST
export default async function handler(req, res) {
  // Verificar que sea una solicitud POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    // Extraer la consulta y el contexto del sistema del cuerpo de la solicitud
    const { query, conversationHistory } = req.body;
    if (!query) {      return res.status(400).json({ error: "La consulta es requerida" });
    }

    const apiKey = "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";

    try {
      // Llamar directamente a la API de Groq
      const grokResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "mixtral-8x7b-32768",
          messages: [
            {
              role: "system",
              content: "Eres un asistente virtual del TESSFP. Responde de forma breve y concisa."
            },
            ...(conversationHistory || []).slice(-5),
            {
              role: "user",
              content: query
            }
          ],
          temperature: 0.7,
          max_tokens: 150
        })
      });

      if (!grokResponse.ok) {
        throw new Error(`Error de Groq API: ${grokResponse.status}`);
      }

      const data = await grokResponse.json();

      if (!data.choices?.[0]?.message?.content) {
        throw new Error("Respuesta inválida de Groq");
      }

      return res.status(200).json({
        response: data.choices[0].message.content
      });

    } catch (error) {
      console.error("Error con Groq:", error);
      return res.status(200).json({ 
        response: "Lo siento, estoy teniendo problemas técnicos. ¿Podrías intentar nuevamente?",
        error: true
      });
    }
  } catch (error) {
    console.error("Error general:", error);
    return res.status(500).json({ 
      error: "Error interno del servidor"
    });
  }
}
