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
  let filePath = null;
  
  if (req.method !== 'POST') {
    return res.status(405).json({error: 'Method not allowed'});
  }

  try {
    // Use system temp directory
    const tempDir = os.tmpdir();
    // Create temp directory if it doesn't exist
    // const tempDir = path.join(process.cwd(), 'temp');
    // if (!fs.existsSync(tempDir)) {
    //   fs.mkdirSync(tempDir, { recursive: true });
    // }
    
    const form = formidable({
      uploadDir: tempDir,
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB limit
    });

    // Parse the form
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve([fields, files]);
      });
    });

    // In newer versions of formidable, the file might be in an array
    const file = files.file?.[0] || files.file;

    if (!file || !file.filepath) {
      return res.status(400).json({error: 'No valid file uploaded'});
    }

    filePath = file.filepath; // Store the file path for cleanup

    // Get file type and extension
    const fileType = file.mimetype || 'application/octet-stream';
    const fileExtension = path.extname(file.originalFilename || '').slice(1).toLowerCase();

    // Process the file based on its type
    const result = await processFile(file, fileType, fileExtension);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('File processing error:', error);
    
    // Send more user-friendly error messages
    if (error.message.includes('maxFileSize')) {
      return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
    } else if (error.message.includes('too large to process')) {
      return res.status(413).json({ error: error.message });
    } else if (error.message.includes('password protected')) {
      return res.status(422).json({ error: error.message });
    } else if (error.message.includes('corrupted')) {
      return res.status(422).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'An error occurred while processing the file.' });
  } finally {
    // Always clean up the temp file
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error deleting temporary file:', err);
      }
    }
  }
}