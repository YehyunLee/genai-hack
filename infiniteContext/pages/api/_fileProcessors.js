import pdfParse from 'pdf-parse';

export async function processFile(file, dataBuffer) {
  try {
    if (file.mimetype?.includes('pdf')) {
      const pdfData = await pdfParse(dataBuffer);
      return {
        success: true,
        text: pdfData.text,
        info: {
          pageCount: pdfData.numpages,
          fileName: file.originalFilename || 'uploaded-file.pdf',
          fileSize: (file.size / 1024).toFixed(2) + ' KB',
          mimeType: file.mimetype
        }
      };
    } else if (file.mimetype?.includes('image')) {
      return {
        success: true,
        data: dataBuffer.toString('base64'),
        info: {
          fileName: file.originalFilename || 'uploaded-image',
          fileSize: (file.size / 1024).toFixed(2) + ' KB',
          mimeType: file.mimetype
        }
      };
    } else {
      throw new Error('Unsupported file type');
    }
  } catch (error) {
    throw new Error(`File processing error: ${error.message}`);
  }
}
