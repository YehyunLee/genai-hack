import { GoogleGenerativeAI } from '@google/generative-ai';
import { EventEmitter } from 'events';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb' // Increase this value based on your needs
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
const systemPromptForEachChunk = "Initial user's message was too long to process in a single request. The message has been divided into smaller chunks and processed individually. You are in chunk #{{chunk_number}} / {{total_chunks}}. You can assume other chunks are similar to this one. You do not need to do an introduction or greeting in this chunk. Just start answer directly from the context of this chunk. You will be given 1) what the user has asked to do in the beginning of the chunk, and 2) the chunk of text. Here is the user's request: {{user_request}}. Here is the chunk of text: {{chunk_text}}. Please continue the conversation from this context. Note you can use markdown to format your response. Latext is not supported, so don't use $$. Use ```...`` to create a block, for math, code or to highlight important parts of your response.";

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


const processLongContent = async (text, userRequest, images, video, chunkSize = 500) => {
  const chunks = [];
  let totalChunks;
  let chunkNumber = 0;

  // Calculate total chunks first
  const textChunksCount = text ? Math.ceil(text.split(/\s+/).length / chunkSize) : 0;
  const imageChunksCount = (images && Array.isArray(images)) ? images.length : 0;
  const videoChunksCount = (video && video.screenshots) ? video.screenshots.length : 0;
  totalChunks = textChunksCount + imageChunksCount + videoChunksCount;

  // Process text chunks
  if (text) {
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length; i += chunkSize) {
      chunkNumber++;
      const chunkText = words.slice(i, i + chunkSize).join(' ');
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

  // Process image chunks
  if (images && Array.isArray(images) && images.length > 0) {
    images.forEach((image) => {
      chunkNumber++;
      const prompt = systemPromptForEachChunk
        .replace('{{chunk_number}}', chunkNumber)
        .replace('{{total_chunks}}', totalChunks)
        .replace('{{user_request}}', userRequest)
        .replace('{{chunk_text}}', '');

      chunks.push({
        prompt,
        chunkData: image.inlineData.data,
        chunkDataType: image.inlineData.mimeType,
        chunkNumber,
        totalChunks
      });
    });
  }

  // Process video chunks
  if (video && video.screenshots) {
    video.screenshots.forEach((screenshot, index) => {
      chunkNumber++;
      const framePosition = ['beginning', 'middle', 'end'][index];
      const prompt = `${userRequest}\n\nAnalyze this frame taken from the ${framePosition} of the video ${video.fileName || ''}. What do you observe in this particular moment?`;

      chunks.push({
        prompt,
        chunkData: screenshot.split(',')[1], // Remove data URL prefix
        chunkDataType: 'image/jpeg',
        chunkNumber,
        totalChunks
      });
    });
  }

  return chunks;
};


// Modify processChunks to use streaming response
const processChunks = async (chunks, res) => {
  const encoder = new TextEncoder();
  const completedChunks = {};
  let errorCount = 0;
  let allResponses = [];

  const chunkPromises = chunks.map(async chunk => {
    try {
      const response = await modelResponse('gemini', chunk.prompt, chunk.chunkData, chunk.chunkDataType);
      allResponses.push(response);
      
      // Only escape necessary characters, don't escape newlines
      const safeResponse = response.replace(/\\/g, '\\\\')
                                 .replace(/"/g, '\\"');

      const chunkResult = {
        chunkNumber: chunk.chunkNumber,
        totalChunks: chunk.totalChunks,
        response: safeResponse,
        error: null,
        status: 'complete'
      };

      const chunkData = JSON.stringify({
        type: 'chunk',
        data: chunkResult
      }) + '\n';
      
      res.write(encoder.encode(chunkData));
      await res.flush?.();
      
      return chunkResult;
    } catch (error) {
      errorCount++;
      console.error(`Error processing chunk ${chunk.chunkNumber}:`, error);
      
      const errorData = JSON.stringify({
        type: 'chunk',
        data: {
          chunkNumber: chunk.chunkNumber,
          totalChunks: chunk.totalChunks,
          response: '',
          error: error.message.replace(/"/g, '\\"'),
          status: 'error'
        }
      }) + '\n';
      
      res.write(encoder.encode(errorData));
      await res.flush?.();

      // Only throw if it's a rate limit error
      if (error.message.toLowerCase().includes('429') ||
          error.message.toLowerCase().includes('too many requests')) {
        throw error;
      }
      
      return null;
    }
  });

  try {
    const results = await Promise.allSettled(chunkPromises);
    
    // Send final status with proper JSON encoding
    const completeData = JSON.stringify({
      type: 'complete',
      data: {
        totalProcessed: results.length,
        errorCount
      }
    }) + '\n';
    
    res.write(encoder.encode(completeData));
    
    return {
      results: results.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean),
      errorCount,
      totalCount: chunks.length
    };
  } catch (error) {
    // Send error with proper JSON encoding
    const errorData = JSON.stringify({
      type: 'error',
      data: {
        message: 'Rate limit reached',
        error: error.message.replace(/"/g, '\\"')
      }
    }) + '\n';
    
    res.write(encoder.encode(errorData));
    throw error;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, mode, fullText, images, video} = req.body;
    
    if (mode === 'infinite') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
      });

      console.log(video, 'video');  // empty
      const chunks = await processLongContent(fullText, message, images, video);
      console.log(chunks, 'chunks'); 
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