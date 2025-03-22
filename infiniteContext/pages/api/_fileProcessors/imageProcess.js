import fs from 'fs';

export async function processImage(file) {
  try {
    // Read the image file
    const dataBuffer = fs.readFileSync(file.filepath);

    // Convert image to base64
    const base64Image = dataBuffer.toString('base64');

    // Get additional image info
    const imageInfo = {
      fileName: file.originalFilename || 'uploaded-image',
      fileSize: (file.size / 1024).toFixed(2) + ' KB',
      mimeType: file.mimetype
    };

    // Delete file after processing
    fs.unlinkSync(file.filepath);
    //log the return values

    return {
      success: true,
      data: base64Image,
      info: imageInfo
    };
  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error(`Image processing failed: ${error.message}`);
  }
}