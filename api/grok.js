import { put } from '@vercel/blob';
import fetch from 'node-fetch';

// Configuración de las APIs
const GROQ_API_KEY = process.env.GROQ_API_KEY || "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";
const XAI_API_KEY = process.env.XAI_API_KEY || "xai-38kYctXtEJwrJ54b69WgnsbbiASNk45N1LXg5k2zAcCADbR6xSGzGqoxmGbvUNPsN4Lgzn2H71JLAobU";
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || "vercel_blob_rw_L82hdoDFYNj7XW4o_sxw6YvKhMJ7j7ELRD7oKB8HB8fhzXj";

// Habilitar CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export default async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    return res.end();
  }

  // Add CORS headers to all responses
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { query, system, useModel = 'grok' } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'La consulta es requerida' });
    }

    let response;
    
    try {
      if (useModel === 'groq') {
        const grokResponse = await fetch("https://api.groq.com/v1/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: "deepseek-r1-distill-llama-70b",
            prompt: query,
            max_tokens: 1000
          })
        });
        
        if (!grokResponse.ok) {
          throw new Error(`Error from Groq API: ${grokResponse.status}`);
        }
        
        const data = await grokResponse.json();
        response = data.choices[0].text;
      } else {
        const xaiResponse = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${XAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "grok-2-1212",
            messages: [
              {
                role: "system",
                content: system || "Eres un asistente virtual del TESSFP. Responde de forma clara y concisa."
              },
              {
                role: "user",
                content: query
              }
            ]
          })
        });
        
        if (!xaiResponse.ok) {
          throw new Error(`Error from XAI API: ${xaiResponse.status}`);
        }
        
        const data = await xaiResponse.json();
        response = data.choices[0].message.content;
      }

      // Guardar la conversación en Blob storage
      try {
        const conversation = {
          timestamp: new Date().toISOString(),
          query,
          response,
          model: useModel
        };
        
        const { url } = await put(
          `conversations/${Date.now()}.json`,
          JSON.stringify(conversation),
          { 
            access: 'public',
            token: BLOB_READ_WRITE_TOKEN
          }
        );
        
        return res.status(200).json({
          response: response,
          savedAt: url
        });
      } catch (blobError) {
        console.error('Error al guardar en Blob:', blobError);
        // Si falla el guardado en Blob, enviamos solo la respuesta
        return res.status(200).json({ response });
      }
    } catch (aiError) {
      console.error('Error al procesar la IA:', aiError);
      return res.status(500).json({
        error: 'Error al procesar la respuesta de IA',
        details: aiError.message
      });
    }
  } catch (error) {
    console.error('Error general:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
}
