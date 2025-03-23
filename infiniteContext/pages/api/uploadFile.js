import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { processFile } from './_fileProcessors';
import os from 'os';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tempDir = os.tmpdir();
    const form = formidable({
      uploadDir: tempDir,
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024,
      filter: function ({ mimetype }) {
        return mimetype && (mimetype.includes('pdf') || mimetype.includes('image'));
      },
    });

    // Parse the form with error handling
    const [fields, files] = await new Promise((resolve, reject) => {
      try {
        form.parse(req, (err, fields, files) => {
          if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              reject(new Error('File is too large (max 50MB)'));
            } else {
              reject(err);
            }
            return;
          }
          resolve([fields, files]);
        });
      } catch (err) {
        reject(new Error('Error parsing form data'));
      }
    });

    const file = files.file?.[0] || files.file;
    
    if (!file || !file.filepath) {
      throw new Error('No valid file uploaded');
    }

    try {
      const dataBuffer = fs.readFileSync(file.filepath);
      if (!dataBuffer || dataBuffer.length === 0) {
        throw new Error('Empty or invalid file');
      }

      // Process file based on type
      const result = await processFile(file, dataBuffer);
      
      // Clean up temp file immediately after processing
      fs.unlinkSync(file.filepath);
      
      return res.status(200).json(result);
    } catch (processError) {
      // Clean up temp file in case of processing error
      if (file.filepath && fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
      throw processError;
    }
  } catch (error) {
    console.error('Upload error:', error);
    // Ensure error response is properly formatted
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}