// hooks/useVendorComments.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getVendorComments, 
  addVendorComment, 
  updateVendorComment, 
  deleteVendorComment,
  getAllUserComments,
  type VendorComment,
  type CreateCommentData
} from '@/lib/vendorComments';

export function useVendorComments(vendorId?: string) {
  const { user, profileImageUrl } = useAuth();
  const [comments, setComments] = useState<VendorComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Subscribe to comments for a specific vendor
  useEffect(() => {
    if (!user?.uid || !vendorId) {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = getVendorComments(user.uid, vendorId, (newComments) => {
      setComments(newComments);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, vendorId]);

  // Add a new comment
  const addComment = useCallback(async (content: string, vendorName: string) => {
    if (!user?.uid || !vendorId || !content.trim()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const commentData: CreateCommentData = {
        vendorId,
        vendorName,
        content: content.trim(),
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorAvatar: profileImageUrl || user.photoURL || undefined
      };

      await addVendorComment(user.uid, commentData);
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [user?.uid, user?.displayName, user?.photoURL, profileImageUrl, vendorId]);

  // Update a comment
  const updateComment = useCallback(async (commentId: string, content: string) => {
    if (!user?.uid || !content.trim()) {
      return;
    }

    setError(null);

    try {
      await updateVendorComment(user.uid, commentId, content.trim());
    } catch (err) {
      console.error('Error updating comment:', err);
      setError('Failed to update comment. Please try again.');
    }
  }, [user?.uid]);

  // Delete a comment
  const deleteComment = useCallback(async (commentId: string) => {
    if (!user?.uid) {
      return;
    }

    setError(null);

    try {
      await deleteVendorComment(user.uid, commentId);
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError('Failed to delete comment. Please try again.');
    }
  }, [user?.uid]);

  return {
    comments,
    loading,
    error,
    submitting,
    addComment,
    updateComment,
    deleteComment
  };
}

// Hook for all user comments (vendor hub page)
export function useAllVendorComments() {
  const { user } = useAuth();
  const [comments, setComments] = useState<VendorComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = getAllUserComments(user.uid, (newComments) => {
      setComments(newComments);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  return {
    comments,
    loading,
    error
  };
} 