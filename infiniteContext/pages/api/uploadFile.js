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

    // Get file type and extension
    const fileType = file.mimetype || 'application/octet-stream';
    const fileExtension = path.extname(file.originalFilename || '').slice(1).toLowerCase();

    // Process the file based on its type
    try {
    const result = await processFile(file, fileType, fileExtension);

    res.status(200).json(result);
  } finally {
      // Always clean up the temp file
      if (file.filepath && fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
    }
  } catch (error) {
    console.error('PDF processing error:', error);
    return res.status(500).json({ error: error.message });
  }
}