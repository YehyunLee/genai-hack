// pages/api/testVideo.js
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable the default body parser to handle form data
export const config = {
  api: {
    bodyParser: false,
    // Increase the limit for the API route
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Configure formidable with higher limits for large videos
    const form = formidable({
      uploadDir: uploadsDir,
      keepExtensions: true,
      maxFiles: 4, // Video + 3 screenshots
      maxFileSize: 500 * 1024 * 1024, // 500MB limit
      multiples: true,
    });

    // Parse the incoming form data with better error handling
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Formidable error:', err);
          reject(err);
          return;
        }
        
        // Log received files for debugging
        console.log('Received files:', Object.keys(files));
        resolve([fields, files]);
      });
    });

    // Check if we have the needed files
    if (!files.video) {
      return res.status(400).json({
        success: false,
        message: 'Video file is missing',
      });
    }

    // Get the video file (handle both array and single file formats)
    const videoFile = Array.isArray(files.video) ? files.video[0] : files.video;
    
    // Collect all screenshot files that exist
    const screenshotFiles = [];
    for (let i = 0; i < 3; i++) {
      const key = `screenshot_${i}`;
      if (files[key]) {
        const screenshot = Array.isArray(files[key]) ? files[key][0] : files[key];
        screenshotFiles.push(screenshot);
      }
    }


    // Prep screenshots for req
    const formData = new FormData();
    formData.append('video', videoFile);
    for (let i =0; i< screenshotFiles.length; i++){
      formData.append(screenshotFiles[i]);
    }
    try {
      // Track upload progress
      const response = await fetch('../chat', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} ${response.statusText}. ${errorText}`);
      }
      
      // Since we can't track progress with basic fetch, set to complete after successful upload
      setProgress(100);
      
      return await response.json();
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }

    // // Generate public URLs for the files
    // const videoUrl = `/uploads/${path.basename(videoFile.filepath || videoFile.path)}`;
    // const screenshotUrls = screenshotFiles.map(
    //   (file) => `/uploads/${path.basename(file.filepath || file.path)}`
    // );

    // // Here you could save references to these files in your database if needed
    
    // // Return the file URLs in the response
    return res.status(200).json({
      success: true,
      message: 'Files uploaded successfully',
      data: {
        screenshotUrls,
      },
    });
  } catch (error) {
    console.error('Error handling file upload:', error);
    return res.status(500).json({
      success: false,
      message: 'Error uploading files',
      error: error.message,
    });
  }
}