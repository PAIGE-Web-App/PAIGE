"use client";

import React, { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Edit, Trash2, Send, X } from 'lucide-react';
import { useVendorComments } from '@/hooks/useVendorComments';
import { type VendorComment } from '@/lib/vendorComments';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import MentionAutocomplete from './MentionAutocomplete';
import { getMentionableUsers, getMentionSearchTerm, isInMention, parseMentions, type MentionableUser } from '@/utils/mentionUtils';
import UpgradePlanModal from './UpgradePlanModal';

interface VendorCommentsProps {
  vendorId: string;
  vendorName: string;
}

export default function VendorComments({ vendorId, vendorName }: VendorCommentsProps) {
  const { user, profileImageUrl } = useAuth();
  const { partnerName, partnerEmail, plannerName, plannerEmail } = useUserProfileData();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  const {
    comments,
    loading,
    error,
    submitting,
    addComment,
    updateComment,
    deleteComment
  } = useVendorComments(vendorId);

  // @mention functionality
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [textareaRef] = useState(() => React.createRef<HTMLTextAreaElement>());

  // Comment editing
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showMenu, setShowMenu] = useState<string | null>(null);

  // Premium features
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'mentions' | 'collaboration'>('mentions');
  
  // Get mentionable users
  const mentionableUsers = getMentionableUsers(
    user?.uid || '',
    user?.displayName || '',
    partnerName,
    partnerEmail,
    plannerName,
    plannerEmail
  ).map(user => ({
    ...user,
    avatar: user.id === 'partner' ? undefined : undefined // Could add partner/planner avatars later
  }));

  // Check if user has premium features
  const hasPremiumFeatures = () => {
    // Check if partner/planner names are set up (emails are optional for @mentions)
    // In a real implementation, this would check subscription status
    return (partnerName && partnerName.trim()) || (plannerName && plannerName.trim());
  };

  // Check if @mentions are allowed
  const canUseMentions = () => {
    return hasPremiumFeatures();
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    await addComment(newComment, vendorName);
    setNewComment('');
    showSuccessToast('Comment added successfully!');
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    await updateComment(commentId, editContent);
    setEditingComment(null);
    setEditContent('');
    setShowMenu(null);
    showSuccessToast('Comment updated successfully!');
  };

  const handleDeleteComment = async (commentId: string) => {
    if (confirm('Are you sure you want to delete this comment?')) {
      await deleteComment(commentId);
      setShowMenu(null);
      showSuccessToast('Comment deleted successfully!');
    }
  };

  const startEditing = (comment: VendorComment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
    setShowMenu(null);
  };

  const cancelEditing = () => {
    setEditingComment(null);
    setEditContent('');
  };

  // Handle textarea input for @mentions
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewComment(value);
    
    const cursorPos = e.target.selectionStart;
    setCursorPosition(cursorPos);
    
    // Check for @ symbol
    const mentionSearch = getMentionSearchTerm(value, cursorPos);
    
    if (mentionSearch) {
      setMentionSearchTerm(mentionSearch.searchTerm);
      setShowMentionAutocomplete(true);
    } else {
      setShowMentionAutocomplete(false);
    }
  };

  // Handle @mention selection
  const handleMentionSelect = (selectedUser: MentionableUser) => {
    
    if (!canUseMentions()) {
      setUpgradeReason('mentions');
      setShowUpgradeModal(true);
      return;
    }

    const beforeMention = newComment.substring(0, cursorPosition);
    const afterMention = newComment.substring(cursorPosition);
    
    // Find the @ symbol position
    const atIndex = beforeMention.lastIndexOf('@');
    if (atIndex === -1) return;
    
    const newValue = beforeMention.substring(0, atIndex) + `@${selectedUser.name} ` + afterMention;
    setNewComment(newValue);
    setShowMentionAutocomplete(false);
    
    // Focus back to textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = atIndex + selectedUser.name.length + 2; // +2 for @ and space
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Close mention autocomplete
  const closeMentionAutocomplete = () => {
    setShowMentionAutocomplete(false);
    setMentionSearchTerm('');
  };

  // Handle textarea click to close autocomplete
  const handleTextareaClick = () => {
    if (!isInMention(newComment, cursorPosition)) {
      closeMentionAutocomplete();
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu && !(event.target as Element).closest('.comment-menu')) {
        setShowMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const formatDate = (timestamp: any) => {
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-playfair font-medium text-[#332B42] mb-4">
          Comments
        </h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm h-full flex flex-col">
      <h6 className="mb-4">
        Comments
      </h6>
      
                        <div className="mb-4 p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg text-white text-xs">
                    <p>💡 Upgrade to enable @mention notifications for your partner and wedding planner</p>
                  </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Comments List - Scrollable area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-6">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-b border-gray-100 pb-4 last:border-b-0">
              {editingComment === comment.id ? (
                // Edit Mode
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-3 border border-[#AB9C95] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#A85C36] focus:border-transparent"
                    rows={3}
                    placeholder="Edit your comment..."
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditComment(comment.id)}
                      disabled={!editContent.trim()}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#A85C36] text-white rounded-lg hover:bg-[#784528] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      <Send className="w-3 h-3" />
                      Save
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {comment.authorAvatar ? (
                      <img
                        src={comment.authorAvatar}
                        alt={comment.authorName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#A85C36] text-white text-xs font-medium flex items-center justify-center">
                        {getInitials(comment.authorName)}
                      </div>
                    )}
                  </div>

                  {/* Comment Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#332B42]">
                          {comment.authorId === user?.uid ? 'You' : comment.authorName}
                        </span>
                        {comment.isEdited && (
                          <span className="text-xs text-gray-500">(edited)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {formatDate(comment.createdAt)}
                        </span>
                        {comment.authorId === user?.uid && (
                          <div className="relative comment-menu">
                                                          <button
                                onClick={() => setShowMenu(showMenu === comment.id ? null : comment.id)}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                              >
                                <MoreHorizontal size={16} className="text-gray-500" />
                              </button>
                            
                            {showMenu === comment.id && (
                              <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-32">
                                <button
                                  onClick={() => startEditing(comment)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <Edit className="w-3 h-3" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-[#364257] leading-relaxed">
                      {comment.content.split(' ').map((word, index) => {
                        if (word.startsWith('@')) {
                          const mentionedUser = mentionableUsers.find(user => 
                            `@${user.name}` === word
                          );
                          if (mentionedUser) {
                            return (
                              <span key={index}>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#A85C36] text-white text-xs rounded-full">
                                  {word}
                                </span>
                                {' '}
                              </span>
                            );
                          }
                        }
                        return <span key={index}>{word} </span>;
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Comment Form - Fixed at bottom */}
      <form onSubmit={handleSubmitComment} className="space-y-3 mt-auto pt-4 border-t border-gray-100">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={handleTextareaInput}
            onClick={handleTextareaClick}
            placeholder="Add a comment. To tag your partner or planner, type @ and select their name."
            className="w-full p-3 border border-[#AB9C95] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#A85C36] focus:border-transparent font-work text-sm"
            rows={3}
            disabled={submitting}
          />
          
          {/* @mention autocomplete */}
          {showMentionAutocomplete && (
            <MentionAutocomplete
              searchTerm={mentionSearchTerm}
              mentionableUsers={mentionableUsers}
              onSelectUser={handleMentionSelect}
              onClose={closeMentionAutocomplete}
            />
          )}
        </div>
        
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="btn-primary"
          >
            <span>
              {submitting ? 'Sending...' : 'Send'}
            </span>
            <Send className="w-3 h-3" />
          </button>
        </div>
      </form>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradePlanModal
          reason={upgradeReason}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
} 