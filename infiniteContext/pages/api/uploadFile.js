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
    const tempDir = os.tmpdir();
    const form = formidable({
      uploadDir: tempDir,
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // Increased to 50MB
      filter: function ({ mimetype }) {
        return mimetype && mimetype.includes('pdf');
      },
    });

    // Parse the form with error handling
    const [fields, files] = await new Promise((resolve, reject) => {
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
    });

    const file = files.file?.[0] || files.file;
    
    if (!file || !file.filepath) {
      throw new Error('No valid PDF file uploaded');
    }

    try {
      const dataBuffer = fs.readFileSync(file.filepath);
      
      // Validate PDF before parsing
      if (!dataBuffer || dataBuffer.length === 0) {
        throw new Error('Empty or invalid PDF file');
      }

      const pdfData = await pdfParse(dataBuffer);
      
      // Clean up temp file immediately after processing
      fs.unlinkSync(file.filepath);
      
      res.status(200).json({
        success: true,
        text: pdfData.text,
        info: {
          pageCount: pdfData.numpages,
          fileName: file.originalFilename || 'uploaded-file.pdf',
          fileSize: (file.size / 1024).toFixed(2) + ' KB'
        }
      });
    } catch (pdfError) {
      // Clean up temp file in case of PDF processing error
      if (file.filepath && fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
      throw new Error(`PDF processing error: ${pdfError.message}`);
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
}