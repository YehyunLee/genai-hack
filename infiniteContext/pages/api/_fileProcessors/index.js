import { processPdf } from './pdfProcess';

export function processFile(file, fileType, fileExtension) {
  // Determine which processor to use
  if (fileType === 'application/pdf' || fileExtension === 'pdf') {
    return processPdf(file);
  }
  // any future types we add {img,vid}
  else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
}