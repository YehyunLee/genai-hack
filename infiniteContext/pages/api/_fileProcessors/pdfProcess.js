import fs from 'fs';
import pdfParse from 'pdf-parse';

export async function processPdf(file) {
  try {
    // Size warning threshold (10MB)
    const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024;
    if (file.size > LARGE_FILE_THRESHOLD) {
      console.warn(`Processing large PDF (${(file.size / 1024 / 1024).toFixed(2)} MB). This may take longer.`);
    }

    // Read the PDF file
    const dataBuffer = fs.readFileSync(file.filepath);
    
    // Extract text from PDF
    const pdfData = await pdfParse(dataBuffer, {
      // Optional: Add a max pages limit to prevent extremely large PDFs from causing issues
      // max: 1000
    });
    const extractedText = pdfData.text;
    
    // Get additional PDF info
    const pdfInfo = {
      pageCount: pdfData.numpages,
      fileName: file.originalFilename || 'uploaded-file.pdf',
      fileSize: (file.size / 1024).toFixed(2) + ' KB'
    };
    
    // Don't delete the file here - it's handled in uploadFile.js
    // fs.unlinkSync(file.filepath);

    return {
      success: true,
      text: extractedText,
      info: pdfInfo
    };
  } catch (error) {
    console.error('PDF processing error:', error);
    
    // More specific error messages based on error types
    if (error.message.includes('memory') || error.message.includes('heap')) {
      throw new Error('The PDF is too large to process. Please try a smaller file.');
    } else if (error.message.includes('password')) {
      throw new Error('The PDF is password protected. Please remove the password and try again.');
    } else if (error.message.includes('malformed') || error.message.includes('corrupt')) {
      throw new Error('The PDF appears to be corrupted or malformed.');
    }
    
    throw new Error(`PDF processing failed: ${error.message}`);
  }
}