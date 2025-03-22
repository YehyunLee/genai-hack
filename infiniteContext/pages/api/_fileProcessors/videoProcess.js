import fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';

const execPromise = promisify(exec);

export async function processVideo(file) {
  try {
    // Read the video file
    const dataBuffer = fs.readFileSync(file.filepath);

    // Convert video to base64
    const base64Video = dataBuffer.toString('base64');

    // Get video metadata
    const videoInfo = {
      fileName: file.originalFilename || 'uploaded-video',
      fileSize: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      mimeType: file.mimetype
    };

    // Extract video duration using ffprobe (FFmpeg utility)
    try {
      const { stdout } = await execPromise(`ffprobe -i "${file.filepath}" -show_entries format=duration -v quiet -of csv="p=0"`);
      videoInfo.duration = parseFloat(stdout.trim()).toFixed(2) + ' sec';
    } catch (ffprobeError) {
      console.warn('Failed to extract video duration:', ffprobeError.message);
      videoInfo.duration = 'Unknown';
    }

    // Delete file after processing
    fs.unlinkSync(file.filepath);

    return {
      success: true,
      video: base64Video,
      info: videoInfo
    };
  } catch (error) {
    console.error('Video processing error:', error);
    throw new Error(`Video processing failed: ${error.message}`);
  }
}
