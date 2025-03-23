// components/VideoUploader.jsx
import { useState, useRef } from 'react';

export default function VideoUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [screenshots, setScreenshots] = useState([]);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const videoInputRef = useRef(null);
  
  const handleFileSelect = () => {
    if (videoInputRef.current) {
      videoInputRef.current.click();
    }
  };
  
  const handleVideoChange = async (e) => {
    const videoFile = e.target.files[0];
    if (!videoFile) return;
    
    try {
      setIsUploading(true);
      setProgress(0);
      setScreenshots([]);
      setUploadComplete(false);
      setStatusMessage('Loading video metadata...');
      
      // Extract screenshots from the video
      setStatusMessage('Extracting frames...');
      const extractedScreenshots = await extractVideoScreenshots(videoFile);
      setScreenshots(extractedScreenshots);
      setProgress(50);
      
      // Upload video and screenshots to backend
      setStatusMessage('Uploading to server...');
      await uploadVideoWithScreenshots(videoFile, extractedScreenshots);
      
      setProgress(100);
      setUploadComplete(true);
      setStatusMessage('Process complete!');
    } catch (error) {
      console.error('Error processing video:', error);
      setStatusMessage(`Error: ${error.message}`);
      alert('Error: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };
  
  async function extractVideoScreenshots(videoFile) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Debug log
      console.log('Starting to process video:', videoFile.name, videoFile.size, videoFile.type);
      
      // Set up timeout to detect stalls
      const timeout = setTimeout(() => {
        reject(new Error('Video processing timed out. The file might be too large or in an unsupported format.'));
      }, 30000); // 30 second timeout
      
      video.preload = 'metadata';
      
      // Add more event listeners for debugging
      video.addEventListener('loadstart', () => console.log('Video load started'));
      video.addEventListener('progress', () => console.log('Video loading in progress'));
      video.addEventListener('error', (e) => {
        console.error('Video error:', video.error);
        reject(new Error(`Video loading error: ${video.error?.message || 'Unknown error'}`));
      });
      
      video.onloadedmetadata = () => {
        console.log(`Video metadata loaded, duration: ${video.duration}s, dimensions: ${video.videoWidth}x${video.videoHeight}`);
        clearTimeout(timeout);
        
        // Check if video is valid
        if (video.duration === Infinity || isNaN(video.duration) || video.duration === 0) {
          reject(new Error('Invalid video duration. The file might be corrupted.'));
          return;
        }
        
        // Set dimensions for the canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const duration = video.duration;
        const framePositions = [
          0,                  // Start frame
          duration / 2,       // Middle frame
          Math.max(0, duration - 0.1)  // End frame (slight offset to ensure we get the last frame)
        ];
        
        console.log('Frame positions to extract:', framePositions);
        
        const screenshots = [];
        let framesProcessed = 0;
        
        // Create a timeout for each seek operation
        let seekTimeout;
        
        // Process each frame with better error handling
        const processNextFrame = (index) => {
          if (index >= framePositions.length) {
            // All frames processed
            URL.revokeObjectURL(video.src);
            resolve(screenshots);
            return;
          }
          
          const position = framePositions[index];
          console.log(`Seeking to position: ${position}s`);
          
          // Set a timeout for this seek operation
          clearTimeout(seekTimeout);
          seekTimeout = setTimeout(() => {
            console.error(`Seek timeout at position ${position}`);
            // Try to continue with next frame instead of failing completely
            framesProcessed++;
            setProgress(Math.floor((framesProcessed / framePositions.length) * 50));
            processNextFrame(index + 1);
          }, 10000); // 10 second timeout per seek
          
          // Seek to the specific position
          try {
            video.currentTime = position;
          } catch (e) {
            console.error('Error during seek:', e);
            clearTimeout(seekTimeout);
            reject(new Error(`Failed to seek in video: ${e.message}`));
            return;
          }
          
          // Handle the seek completion
          video.onseeked = () => {
            try {
              console.log(`Successfully seeked to ${video.currentTime}s`);
              clearTimeout(seekTimeout);
              
              // Draw the current frame on the canvas
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              
              // Convert canvas to data URL
              const screenshot = canvas.toDataURL('image/jpeg', 0.8);
              screenshots.push(screenshot);
              
              framesProcessed++;
              setProgress(Math.floor((framesProcessed / framePositions.length) * 50));
              console.log(`Processed frame ${framesProcessed}/${framePositions.length}`);
              
              // Process next frame
              processNextFrame(index + 1);
            } catch (e) {
              console.error('Error capturing frame:', e);
              clearTimeout(seekTimeout);
              reject(new Error(`Failed to capture frame: ${e.message}`));
            }
          };
        };
        
        // Start processing frames
        processNextFrame(0);
      };
      
      // Handle video loading error
      video.onerror = () => {
        clearTimeout(timeout);
        const errorMessage = video.error ? `Error code: ${video.error.code}` : 'Unknown error';
        console.error('Video loading failed:', errorMessage);
        reject(new Error(`Failed to load video: ${errorMessage}`));
      };
      
      // Create object URL and start loading
      try {
        const videoUrl = URL.createObjectURL(videoFile);
        video.src = videoUrl;
        console.log('Video URL created:', videoUrl);
      } catch (e) {
        console.error('Error creating video URL:', e);
        clearTimeout(timeout);
        reject(new Error(`Failed to create video URL: ${e.message}`));
      }
    });
  }
  
  async function uploadVideoWithScreenshots(videoFile, screenshots) {
    // Create FormData to send to backend
    const formData = new FormData();
    formData.append('video', videoFile);
    
    // Add screenshots
    screenshots.forEach((screenshot, index) => {
      try {
        // Convert data URL to Blob
        const screenshotBlob = dataURLtoBlob(screenshot);
        console.log(`screenshot blob: `, screenshotBlob)
        formData.append(`screenshot_${index}`, screenshotBlob, `frame_${index}.jpg`);
      } catch (e) {
        console.error(`Error processing screenshot ${index}:`, e);
        // Continue with other screenshots
      }
    });
    
    try {
      // Track upload progress
      const response = await fetch('/api/chat', {
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
  }
  // Helper function to convert data URL to Blob
  function dataURLtoBlob(dataURL) {
    const parts = dataURL.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    
    return new Blob([uInt8Array], { type: contentType });
  }
  
  return (
    <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800">Video Uploader</h2>
      
      <input 
        ref={videoInputRef}
        type="file" 
        accept="video/*" 
        className="hidden"
        onChange={handleVideoChange}
      />
      
      <button 
        onClick={handleFileSelect}
        disabled={isUploading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isUploading ? 'Processing...' : 'Select Video'}
      </button>
      
      {isUploading && (
        <>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="text-sm text-gray-600">{statusMessage}</div>
        </>
      )}
      
      {uploadComplete && (
        <div className="p-2 bg-green-100 text-green-800 rounded">
          Upload complete! Video and screenshots processed successfully.
        </div>
      )}
      
      {screenshots.length > 0 && (
        <div className="grid grid-cols-3 gap-4 w-full">
          {screenshots.map((screenshot, index) => (
            <div key={index} className="flex flex-col items-center">
              <img 
                src={screenshot} 
                alt={`Frame ${index}`} 
                className="w-full h-auto rounded border border-gray-300"
              />
              <span className="text-sm text-gray-600 mt-1">
                {index === 0 ? 'Start' : index === 1 ? 'Middle' : 'End'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}