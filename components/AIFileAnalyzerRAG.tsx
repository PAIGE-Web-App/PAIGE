import React, { useState, useRef, useEffect } from 'react';
import { FileItem } from '@/types/files';
import { Send, FileText, Sparkles, Bot, User, Loader2, Download, Eye, Trash2, Plus, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import { useRAGFileAnalysis } from '@/hooks/useRAGFileAnalysis';

interface AIAnalysisMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  fileId?: string;
  analysisType?: 'summary' | 'insights' | 'questions' | 'custom' | 'loading';
  isGenerating?: boolean;
  displayContent?: string;
  ragEnabled?: boolean;
  ragContext?: string;
  followUpQuestions?: string[];
}

interface AIFileAnalyzerRAGProps {
  selectedFile: FileItem | null;
  onClose: () => void;
  onAnalyzeFile: (fileId: string, analysisType: string) => Promise<void>;
  onAskQuestion: (fileId: string, question: string) => Promise<string>;
  isVisible: boolean;
}

const AIFileAnalyzerRAG: React.FC<AIFileAnalyzerRAGProps> = ({
  selectedFile,
  onClose,
  onAnalyzeFile,
  onAskQuestion,
  isVisible,
}) => {
  const [messages, setMessages] = useState<AIAnalysisMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [showSuggestedResponses, setShowSuggestedResponses] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { analyzeFile, askQuestion, isLoading: ragLoading, error: ragError } = useRAGFileAnalysis();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Initialize component when file is selected and auto-analyze if not already analyzed
  useEffect(() => {
    if (selectedFile) {
      setMessages([]);
      setIsAnalyzing(false);
      setFollowUpQuestions([]);
      
      // Always call initializeFileAnalysis - it will either show cached results or start new analysis
      console.log('AIFileAnalyzerRAG: File selected, initializing analysis (cached or new)');
      initializeFileAnalysis();
    }
  }, [selectedFile?.id]);

  const initializeFileAnalysis = async () => {
    if (!selectedFile) return;

    // Debug: Log file analysis status
    console.log('AIFileAnalyzerRAG: File analysis check:', {
      fileName: selectedFile.name,
      isProcessed: selectedFile.isProcessed,
      hasAiSummary: !!selectedFile.aiSummary,
      aiSummaryLength: selectedFile.aiSummary?.length || 0,
      aiSummaryPreview: selectedFile.aiSummary?.substring(0, 100) || 'No summary'
    });

    // Check if file has already been analyzed (and it's real analysis, not placeholder)
    if (selectedFile.isProcessed && selectedFile.aiSummary && 
        !selectedFile.aiSummary.includes("I'm currently unable to directly analyze")) {

      // File already analyzed - just display results without re-analyzing
      console.log('AIFileAnalyzerRAG: File already analyzed, displaying cached results');
      setIsAnalyzing(false);
      setFollowUpQuestions([]); // Clear previous follow-up questions
      setMessages([]);
      
      // Create a single message with the cached analysis (same format as original analysis)
      const cachedMessage: AIAnalysisMessage = {
        id: `cached-analysis-${Date.now()}`,
        type: 'assistant',
        content: selectedFile.aiSummary || 'Analysis completed. Ask me anything about this file!',
        timestamp: new Date(),
        analysisType: 'summary',
        ragEnabled: true,
        ragContext: 'Context from other files included'
      };

      setMessages([cachedMessage]);
      return; // Exit early - no need to re-analyze
    }

    // File not analyzed yet - proceed with RAG analysis
    console.log('AIFileAnalyzerRAG: File not analyzed yet, starting new analysis');
    setIsAnalyzing(true);
    setFollowUpQuestions([]); // Clear previous follow-up questions
    
    // Add loading message
    const loadingMessage: AIAnalysisMessage = {
      id: `loading-${Date.now()}`,
      type: 'assistant',
      content: 'Analyzing file with RAG-enhanced AI...',
      timestamp: new Date(),
      analysisType: 'loading',
      isGenerating: true,
      ragEnabled: true
    };
    
    setMessages([loadingMessage]);

    try {
      // Get file content (you'll need to implement this based on your file system)
      const fileContent = await getFileContent(selectedFile);
      
      // Use RAG-enhanced analysis
      const result = await analyzeFile({
        fileId: selectedFile.id,
        fileName: selectedFile.name,
        fileContent: fileContent,
        fileType: selectedFile.fileType || 'unknown',
        analysisType: 'comprehensive'
      });

      // Replace loading message with actual analysis
      const analysisMessage: AIAnalysisMessage = {
        id: `analysis-${Date.now()}`,
        type: 'assistant',
        content: result.analysis,
        timestamp: new Date(),
        analysisType: 'summary',
        ragEnabled: result.ragEnabled,
        ragContext: result.ragContext
      };

      setMessages([analysisMessage]);
      setFollowUpQuestions(result.followUpQuestions || []);
      
      // Handle credit information if available
      if (result.credits && result.credits.required > 0) {
        console.log('AIFileAnalyzerRAG: Credits were deducted, triggering popover:', result.credits);
        // Trigger credit update event for popover
        if (typeof window !== 'undefined') {
          localStorage.setItem('creditUpdateEvent', Date.now().toString());
          // Also trigger the event emitter directly
          const { creditEventEmitter } = await import('@/utils/creditEventEmitter');
          creditEventEmitter.emit();
        }
      }
      
      // Note: File record will be updated by the RAG API response
      // No need to call the original onAnalyzeFile function
      
    } catch (error) {
      console.error('RAG analysis failed:', error);
      
      // Check if it's a credit issue
      if (error instanceof Error && error.message.includes('credits')) {
        setMessages([{
          id: 'credit-error',
          type: 'assistant',
          content: 'Sorry, you don\'t have enough credits to analyze this file. Please upgrade your plan or wait for your daily credits to refresh.',
          timestamp: new Date(),
          analysisType: 'summary',
          ragEnabled: false
        }]);
      } else {
        setMessages([{
          id: 'error',
          type: 'assistant',
          content: 'Sorry, I encountered an error analyzing your file. Please try again.',
          timestamp: new Date(),
          analysisType: 'summary',
          ragEnabled: false
        }]);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Get file content helper function
  const getFileContent = async (file: FileItem): Promise<string> => {
    try {
      // Download the file from Firebase Storage (same as original analyzer)
      const fileResponse = await fetch(file.fileUrl);
      if (!fileResponse.ok) {
        throw new Error('Failed to download file');
      }
      
      const arrayBuffer = await fileResponse.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Use the same file content extraction logic as the original analyzer
      const { fileContentExtractor } = await import('@/utils/fileContentExtractor');
      const extractedContent = await fileContentExtractor(file.name, uint8Array, file.fileType);
      
      if (extractedContent.success && extractedContent.text) {
        return extractedContent.text;
      } else {
        // Fallback for unsupported file types
        console.error('Content extraction failed:', extractedContent.error);
        return `File: ${file.name} (${file.fileType})\nContent extraction not supported for this file type. Please provide key details manually.`;
      }
    } catch (error) {
      console.error('Error getting file content:', error);
      return `File: ${file.name} (${file.fileType})\nError reading file content. Please provide key details manually.`;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedFile || isLoading) return;

    const userMessage: AIAnalysisMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      fileId: selectedFile.id,
      analysisType: 'custom'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Get file content
      const fileContent = await getFileContent(selectedFile);
      
      // Use RAG-enhanced question answering
      const result = await askQuestion(
        selectedFile.id,
        selectedFile.name,
        fileContent,
        selectedFile.fileType || 'unknown',
        inputValue,
        messages.map(m => ({ role: m.type, content: m.content }))
      );

      const assistantMessage: AIAnalysisMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: result.analysis,
        timestamp: new Date(),
        fileId: selectedFile.id,
        analysisType: 'custom',
        ragEnabled: result.ragEnabled,
        ragContext: result.ragContext
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error asking question:', error);
      const errorMessage: AIAnalysisMessage = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: 'Sorry, I encountered an error processing your question. Please try again.',
        timestamp: new Date(),
        fileId: selectedFile.id,
        analysisType: 'custom'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
    handleSendMessage();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!selectedFile) {
    return (
      <div className="h-full bg-white border-l border-gray-200 flex items-center justify-center w-[600px] flex-shrink-0">
        <div className="text-center text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-2">No file selected</p>
          <p className="text-sm">Select a file to analyze with RAG-enhanced AI</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: 0.3,
            ease: "easeInOut"
          }}
          className="h-full bg-white border-l border-gray-200 flex flex-col overflow-hidden w-[600px] flex-shrink-0"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-[#332B42] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#A85C36]" />
                Analyze with Paige
                <div className="flex items-center gap-1 ml-2">
                  <Database className="w-4 h-4 text-purple-600" />
                  <span className="text-xs text-purple-600 font-medium">RAG</span>
                </div>
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-[#332B42] p-1 rounded-full hover:bg-gray-100 transition-colors"
                title="Close Analyze with Paige"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>
        
            {/* Selected File Info */}
            <div className="bg-gray-50 rounded-[15px] p-3 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#A85C36] rounded-[10px] flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#332B42] truncate" title={selectedFile.name}>
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedFile.fileType} • {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => window.open(selectedFile.fileUrl, '_blank')}
                    className="p-1.5 hover:bg-gray-200 rounded-[5px] transition-colors"
                    title="View file"
                  >
                    <Eye className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Analysis Trigger Button - REMOVED: Analysis now starts automatically */}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-[12px] group`}
              >
                <div className="flex flex-col items-end w-full max-w-[90%]">
                  <div
                    className={`relative break-words whitespace-pre-wrap rounded-[15px] p-3 ${
                      message.type === 'user'
                        ? 'bg-white text-gray-800 border border-[#A85733] rounded-[15px_15px_0_15px] self-end'
                        : 'bg-gray-100 text-gray-800 self-start border border-gray-300 border-[0.5px] rounded-[15px_15px_15px_0]'
                    }`}
                    style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                  >
                    <div className="text-xs text-gray-500 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        {message.type === 'assistant' && (
                          <>
                            <Bot className="w-3 h-3 text-[#A85C36]" />
                            Paige
                          </>
                        )}
                      </span>
                      <span className="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div 
                      className="text-sm prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: message.content }}
                    />
                  
                  {/* RAG Status Indicator */}
                  {message.type === 'assistant' && message.ragEnabled !== undefined && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-1 text-xs">
                        {message.ragEnabled ? (
                          <>
                            <Database className="w-3 h-3 text-purple-600" />
                            <span className="text-purple-600 font-medium">RAG Enhanced</span>
                            {message.ragContext && (
                              <span className="text-gray-500">• {message.ragContext}</span>
                            )}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-500">Standard AI</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-[#A85C36] rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-100 rounded-[15px] p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#A85C36]" />
                    <span className="text-sm text-gray-600">Paige is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Responses - Outside Chat Area */}
          {followUpQuestions.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowSuggestedResponses(!showSuggestedResponses)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
              >
                <div className="text-xs text-gray-500 font-medium">💡 Suggested Responses (1 Credit each)</div>
                <div className="text-xs text-gray-400">
                  {showSuggestedResponses ? '▼' : '▶'}
                </div>
              </button>
              
              {showSuggestedResponses && (
                <div className="px-4 pb-3">
                  <div className="flex flex-wrap gap-2 justify-start">
                    {followUpQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestedQuestion(question)}
                        disabled={isLoading || isAnalyzing}
                        className="px-3 py-1.5 text-xs bg-white hover:bg-gray-100 text-gray-700 rounded-full border border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200 flex-shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Paige about this file..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-[10px] focus:outline-none focus:border-[#A85C36] text-sm"
                disabled={isLoading || isAnalyzing}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading || isAnalyzing}
                className="px-4 py-2 bg-[#A85C36] text-white rounded-[10px] hover:bg-[#8B4A2A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            
            {/* RAG Status */}
            <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
              <Database className="w-3 h-3 text-purple-600" />
              <span>RAG-enhanced analysis provides context from your other files</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIFileAnalyzerRAG;
