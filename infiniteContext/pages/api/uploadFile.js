import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
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
    // Use system temp directory
    const tempDir = os.tmpdir();

    const form = formidable({
      uploadDir: tempDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
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
      return res.status(400).json({ error: 'No valid file uploaded' });
    }

    try {
      // Read the PDF file
      const dataBuffer = fs.readFileSync(file.filepath);
      
      // Extract text from PDF
      const pdfData = await pdfParse(dataBuffer);
      const extractedText = pdfData.text;
      
      // Get additional PDF info
      const pdfInfo = {
        pageCount: pdfData.numpages,
        fileName: file.originalFilename || 'uploaded-file.pdf',
        fileSize: (file.size / 1024).toFixed(2) + ' KB'
      };

      // Send response
      res.status(200).json({
        success: true,
        text: extractedText,
        info: pdfInfo
      });
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