import { FileItem } from '@/types/files';

export interface ExtractedContent {
  text: string;
  success: boolean;
  error?: string;
}

/**
 * Extract text content from different file types
 * Currently supports PDFs and text-based files
 */
export async function extractFileContent(file: File): Promise<ExtractedContent> {
  try {
    const fileType = file.type.toLowerCase();
    
    // Handle PDFs
    if (fileType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      return await extractPDFContent(file);
    }
    
    // Handle text-based files
    if (fileType.startsWith('text/') || 
        file.name.toLowerCase().endsWith('.txt') ||
        file.name.toLowerCase().endsWith('.md')) {
      return await extractTextContent(file);
    }
    
    // Handle images (for future OCR support)
    if (fileType.startsWith('image/')) {
      return {
        text: `[Image file: ${file.name}] - Content extraction not yet supported for images.`,
        success: true
      };
    }
    
    // For other file types, return a placeholder
    return {
      text: `[${file.type || 'Unknown file type'}: ${file.name}] - Content extraction not supported for this file type.`,
      success: true
    };
    
  } catch (error) {
    console.error('Error extracting file content:', error);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Extract text content from PDF files using PDF.js
 */
async function extractPDFContent(file: File): Promise<ExtractedContent> {
  try {
    // Dynamically import PDF.js to avoid SSR issues
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker path - use local worker to avoid CORS issues
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
    
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine text items
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
    }
    
    // Clean up text
    const cleanedText = fullText
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
    
    return {
      text: cleanedText || 'No text content found in PDF',
      success: true
    };
    
  } catch (error) {
    console.error('Error extracting PDF content:', error);
    return {
      text: '',
      success: false,
      error: `Failed to extract PDF content: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Extract text content from text-based files
 */
async function extractTextContent(file: File): Promise<ExtractedContent> {
  try {
    const text = await file.text();
    return {
      text: text.trim() || 'File appears to be empty',
      success: true
    };
  } catch (error) {
    console.error('Error extracting text content:', error);
    return {
      text: '',
      success: false,
      error: `Failed to extract text content: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Check if a file type supports content extraction
 */
export function supportsContentExtraction(fileType: string): boolean {
  const type = fileType.toLowerCase();
  return type === 'application/pdf' || 
         type.startsWith('text/') ||
         type === 'application/json' ||
         type === 'application/xml';
}

/**
 * Get a human-readable description of extraction support
 */
export function getExtractionSupportInfo(fileType: string): string {
  if (supportsContentExtraction(fileType)) {
    return 'Content extraction supported';
  }
  
  if (fileType.startsWith('image/')) {
    return 'Image file - OCR support coming soon';
  }
  
  return 'Content extraction not supported';
}
