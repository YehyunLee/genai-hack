import { processPdf } from './pdfProcess';
import { processVideo} from './videoProcess'

export function processFile(file, fileType, fileExtension) {
  // Determine which processor to use
  if (fileType === 'application/pdf' || fileExtension === 'pdf') {
    return processPdf(file);
  }
  else if(fileType.startsWith("video/")) {
    return processVideo(file)
  }
  // any future types we add {img,vid}
  
  else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
}