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

const systemPromptForEachChunk = "Initial user's message was too long to process in a single request. The message has been divided into smaller chunks and processed individually. You are in chunk #{{chunk_number}} / {{total_chunks}}. You can assume other chunks are similar to this one. You do not need to do an introduction or greeting in this chunk. Just start answer directly from the context of this chunk. You will be given 1) what the user has asked to do in the beginning of the chunk, and 2) the chunk of text. Here is the user's request: {{user_request}}. Here is the chunk of text: {{chunk_text}}. Please continue the conversation from this context.";

const modelResponse = (model, message, images, imageType) => {
  switch (model) {
    case 'gemini':
      return geminiResponse(message, images, imageType);
    default:
      return geminiResponse(message, images, imageType);
  }
}

const geminiResponse = async (message, imageChunk, imageChunkType) => {
  try {
    if (!(imageChunk == null)) {
        const imageParts = [
          {
            inlineData: {
              data: imageChunk,
              mimeType: imageChunkType
            }
          }
        ]
        const result = await model.generateContent([message, ...imageParts]);
        const response = await result.response;
        return response.text();
    }
    const result = await model.generateContent(message);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

const cohereResponse = async (message) => {
  const response = "...";
  return response;
}

const processLongContent = async (text, images, userRequest, chunkSize = 500) => {
  const chunks = [];
  let totalChunks;
  let chunkNumber;

  if (text) {
    const words = text.split(/\s+/);
    totalChunks = Math.ceil(words.length / chunkSize) + (images ? images.length : 0);

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunkText = words.slice(i, i + chunkSize).join(' ');
      chunkNumber = Math.floor(i / chunkSize) + 1;

      const prompt = systemPromptForEachChunk
        .replace('{{chunk_number}}', chunkNumber)
        .replace('{{total_chunks}}', totalChunks)
        .replace('{{user_request}}', userRequest)
        .replace('{{chunk_text}}', chunkText);

      chunks.push({
        prompt,
        chunkText,
        chunkData: null,
        chunkDataType: null,
        chunkNumber,
        totalChunks
      });
    }
  }

  if (images) {
    totalChunks = (text ? Math.ceil(text.split(/\s+/).length / chunkSize) : 0) + images.length;
    images.forEach((image, index) => {
      chunkNumber = (text ? Math.ceil(text.split(/\s+/).length / chunkSize) : 0) + index + 1;

      const prompt = systemPromptForEachChunk
        .replace('{{chunk_number}}', chunkNumber)
        .replace('{{total_chunks}}', totalChunks)
        .replace('{{user_request}}', userRequest)
        .replace('{{chunk_text}}', ''); // No text for image chunks

      chunks.push({
        prompt,
        chunkData: image.inlineData.data,
        chunkDataType: image.inlineData.mimeType,
        chunkNumber,
        totalChunks
      });
    });
  }

  console.log(chunks);

  return chunks;
};

const processChunks = async (chunks, res) => {
  const encoder = new TextEncoder();
  const completedChunks = {};
  let errorCount = 0;

  const chunkPromises = chunks.map(async chunk => {
    try {


      const response = await modelResponse('gemini', chunk.prompt, chunk.chunkData, chunk.chunkDataType);

      const chunkResult = {
        ...chunk,
        response,
        error: null,
        status: 'complete'
      };


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
    const { message, mode, fullText, images } = req.body;

    if (mode === 'infinite') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
      });

      const chunks = await processLongContent(fullText, images, message);

      await processChunks(chunks, res);
      res.end();
    } else {
      const response = await modelResponse('gemini', message, images);
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