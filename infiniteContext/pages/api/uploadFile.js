import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

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
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const form = formidable({
      uploadDir: uploadsDir,
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

    console.log("Files received:", files); 

    const file = files.file?.[0] || files.file;
    
    if (!file || !file.filepath) {
      return res.status(400).json({ error: 'No valid file uploaded' });
    }

    // Generate relative path for client use
    const relativePath = `/uploads/${path.basename(file.filepath)}`;

    return res.status(200).json({
      success: true,
      filePath: relativePath,
      fileName: file.originalFilename || file.newFilename || 'uploaded-file',
    });
  } catch (error) {
    console.error('File upload error:', error);
    return res.status(500).json({ error: error.message });
  }
}