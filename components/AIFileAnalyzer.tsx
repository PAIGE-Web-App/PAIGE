import React, { useState, useRef, useEffect } from 'react';
import { FileItem } from '@/types/files';
import { Send, FileText, Sparkles, Bot, User, Loader2, Download, Eye, Trash2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';

interface AIAnalysisMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  fileId?: string;
  analysisType?: 'summary' | 'insights' | 'questions' | 'custom' | 'loading';
  isGenerating?: boolean; // Track if message is still being generated
  displayContent?: string; // For word-by-word display
}

interface AIFileAnalyzerProps {
  selectedFile: FileItem | null;
  onClose: () => void;
  onAnalyzeFile: (fileId: string, analysisType: string) => Promise<void>;
  onAskQuestion: (fileId: string, question: string) => Promise<string>;
  isVisible: boolean;
}

const AIFileAnalyzer: React.FC<AIFileAnalyzerProps> = ({
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // REMOVED: Streaming text animation state (no longer needed)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Initialize with file analysis when file is selected
  useEffect(() => {
    if (selectedFile) {
      // Clear messages when switching files to ensure clean state
      setMessages([]);
      setIsAnalyzing(false);
      initializeFileAnalysis();
    }
  }, [selectedFile?.id]); // Trigger when file ID changes, not just when messages are empty

  // REMOVED: This useEffect was clearing messages after they were set

  // REMOVED: Debug logging for messages state

  const initializeFileAnalysis = async () => {
    if (!selectedFile) return;



    // Check if file has already been analyzed (and it's real analysis, not placeholder)
    if (selectedFile.isProcessed && selectedFile.aiSummary && 
        !selectedFile.aiSummary.includes("I'm currently unable to directly analyze")) {

      // File already analyzed - just display results without re-analyzing
      setIsAnalyzing(false);
      setMessages([]);
      
      // Create message queue for sequential display
      const messageQueue: AIAnalysisMessage[] = [];
      
      // Always add welcome message first
      const baseTimestamp = Date.now();
      let messageCounter = 0;
      messageQueue.push({
        id: `cached-welcome-${baseTimestamp}-${messageCounter++}`,
        type: 'assistant',
        content: `I've analyzed your file "${selectedFile.name}". Here's what I found:`,
        timestamp: new Date(),
        fileId: selectedFile.id,
        analysisType: 'summary',
      });

      // Add analysis summary
      messageQueue.push({
        id: `cached-analysis-${baseTimestamp}-${messageCounter++}`,
        type: 'assistant',
        content: selectedFile.aiSummary || 'Analysis completed. Ask me anything about this file!',
        timestamp: new Date(),
        fileId: selectedFile.id,
        analysisType: 'summary',
      });

      // Add structured analysis results if available
      if (selectedFile.keyPoints && selectedFile.keyPoints.length > 0) {
        messageQueue.push({
          id: `cached-keyPoints-${baseTimestamp}-${messageCounter++}`,
          type: 'assistant',
          content: `**Key Points:**
${selectedFile.keyPoints.map(point => `• ${point}`).join('\n')}`,
          timestamp: new Date(),
          fileId: selectedFile.id,
          analysisType: 'insights',
        });
      }

      if (selectedFile.vendorAccountability && selectedFile.vendorAccountability.length > 0) {
        messageQueue.push({
          id: `cached-vendorAccountability-${baseTimestamp}-${messageCounter++}`,
          type: 'assistant',
          content: `**Vendor Responsibilities:**
${selectedFile.vendorAccountability.map(item => `• ${item}`).join('\n')}`,
          timestamp: new Date(),
          fileId: selectedFile.id,
          analysisType: 'insights',
        });
      }

      if (selectedFile.importantDates && selectedFile.importantDates.length > 0) {
        messageQueue.push({
          id: `cached-importantDates-${baseTimestamp}-${messageCounter++}`,
          type: 'assistant',
          content: `**Important Dates:**
${selectedFile.importantDates.map(date => `• ${date}`).join('\n')}`,
          timestamp: new Date(),
          fileId: selectedFile.id,
          analysisType: 'insights',
        });
      }

      if (selectedFile.paymentTerms && selectedFile.paymentTerms.length > 0) {
        messageQueue.push({
          id: `cached-paymentTerms-${baseTimestamp}-${messageCounter++}`,
          type: 'assistant',
          content: `**Payment Terms:**
${selectedFile.paymentTerms.map(term => `• ${term}`).join('\n')}`,
          timestamp: new Date(),
          fileId: selectedFile.id,
          analysisType: 'insights',
        });
      }

      // REMOVED: Suggested questions are now displayed outside the chat area

      // For cached results, show messages instantly with no animations
      const cachedMessages = messageQueue.map(msg => ({ 
        ...msg, 
        displayContent: msg.content, 
        isGenerating: false 
      }));
      
      // For cached results, show the real analysis messages instantly
      setMessages(cachedMessages);
      
      setIsAnalyzing(false);
      
    } else {

      // File not analyzed yet - trigger real AI analysis
      setIsAnalyzing(true);
      setMessages([]);
      
      // Show loading message
      setMessages([{
        id: 'loading',
        type: 'assistant',
        content: 'Analyzing your file...',
        timestamp: new Date(),
        fileId: selectedFile.id,
        analysisType: 'loading',
        displayContent: '',
        isGenerating: true,
      }]);

      try {
        // Trigger the actual AI analysis
        await onAnalyzeFile(selectedFile.id, 'comprehensive');
        
        // After analysis completes, display results sequentially
        displayAnalysisResultsSequentially();
      } catch (error) {
        console.error('Error analyzing file:', error);
        setMessages([{
          id: 'error',
          type: 'assistant',
          content: 'Sorry, I encountered an error analyzing your file. Please try again.',
          timestamp: new Date(),
          fileId: selectedFile.id,
          analysisType: 'summary',
          displayContent: 'Sorry, I encountered an error analyzing your file. Please try again.',
          isGenerating: false,
        }]);
        setIsAnalyzing(false);
      }
    }
  };

  // Display analysis results sequentially after AI analysis completes
  const displayAnalysisResultsSequentially = async () => {
    if (!selectedFile) return;

    // Clear any loading messages first
    setMessages([]);
    setIsAnalyzing(false);

    // Wait a moment for the file data to be updated
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Create message queue for sequential display
    const messageQueue: AIAnalysisMessage[] = [];
    
    // Use a unique base timestamp and increment for each message
    const baseTimestamp = Date.now();
    let messageCounter = 0;
    
    // Always add welcome message first
    messageQueue.push({
      id: `welcome-${baseTimestamp}-${messageCounter++}`,
      type: 'assistant',
      content: `I've analyzed your file "${selectedFile.name}". Here's what I found:`,
      timestamp: new Date(),
      fileId: selectedFile.id,
      analysisType: 'summary',
    });

    // Add analysis summary
    messageQueue.push({
      id: `analysis-${baseTimestamp}-${messageCounter++}`,
      type: 'assistant',
      content: selectedFile.aiSummary || 'Analysis completed. Ask me anything about this file!',
      timestamp: new Date(),
      fileId: selectedFile.id,
      analysisType: 'summary',
    });

    // Add structured analysis results if available
    if (selectedFile.keyPoints && selectedFile.keyPoints.length > 0) {
      messageQueue.push({
        id: `keyPoints-${baseTimestamp}-${messageCounter++}`,
        type: 'assistant',
        content: `**Key Points:**
${selectedFile.keyPoints.map(point => `• ${point}`).join('\n')}`,
        timestamp: new Date(),
        fileId: selectedFile.id,
        analysisType: 'insights',
      });
    }

    if (selectedFile.vendorAccountability && selectedFile.vendorAccountability.length > 0) {
      messageQueue.push({
        id: `vendorAccountability-${baseTimestamp}-${messageCounter++}`,
        type: 'assistant',
        content: `**Vendor Responsibilities:**
${selectedFile.vendorAccountability.map(item => `• ${item}`).join('\n')}`,
        timestamp: new Date(),
        fileId: selectedFile.id,
        analysisType: 'insights',
      });
    }

    if (selectedFile.importantDates && selectedFile.importantDates.length > 0) {
      messageQueue.push({
        id: `importantDates-${baseTimestamp}-${messageCounter++}`,
        type: 'assistant',
        content: `**Important Dates:**
${selectedFile.importantDates.map(date => `• ${date}`).join('\n')}`,
        timestamp: new Date(),
        fileId: selectedFile.id,
        analysisType: 'insights',
      });
    }

    if (selectedFile.paymentTerms && selectedFile.paymentTerms.length > 0) {
      messageQueue.push({
        id: `paymentTerms-${baseTimestamp}-${messageCounter++}`,
        type: 'assistant',
        content: `**Payment Terms:**
${selectedFile.paymentTerms.map(term => `• ${term}`).join('\n')}`,
        timestamp: new Date(),
        fileId: selectedFile.id,
        analysisType: 'insights',
      });
    }

    // REMOVED: Suggested questions are now displayed outside the chat area

    // Process messages sequentially with typewriting
    processMessageQueue(messageQueue);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedFile || isLoading) return;

    const userMessage: AIAnalysisMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      fileId: selectedFile.id,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await onAskQuestion(selectedFile.id, inputValue.trim());
      
      const assistantMessage: AIAnalysisMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date(),
        fileId: selectedFile.id,
        analysisType: 'custom',
      };

      // Add message with skeleton loading state
      addMessageWithSkeleton(assistantMessage, 0);
    } catch (error) {
      const errorMessage: AIAnalysisMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error processing your question. Please try again.',
        timestamp: new Date(),
        fileId: selectedFile.id,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // REMOVED: Typewriting animation function (no longer needed)

  // Add message with skeleton loading state (no typewriting)
  const addMessageWithSkeleton = (message: AIAnalysisMessage, delay: number = 0) => {
    setTimeout(() => {
      setMessages(prev => [...prev, { ...message, displayContent: '', isGenerating: true }]);
      
      // Show full content after skeleton pause
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === message.id 
            ? { ...msg, displayContent: msg.content, isGenerating: false }
            : msg
        ));
      }, 600);
    }, delay);
  };

  // Process message queue sequentially with skeleton states (no typewriting)
  const processMessageQueue = (messageQueue: AIAnalysisMessage[]) => {
    let currentIndex = 0;
    const DELAY_BETWEEN_MESSAGES = 800; // Time between starting each message
    
    const processNextMessage = () => {
      if (currentIndex >= messageQueue.length) {
        setIsAnalyzing(false); // All messages processed
        return;
      }
      
      const message = messageQueue[currentIndex];
      
      // Add message with skeleton loading state
      setMessages(prev => [...prev, { 
        ...message, 
        displayContent: '', 
        isGenerating: true 
      }]);
      
      // Wait for skeleton to show, then display full content
      setTimeout(() => {
        // Show full content instantly (no typewriting)
        setMessages(prev => prev.map(msg => 
          msg.id === message.id 
            ? { ...msg, displayContent: msg.content, isGenerating: false }
            : msg
        ));
        
        // Wait before starting next message
        setTimeout(() => {
          currentIndex++;
          processNextMessage();
        }, DELAY_BETWEEN_MESSAGES);
      }, 600); // Skeleton shows for 600ms
    };
    
    // Start processing the first message
    processNextMessage();
  };

  const handleReanalyze = async () => {
    if (!selectedFile || isAnalyzing) return;
    
    // Reset the file's processed status to trigger fresh analysis
    try {
      setIsAnalyzing(true);
      setMessages([]);
      
      // Show loading message
      setMessages([{
        id: 'loading',
        type: 'assistant',
        content: 'Re-analyzing your file...',
        timestamp: new Date(),
        fileId: selectedFile.id,
        analysisType: 'loading',
        displayContent: '',
        isGenerating: true,
      }]);

      // Trigger fresh AI analysis
      await onAnalyzeFile(selectedFile.id, 'comprehensive');
      
      // After analysis completes, display results sequentially
      displayAnalysisResultsSequentially();
    } catch (error) {
      console.error('Error re-analyzing file:', error);
      setMessages([{
        id: 'error',
        type: 'assistant',
        content: 'Sorry, I encountered an error re-analyzing your file. Please try again.',
        timestamp: new Date(),
        fileId: selectedFile.id,
        analysisType: 'summary',
        displayContent: 'Sorry, I encountered an error re-analyzing your file. Please try again.',
        isGenerating: false,
      }]);
      setIsAnalyzing(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    if (!selectedFile || isLoading || isAnalyzing) return;
    
    // Set the question as input value and send it
    setInputValue(question);
    
    // Send the message immediately
    const userMessage: AIAnalysisMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: question,
      timestamp: new Date(),
      fileId: selectedFile.id,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Process the question
    onAskQuestion(selectedFile.id, question).then(response => {
      const assistantMessage: AIAnalysisMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date(),
        fileId: selectedFile.id,
        analysisType: 'custom',
      };

      // Add message with skeleton loading state
      addMessageWithSkeleton(assistantMessage, 0);
    }).catch(error => {
      const errorMessage: AIAnalysisMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error processing your question. Please try again.',
        timestamp: new Date(),
        fileId: selectedFile.id,
      };
      setMessages(prev => [...prev, errorMessage]);
    }).finally(() => {
      setIsLoading(false);
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Skeleton loading component for messages
  const MessageSkeleton = () => (
    <div className="flex justify-start mb-[12px] group">
      <div className="flex flex-col items-start w-full max-w-[90%]">
        <div className="relative break-words whitespace-pre-wrap rounded-[15px] p-3 bg-gray-100 text-gray-800 self-start border border-gray-300 border-[0.5px] rounded-[15px_15px_15px_0]">
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Bot className="w-3 h-3 text-[#A85C36]" />
            Paige
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMessage = (message: AIAnalysisMessage) => {
    const isUser = message.type === 'user';
    
    // Show skeleton loading when message is generating and has no display content
    if (message.isGenerating && !message.displayContent && message.analysisType !== 'loading') {
      return (
        <div key={message.id} className="flex justify-start mb-[12px] group">
          <div className="flex flex-col items-start w-full max-w-[90%]">
            <div className="relative break-words whitespace-pre-wrap rounded-[15px] p-3 bg-gray-100 text-gray-800 self-start border border-gray-300 border-[0.5px] rounded-[15px_15px_15px_0]">
              <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Bot className="w-3 h-3 text-[#A85C36]" />
                Paige
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-[12px] group`}
      >
        <div className="flex flex-col items-end w-full max-w-[90%]">
          <div
            className={`relative break-words whitespace-pre-wrap rounded-[15px] p-3 ${
              isUser
                ? 'bg-white text-gray-800 border border-[#A85733] rounded-[15px_15px_0_15px] self-end'
                : 'bg-gray-100 text-gray-800 self-start border border-gray-300 border-[0.5px] rounded-[15px_15px_15px_0]'
            }`}
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
          >
            <div className="text-xs text-gray-500 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                {!isUser && (
                  <>
                    <Bot className="w-3 h-3 text-[#A85C36]" />
                    Paige
                  </>
                )}
                {isUser && (
                  <>
                    <User className="w-3 h-3 text-[#A85C36]" />
                    You
                  </>
                )}
              </span>
              <span className="text-xs text-gray-400">
                {formatTimestamp(message.timestamp)}
              </span>
            </div>
            
            <div className="text-sm leading-relaxed">
              {message.analysisType === 'loading' ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#A85C36]"></div>
                  <span>Analyzing your file...</span>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">
                  {message.displayContent || message.content}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!selectedFile) {
    return (
      <div className="h-full bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex-shrink-0 bg-white">
          <h3 className="text-lg font-semibold text-[#332B42] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#A85C36]" />
            Analyze with Paige
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Select a file to start analyzing
          </p>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-[#332B42] mb-2">
              No File Selected
            </h4>
            <p className="text-gray-500 text-sm">
              Choose a file from the list to analyze it with Paige
            </p>
          </div>
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
            <FileText className="w-5 h-5 text-[#A85C36] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-[#332B42] text-sm truncate">
                {selectedFile.name}
              </h4>
              <p className="text-xs text-gray-500">
                {selectedFile.fileType.toUpperCase()} • {(selectedFile.fileSize / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={handleReanalyze}
              disabled={isAnalyzing}
              className="btn-gradient-purple disabled:opacity-50 disabled:cursor-not-allowed"
              title="Re-analyze with AI (3 Credits)"
            >
              Re-analyze (3 Credits)
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 text-sm text-gray-400 relative">
        {messages.map(renderMessage)}
        
        {/* Show skeleton loading when analyzing and no messages yet */}
        {isAnalyzing && messages.length === 0 && (
          <div className="space-y-4">
            <MessageSkeleton />
            <MessageSkeleton />
            <MessageSkeleton />
          </div>
        )}
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start mb-[12px] group"
          >
            <div className="flex flex-col items-start w-full max-w-[90%]">
              <div className="relative break-words whitespace-pre-wrap rounded-[15px] p-3 bg-gray-100 text-gray-800 self-start border border-gray-300 border-[0.5px] rounded-[15px_15px_15px_0]">
                <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Bot className="w-3 h-3 text-[#A85C36]" />
                  Paige
                </div>
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-[#332B42]">Analyzing...</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions - Outside Chat Area */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 mb-2 font-medium text-right">💡 Suggested Questions (1 Credit each):</div>
        <div className="flex flex-wrap gap-2 justify-end">
          {[
            "What are the key payment terms?",
            "When are the important deadlines?",
            "What are the vendor's responsibilities?",
            "Are there any cancellation policies?",
            "What should I watch out for?"
          ].map((question, index) => (
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

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0 bg-white">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about this file... (1 Credit per question)"
              disabled={isLoading || isAnalyzing}
              className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-[15px] text-[#332B42] focus:outline-none focus:border-[#A85C36] focus:ring-1 focus:ring-[#A85C36] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || isAnalyzing}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-[#A85C36] hover:text-[#332B42] disabled:opacity-50 disabled:cursor-not-allowed rounded-full hover:bg-gray-100 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-end mt-3">
          <p className="text-xs text-gray-500">
            Press Enter to send
          </p>
        </div>
      </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIFileAnalyzer; 