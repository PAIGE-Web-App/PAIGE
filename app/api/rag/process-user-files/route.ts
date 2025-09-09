import { NextRequest, NextResponse } from 'next/server';
import { ragFileIntegration } from '@/lib/ragFileIntegration';
import { getRAGConfig } from '@/lib/ragFeatureFlag';

export async function POST(request: NextRequest) {
  try {
    const { userId, action } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if RAG is enabled for this user
    const ragConfig = getRAGConfig();
    if (!ragConfig.enabled) {
      return NextResponse.json(
        { error: 'RAG is not enabled' },
        { status: 403 }
      );
    }

    switch (action) {
      case 'list_files':
        const files = await ragFileIntegration.getUserFiles(userId);
        return NextResponse.json({
          success: true,
          files,
          count: files.length
        });

      case 'process_all':
        const processResults = await ragFileIntegration.processAllUserFilesForRAG(userId);
        return NextResponse.json({
          success: true,
          message: `Processed ${processResults.processed} files successfully`,
          results: processResults
        });

      case 'search':
        const { query } = await request.json();
        if (!query) {
          return NextResponse.json(
            { error: 'Search query is required' },
            { status: 400 }
          );
        }
        
        const searchResults = await ragFileIntegration.searchUserFiles(userId, query);
        return NextResponse.json({
          success: true,
          results: searchResults
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: list_files, process_all, or search' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in RAG file integration:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action') || 'list_files';

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if RAG is enabled for this user
    const ragConfig = getRAGConfig();
    if (!ragConfig.enabled) {
      return NextResponse.json(
        { error: 'RAG is not enabled' },
        { status: 403 }
      );
    }

    switch (action) {
      case 'list_files':
        const files = await ragFileIntegration.getUserFiles(userId);
        return NextResponse.json({
          success: true,
          files,
          count: files.length
        });

      case 'rag_status':
        const ragFiles = await ragFileIntegration.getRAGProcessedFiles(userId);
        return NextResponse.json({
          success: true,
          ragFiles,
          count: ragFiles.length
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: list_files or rag_status' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in RAG file integration:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

