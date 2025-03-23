import fs from 'fs';
import pdfParse from 'pdf-parse';

export async function processPdf(file) {
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
    
    // Delete file after processing
    fs.unlinkSync(file.filepath);

    return {
      success: true,
      text: extractedText,
      info: pdfInfo
    };
  } catch (error) {
    console.error('PDF processing error:', error);
    throw new Error(`PDF processing failed: ${error.message}`);
  }
}