export default async function extractScreenshots(file) {
    return new Promise((resolve, reject) => {
      // Create video element and canvas for processing
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set up timeout to detect stalls
      const timeout = setTimeout(() => {
        reject(new Error('Video processing timed out. The file might be too large or in an unsupported format.'));
      }, 30000); // 30 second timeout
      
      video.preload = 'metadata';
      
      // Add event listeners for debugging
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
        const videoUrl = URL.createObjectURL(file);
        video.src = videoUrl;
        console.log('Video URL created:', videoUrl);
      } catch (e) {
        console.error('Error creating video URL:', e);
        clearTimeout(timeout);
        reject(new Error(`Failed to create video URL: ${e.message}`));
      }
    });
  }
  
  // Modified handleFileUpload function with integrated videoUploader
  