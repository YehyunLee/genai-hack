import fs from 'fs';
import path from 'path';
import { getVideoDurationInSeconds } from 'get-video-duration';
import { createCanvas, loadImage } from 'canvas';
import { execSync } from 'child_process';

export async function processVideo(file) {
  try {
    const videoBuffer = fs.readFileSync(file.filepath);
    const base64Video = videoBuffer.toString('base64');

    const videoInfo = {
      fileName: file.originalFilename || 'uploaded-video',
      fileSize: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      mimeType: file.mimetype,
      duration: 'Unknown',
    };

    try {
      const duration = await getVideoDurationInSeconds(file.filepath);
      videoInfo.duration = duration.toFixed(2) + ' sec';
    } catch (error) {
      console.warn('Failed to get video duration:', error.message);
    }

    return { success: true, video: base64Video, info: videoInfo };
  } catch (error) {
    console.error('Video processing error:', error);
    throw new Error(`Video processing failed: ${error.message}`);
  }
}

export async function extractScreenshots(file) {
  const screenshotsDir = path.join('uploads', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

  try {
    const duration = await getVideoDurationInSeconds(file.filepath);
    const times = [0, duration / 2, duration - 0.1].map((t) => Math.max(t, 0));

    const screenshots = times.map((time, index) => {
      const outputPath = path.join(screenshotsDir, `${Date.now()}_screenshot${index + 1}.jpg`);
      
      try {
        execSync(`ffmpeg -i ${file.filepath} -ss ${time} -vframes 1 ${outputPath}`);
        return `/uploads/screenshots/${path.basename(outputPath)}`;
      } catch (err) {
        console.error(`Failed to extract screenshot at ${time}s:`, err);
        return null;
      }
    }).filter(Boolean);

    return { success: true, screenshots };
  } catch (error) {
    console.error('Screenshot extraction error:', error);
    throw new Error('Failed to extract video screenshots');
  }
}
