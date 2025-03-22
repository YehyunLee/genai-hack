import { GoogleGenerativeAI } from '@google/generative-ai';
import { EventEmitter } from 'events';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb' // Increase this value based on your needs
    },
    responseLimit: false
  }
};

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

// Working on hackathaton MVP project for infinite context window. We will support almost infinite context window by dividing up the text into chunk of texts and process individiaully calling LLM API and merge everything later. Ex) 10m tokens of input -> divide into 10 of 1m tokens -> call LLM parallel -> merge.

// This is prompt that will be added at the beginning of each chunk of text
// Each chunk will be processed individually (with empty context) and then merged together.
const systemPromptForEachChunk = "Initial user's message was too long to process in a single request. The message has been divided into smaller chunks and processed individually. You are in chunk #{{chunk_number}} / {{total_chunks}}. You can assume other chunks are similar to this one. You do not need to do an introduction or greeting in this chunk. Just start answer directly from the context of this chunk. You will be given 1) what the user has asked to do in the beginning of the chunk, and 2) the chunk of text. Here is the user's request: {{user_request}}. Here is the chunk of text: {{chunk_text}}. Please continue the conversation from this context.";

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

// Process text by token count (rough estimate)
const processLongText = async (text, userRequest, chunkSize = 500) => {
  // Rough estimate of tokens (words * 1.3)
  const words = text.split(/\s+/);
  const chunks = [];
  const totalChunks = Math.ceil(words.length / chunkSize);
  
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunkText = words.slice(i, i + chunkSize).join(' ');
    const chunkNumber = Math.floor(i / chunkSize) + 1;
    
    const prompt = systemPromptForEachChunk
      .replace('{{chunk_number}}', chunkNumber)
      .replace('{{total_chunks}}', totalChunks)
      .replace('{{user_request}}', userRequest)
      .replace('{{chunk_text}}', chunkText);
    
    chunks.push({
      prompt,
      chunkText,
      chunkNumber,
      totalChunks
    });
  }
  
  return chunks;
};

// Modify processChunks to use streaming response
const processChunks = async (chunks, res) => {
  const encoder = new TextEncoder();
  const completedChunks = {};
  let errorCount = 0;

  // Process all chunks in parallel
  const chunkPromises = chunks.map(async chunk => {
    try {
      const response = await modelResponse('gemini', chunk.prompt);
      const chunkResult = {
        ...chunk,
        response,
        error: null,
        status: 'complete'
      };

      // Stream result immediately
      const data = encoder.encode(JSON.stringify({
        type: 'chunk',
        data: chunkResult
      }) + '\n');
      
      res.write(data);
      await res.flush();
      
      return chunkResult;
    } catch (error) {
      errorCount++;
      console.error(`Error processing chunk ${chunk.chunkNumber}:`, error);
      
      // Only throw if it's a rate limit error
      if (error.message.toLowerCase().includes('429') || 
          error.message.toLowerCase().includes('too many requests')) {
        throw error;
      }
      
      return {
        ...chunk,
        response: `Error processing chunk ${chunk.chunkNumber}: ${error.message}`,
        error: error.message,
        status: 'error'
      };
    }
  });

  try {
    const results = await Promise.allSettled(chunkPromises);
    
    // Send final status
    res.write(encoder.encode(JSON.stringify({
      type: 'complete',
      data: {
        totalProcessed: results.length,
        errorCount
      }
    }) + '\n'));
    
    return {
      results: results.map(r => r.status === 'fulfilled' ? r.value : r.reason),
      errorCount,
      totalCount: chunks.length
    };
  } catch (error) {
    // If we hit rate limits, return what we have so far
    res.write(encoder.encode(JSON.stringify({
      type: 'error',
      data: {
        message: 'Rate limit reached',
        error: error.message
      }
    }) + '\n'));
    throw error;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, mode, fullText } = req.body;
    
    if (mode === 'infinite' && fullText) {
      // Set up streaming response
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
      });
      
      const chunks = await processLongText(fullText, message);
      await processChunks(chunks, res);
      
      res.end();
    } else {
      // Regular chat mode
      const response = await modelResponse('gemini', message);
      return res.status(200).json({
        response,
        mode: 'default'
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}