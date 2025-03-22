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
  const response = await model.generate(message);
  return response;
}

const cohereResponse = async (message) => {
    const response = "...";
    return response;
}

// Simulated chunk processing
const processLongText = (text, chunk_size=100) => {
    // Simulate splitting text into chunks
    // const chunks = text.match(/.{1,100}/g) || [];
    const chunks = text.match(new RegExp(`.{1,${chunk_size}}`, 'g')) || [];
    return chunks.map(chunk => ({
        chunk,
        summary: `Processed chunk of size ${chunk.length}`
    }));
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

    try {
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
      //   // Default chat mode with length limit
      //   if (message.length > 500) {
      //     return res.status(400).json({
      //       error: 'Message too long for default mode. Use infinite context mode.',
      //       mode: 'default'
      //     });
      //   }
        return res.status(200).json({
          // response: `Default chat response to: "${message.substring(0, 50)}..."`,
          response: `Default chat response to: "${message}"`,
          mode: 'default'
        });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}