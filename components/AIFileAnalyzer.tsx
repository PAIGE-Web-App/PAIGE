import React, { useState, useRef, useEffect } from 'react';
import { FileItem } from '@/types/files';
import { Send, FileText, Sparkles, MessageSquare, Bot, User, Loader2, Download, Eye, Trash2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';

interface AIAnalysisMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  fileId?: string;
  analysisType?: 'summary' | 'insights' | 'questions' | 'custom';
}

interface AIFileAnalyzerProps {
  selectedFile: FileItem | null;
  onClose: () => void;
  onAnalyzeFile: (fileId: string, analysisType: string) => Promise<void>;
  onAskQuestion: (fileId: string, question: string) => Promise<string>;
}

const AIFileAnalyzer: React.FC<AIFileAnalyzerProps> = ({
  selectedFile,
  onClose,
  onAnalyzeFile,
  onAskQuestion,
}) => {
  const [messages, setMessages] = useState<AIAnalysisMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (selectedFile && messages.length === 0) {
      initializeFileAnalysis();
    }
  }, [selectedFile]);

  const initializeFileAnalysis = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    
    // Add welcome message
    const welcomeMessage: AIAnalysisMessage = {
      id: 'welcome',
      type: 'assistant',
      content: `I've analyzed your file "${selectedFile.name}". Here's what I found:`,
      timestamp: new Date(),
      fileId: selectedFile.id,
      analysisType: 'summary',
    };

    setMessages([welcomeMessage]);

    try {
      // Trigger initial analysis
      await onAnalyzeFile(selectedFile.id, 'comprehensive');
      
      // Add analysis results
      const analysisMessage: AIAnalysisMessage = {
        id: 'analysis',
        type: 'assistant',
        content: selectedFile.aiSummary || 'Analysis completed. Ask me anything about this file!',
        timestamp: new Date(),
        fileId: selectedFile.id,
        analysisType: 'summary',
      };

      setMessages(prev => [...prev, analysisMessage]);

      // Add suggested questions
      const suggestionsMessage: AIAnalysisMessage = {
        id: 'suggestions',
        type: 'assistant',
        content: `💡 **Suggested Questions:**
• What are the key payment terms?
• When are the important deadlines?
• What are the vendor's responsibilities?
• Are there any cancellation policies?
• What should I watch out for?`,
        timestamp: new Date(),
        fileId: selectedFile.id,
        analysisType: 'questions',
      };

      setMessages(prev => [...prev, suggestionsMessage]);

    } catch (error) {
      const errorMessage: AIAnalysisMessage = {
        id: 'error',
        type: 'assistant',
        content: 'Sorry, I encountered an error analyzing this file. Please try again.',
        timestamp: new Date(),
        fileId: selectedFile.id,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAnalyzing(false);
    }
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

      setMessages(prev => [...prev, assistantMessage]);
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

  const renderMessage = (message: AIAnalysisMessage) => {
    const isUser = message.type === 'user';
    
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        {!isUser && (
          <div className="w-8 h-8 bg-[#A85C36] rounded-full flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
        )}
        
        <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
          <div className={`rounded-[5px] p-3 ${
            isUser 
              ? 'bg-[#A85C36] text-white' 
              : 'bg-[#F8F6F4] text-[#332B42] border border-[#E0DBD7]'
          }`}>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </div>
          </div>
          <div className={`text-xs text-[#AB9C95] mt-1 ${
            isUser ? 'text-right' : 'text-left'
          }`}>
            {formatTimestamp(message.timestamp)}
          </div>
        </div>

        {isUser && (
          <div className="w-8 h-8 bg-[#332B42] rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
        )}
      </motion.div>
    );
  };

  if (!selectedFile) {
    return (
      <div className="h-full bg-white border-l border-[#E0DBD7] flex flex-col">
        <div className="p-6 border-b border-[#E0DBD7]">
          <h3 className="text-lg font-playfair font-semibold text-[#332B42] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#A85C36]" />
            AI File Analyzer
          </h3>
          <p className="text-sm text-[#AB9C95] mt-1">
            Select a file to start analyzing
          </p>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <FileText className="w-16 h-16 text-[#AB9C95] mx-auto mb-4" />
            <h4 className="text-lg font-medium text-[#332B42] mb-2">
              No File Selected
            </h4>
            <p className="text-[#AB9C95] text-sm">
              Choose a file from the list to analyze it with AI
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white border-l border-[#E0DBD7] flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-[#E0DBD7] flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-playfair font-semibold text-[#332B42] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#A85C36]" />
            AI File Analyzer
          </h3>
          <button
            onClick={onClose}
            className="text-[#AB9C95] hover:text-[#332B42] p-1 rounded-full"
          >
            <Plus className="w-4 h-4 rotate-45" />
          </button>
        </div>
        
        {/* Selected File Info */}
        <div className="bg-[#F8F6F4] rounded-[5px] p-3 border border-[#E0DBD7]">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-[#A85C36] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-[#332B42] text-sm truncate">
                {selectedFile.name}
              </h4>
              <p className="text-xs text-[#AB9C95]">
                {selectedFile.fileType.toUpperCase()} • {(selectedFile.fileSize / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <AnimatePresence>
          {messages.map(renderMessage)}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 justify-start mb-4"
          >
            <div className="w-8 h-8 bg-[#A85C36] rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-[#F8F6F4] rounded-[5px] p-3 border border-[#E0DBD7]">
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-[#332B42]">Analyzing...</span>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-[#E0DBD7] flex-shrink-0">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about this file..."
              disabled={isLoading || isAnalyzing}
              className="w-full pl-4 pr-12 py-3 border border-[#E0DBD7] rounded-[5px] text-[#332B42] focus:outline-none focus:border-[#A85C36] disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || isAnalyzing}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-[#A85C36] hover:text-[#332B42] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-[#AB9C95]">
            Press Enter to send
          </p>
          <div className="flex items-center gap-2 text-xs text-[#AB9C95]">
            <MessageSquare className="w-3 h-3" />
            {messages.filter(m => m.type === 'user').length} questions
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIFileAnalyzer; 