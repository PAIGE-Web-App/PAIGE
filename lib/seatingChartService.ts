import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  orderBy,
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { SeatingChart } from '@/types/seatingChart';

/**
 * Save a seating chart to Firestore
 */
export const saveSeatingChart = async (chart: Omit<SeatingChart, 'id'>, userId: string): Promise<string> => {
  try {
    const chartData = {
      ...chart,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      userId
    };

    const docRef = await addDoc(collection(db, 'users', userId, 'seatingCharts'), chartData);
    return docRef.id;
  } catch (error) {
    console.error('Error saving seating chart:', error);
    throw new Error('Failed to save seating chart');
  }
};

/**
 * Update an existing seating chart
 */
export const updateSeatingChart = async (chartId: string, chart: Partial<SeatingChart>, userId: string): Promise<void> => {
  try {
    const chartRef = doc(db, 'users', userId, 'seatingCharts', chartId);
    await updateDoc(chartRef, {
      ...chart,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating seating chart:', error);
    throw new Error('Failed to update seating chart');
  }
};

/**
 * Get all seating charts for a user
 */
export const getSeatingCharts = async (userId: string): Promise<SeatingChart[]> => {
  try {
    // Get all documents without orderBy to avoid requiring a Firestore index
    const querySnapshot = await getDocs(collection(db, 'users', userId, 'seatingCharts'));
    
    const charts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as SeatingChart[];
    
    // Sort by updatedAt in JavaScript instead of Firestore
    return charts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch (error) {
    console.error('Error fetching seating charts:', error);
    throw new Error('Failed to fetch seating charts');
  }
};

/**
 * Get a specific seating chart by ID
 */
export const getSeatingChart = async (chartId: string, userId: string): Promise<SeatingChart | null> => {
  try {
    const chartRef = doc(db, 'users', userId, 'seatingCharts', chartId);
    const chartSnap = await getDoc(chartRef);
    
    if (chartSnap.exists()) {
      return {
        id: chartSnap.id,
        ...chartSnap.data(),
        createdAt: chartSnap.data().createdAt?.toDate() || new Date(),
        updatedAt: chartSnap.data().updatedAt?.toDate() || new Date()
      } as SeatingChart;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching seating chart:', error);
    console.error('Chart ID:', chartId);
    console.error('User ID:', userId);
    console.error('Error details:', error);
    throw new Error(`Failed to fetch seating chart: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Delete a seating chart
 */
export const deleteSeatingChart = async (chartId: string, userId: string): Promise<void> => {
  try {
    const chartRef = doc(db, 'users', userId, 'seatingCharts', chartId);
    await deleteDoc(chartRef);
  } catch (error) {
    console.error('Error deleting seating chart:', error);
    throw new Error('Failed to delete seating chart');
  }
};
