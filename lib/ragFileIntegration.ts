import { storage } from '@/lib/firebase';
import { ref, getDownloadURL, listAll, getMetadata } from 'firebase/storage';
import { ragService } from './ragService';

export interface UserFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
  userId: string;
  path: string;
}

export interface RAGProcessedFile extends UserFile {
  ragProcessed: boolean;
  ragProcessedAt?: Date;
  ragChunks?: number;
}

export class RAGFileIntegration {
  private ragService: typeof ragService;

  constructor() {
    this.ragService = ragService;
  }

  /**
   * Get all files for a user from Firebase Storage
   */
  async getUserFiles(userId: string): Promise<UserFile[]> {
    try {
      const userFilesRef = ref(storage, `users/${userId}/files`);
      const fileList = await listAll(userFilesRef);
      
      const files: UserFile[] = [];
      
      for (const fileRef of fileList.items) {
        const metadata = await getMetadata(fileRef);
        const url = await getDownloadURL(fileRef);
        
        files.push({
          id: fileRef.name,
          name: metadata.name,
          url,
          type: metadata.contentType || 'unknown',
          size: metadata.size,
          uploadedAt: new Date(metadata.timeCreated),
          userId,
          path: fileRef.fullPath
        });
      }
      
      return files;
    } catch (error) {
      console.error('Error fetching user files:', error);
      throw new Error('Failed to fetch user files');
    }
  }

  /**
   * Process a user's file through RAG
   */
  async processFileForRAG(file: UserFile, content: string): Promise<boolean> {
    try {
      const result = await this.ragService.processDocument({
        document_id: file.id,
        document_content: content,
        source: 'user_upload',
        user_id: file.userId,
        document_type: this.getDocumentType(file.type)
      });

      return result.success;
    } catch (error) {
      console.error('Error processing file for RAG:', error);
      return false;
    }
  }

  /**
   * Process all user files for RAG (batch operation)
   */
  async processAllUserFilesForRAG(userId: string): Promise<{
    processed: number;
    failed: number;
    results: Array<{ fileId: string; success: boolean; error?: string }>;
  }> {
    const files = await this.getUserFiles(userId);
    const results: Array<{ fileId: string; success: boolean; error?: string }> = [];
    let processed = 0;
    let failed = 0;

    for (const file of files) {
      try {
        // For text files, we can process directly
        if (this.isTextFile(file.type)) {
          const content = await this.fetchFileContent(file.url);
          const success = await this.processFileForRAG(file, content);
          
          results.push({ fileId: file.id, success });
          if (success) processed++;
          else failed++;
        } else {
          // For non-text files, we might need OCR or other processing
          results.push({ 
            fileId: file.id, 
            success: false, 
            error: 'Non-text file - OCR processing not implemented yet' 
          });
          failed++;
        }
      } catch (error) {
        results.push({ 
          fileId: file.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        failed++;
      }
    }

    return { processed, failed, results };
  }

  /**
   * Get files that have been processed for RAG
   */
  async getRAGProcessedFiles(userId: string): Promise<RAGProcessedFile[]> {
    const files = await this.getUserFiles(userId);
    
    // In a real implementation, you'd store RAG processing status in Firestore
    // For now, we'll return all files with a placeholder
    return files.map(file => ({
      ...file,
      ragProcessed: false, // This would come from Firestore
      ragProcessedAt: undefined,
      ragChunks: 0
    }));
  }

  /**
   * Search user's files using RAG
   */
  async searchUserFiles(userId: string, query: string): Promise<{
    results: Array<{
      fileId: string;
      fileName: string;
      relevanceScore: number;
      snippet: string;
      url: string;
    }>;
    totalResults: number;
  }> {
    try {
      const ragResults = await this.ragService.processQuery({
        query,
        user_id: userId,
        context: 'user_files'
      });

      // Map RAG results back to user files
      const results = ragResults.results.map(result => ({
        fileId: result.metadata.document_id,
        fileName: result.metadata.content?.substring(0, 50) + '...' || 'Unknown',
        relevanceScore: result.score,
        snippet: result.metadata.content?.substring(0, 200) + '...' || '',
        url: `#file-${result.metadata.document_id}` // You'd construct the actual file URL
      }));

      return {
        results,
        totalResults: results.length
      };
    } catch (error) {
      console.error('Error searching user files:', error);
      throw new Error('Failed to search user files');
    }
  }

  /**
   * Helper: Determine document type from file type
   */
  private getDocumentType(fileType: string): string {
    if (fileType.includes('pdf')) return 'pdf_document';
    if (fileType.includes('text') || fileType.includes('plain')) return 'text_document';
    if (fileType.includes('word') || fileType.includes('document')) return 'word_document';
    if (fileType.includes('image')) return 'image_document';
    return 'user_document';
  }

  /**
   * Helper: Check if file is text-based
   */
  private isTextFile(fileType: string): boolean {
    const textTypes = [
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'application/json',
      'application/xml',
      'text/xml',
      'application/rtf'
    ];
    
    return textTypes.some(type => fileType.includes(type));
  }

  /**
   * Helper: Fetch file content from URL
   */
  private async fetchFileContent(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      console.error('Error fetching file content:', error);
      throw new Error('Failed to fetch file content');
    }
  }
}

export const ragFileIntegration = new RAGFileIntegration();

