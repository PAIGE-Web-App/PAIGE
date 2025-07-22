// lib/vendorComments.ts
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  Timestamp,
  DocumentData,
  QuerySnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, getUserCollectionRef } from './firebase';
import { extractMentionedUsers } from './mentionNotifications';

export interface VendorComment {
  id: string;
  vendorId: string;
  vendorName: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isEdited: boolean;
  mentionedUsers?: string[]; // Track mentioned users for notifications
}

export interface CreateCommentData {
  vendorId: string;
  vendorName: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  mentionedUsers?: string[];
}

/**
 * Get real-time comments for a specific vendor
 * @param userId - The user ID
 * @param vendorId - The vendor's place ID
 * @param callback - Function to call when comments update
 * @returns Unsubscribe function
 */
export function getVendorComments(
  userId: string, 
  vendorId: string, 
  callback: (comments: VendorComment[]) => void
): Unsubscribe {
  const commentsRef = getUserCollectionRef<VendorComment>('vendorComments', userId);
  const q = query(
    commentsRef,
    where('vendorId', '==', vendorId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const comments: VendorComment[] = [];
    snapshot.forEach((doc) => {
      comments.push({
        id: doc.id,
        ...doc.data()
      } as VendorComment);
    });
    callback(comments);
  });
}

/**
 * Add a new comment for a vendor
 * @param userId - The user ID
 * @param commentData - The comment data
 * @returns Promise with the new comment ID
 */
export async function addVendorComment(
  userId: string, 
  commentData: CreateCommentData
): Promise<string> {
  const commentsRef = getUserCollectionRef<VendorComment>('vendorComments', userId);
  
  // Extract mentioned users from comment content
  const mentionedUsers = extractMentionedUsers(commentData.content);
  
  const newComment = {
    ...commentData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    isEdited: false,
    ...(mentionedUsers.length > 0 && { mentionedUsers })
  };

  const docRef = await addDoc(commentsRef, newComment as any);
  return docRef.id;
}

/**
 * Update an existing comment
 * @param userId - The user ID
 * @param commentId - The comment ID
 * @param content - The new content
 * @returns Promise<void>
 */
export async function updateVendorComment(
  userId: string, 
  commentId: string, 
  content: string
): Promise<void> {
  const commentRef = doc(getUserCollectionRef<VendorComment>('vendorComments', userId), commentId);
  
  await updateDoc(commentRef, {
    content,
    updatedAt: Timestamp.now(),
    isEdited: true
  });
}

/**
 * Delete a comment
 * @param userId - The user ID
 * @param commentId - The comment ID
 * @returns Promise<void>
 */
export async function deleteVendorComment(
  userId: string, 
  commentId: string
): Promise<void> {
  const commentRef = doc(getUserCollectionRef<VendorComment>('vendorComments', userId), commentId);
  await deleteDoc(commentRef);
}

/**
 * Get all comments for a user (for vendor hub page)
 * @param userId - The user ID
 * @param callback - Function to call when comments update
 * @returns Unsubscribe function
 */
export function getAllUserComments(
  userId: string, 
  callback: (comments: VendorComment[]) => void
): Unsubscribe {
  const commentsRef = getUserCollectionRef<VendorComment>('vendorComments', userId);
  const q = query(
    commentsRef,
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const comments: VendorComment[] = [];
    snapshot.forEach((doc) => {
      comments.push({
        id: doc.id,
        ...doc.data()
      } as VendorComment);
    });
    callback(comments);
  });
} 