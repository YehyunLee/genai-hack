import { processPdf } from './pdfProcess';

import { processVideo} from './videoProcess'

import { processImage } from './imageProcess';


export function processFile(file, fileType, fileExtension) {
  // Determine which processor to use
  if (fileType === 'application/pdf' || fileExtension === 'pdf') {
    return processPdf(file);
  }
  else if(fileType.startsWith("video/")) {
    return processVideo(file)
  }
  else if (fileType === 'image/jpeg' || fileType === 'image/png') {
    return processImage(file);

  }
  // any future types we add {img,vid}
  
  else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
}