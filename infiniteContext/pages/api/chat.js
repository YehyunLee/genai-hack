import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb' // Increase this value based on your needs
    }
  }
};

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const modelResponse = (model, message) => {
    switch (model) {
        case 'gemini':
            return geminiResponse(message);
        default:
            return geminiResponse(message);
    }
}

const geminiResponse = async (message) => {
  try {
    const result = await model.generateContent(message);
    const response = await result.response;
    return response.text();

    // print full text history for debugging
    console.log('Full text history:', response.text_history);
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

const cohereResponse = async (message) => {
    const response = "...";
    return response;
}

// Process text by word count
const processLongText = (text, chunk_size=50) => {
    // Split text into words and group them into chunks
    const words = text.split(/\s+/);
    const chunks = [];
    
    for (let i = 0; i < words.length; i += chunk_size) {
        const chunk = words.slice(i, i + chunk_size).join(' ');
        chunks.push({
            chunk,
            summary: `${chunk} (word count: ${words.slice(i, i + chunk_size).length})`
        });
    }
    
    return chunks;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, mode } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (Buffer.byteLength(JSON.stringify(req.body)) > 10 * 1024 * 1024) { // 10MB check
      return res.status(413).json({ error: 'Request entity too large' });
    }

    if (mode === 'infinite') {
      // Handle infinite context mode
      const chunks = processLongText(message);
      const combinedResponse = chunks.map(c => c.summary).join('\n');
      
      return res.status(200).json({
        response: `Infinite Context Processing Results:\n${combinedResponse}`,
        chunks: chunks,
        mode: 'infinite'
      });
    } else {
      try {
        const response = await modelResponse('gemini', message);
        return res.status(200).json({
          response: response,
          mode: 'default'
        });
      } catch (error) {
        console.error('Model Error:', error);
        return res.status(500).json({ 
          error: 'Model processing error',
          details: error.message 
        });
      }
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}