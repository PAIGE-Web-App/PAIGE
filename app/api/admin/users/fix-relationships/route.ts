import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, adminAuth } from '@/lib/firebaseAdmin';

const db = getAdminDb();

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Check if user has admin privileges
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    if (!['admin', 'super_admin', 'moderator'].includes(userData?.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    console.log('🔧 Starting user relationship data fix...');
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];
    
    console.log(`📊 Found ${users.length} users to process`);
    
    // Debug: Log Davey Jones data specifically
    const daveyJones = users.find(u => u.email === 'dave.yoon92@gmail.com');
    if (daveyJones) {
      console.log('🔍 Davey Jones data:', {
        id: daveyJones.id,
        email: daveyJones.email,
        partnerId: daveyJones.partnerId,
        partnerEmail: daveyJones.partnerEmail,
        partnerName: daveyJones.partnerName,
        plannerId: daveyJones.plannerId,
        plannerEmail: daveyJones.plannerEmail,
        plannerName: daveyJones.plannerName,
        weddingDate: daveyJones.weddingDate,
        metadata: daveyJones.metadata,
        isLinked: daveyJones.isLinked,
        hasPlanner: daveyJones.hasPlanner
      });
    }
    
    let updatedCount = 0;
    let errors: any[] = [];
    
    for (const user of users) {
      try {
        const updates: any = {};
        let hasUpdates = false;
        
        // Fix wedding date - check multiple possible locations
        if (!user.weddingDate && user.metadata?.weddingDate) {
          updates.weddingDate = user.metadata.weddingDate;
          hasUpdates = true;
          console.log(`📅 Fixed wedding date for ${user.email}: ${user.metadata.weddingDate}`);
        }
        
        // Debug: Log what we're checking for wedding date
        if (user.email === 'dave.yoon92@gmail.com') {
          console.log(`🔍 Wedding date check for ${user.email}:`, {
            hasWeddingDate: !!user.weddingDate,
            weddingDate: user.weddingDate,
            hasMetadataWeddingDate: !!user.metadata?.weddingDate,
            metadataWeddingDate: user.metadata?.weddingDate
          });
        }
        
        // Fix partner relationships - check if user has partnerId but missing other fields
        if (user.partnerId && (!user.partnerEmail || !user.partnerName || !user.isLinked)) {
          const partnerDoc = await db.collection('users').doc(user.partnerId).get();
          if (partnerDoc.exists) {
            const partnerData = partnerDoc.data();
            if (partnerData) {
              updates.partnerEmail = partnerData.email;
              updates.partnerName = partnerData.displayName || partnerData.userName;
              updates.isLinked = true;
              hasUpdates = true;
              console.log(`💕 Fixed partner data for ${user.email}: ${partnerData.email}`);
            }
          }
        }
        
        // Fix partner relationships - check if user has partnerName but missing other fields
        if (user.partnerName && !user.partnerId && !user.isLinked) {
          // Try to find partner by name or email
          const partnerQuery = await db.collection('users')
            .where('displayName', '==', user.partnerName)
            .limit(1)
            .get();
          
          if (!partnerQuery.empty) {
            const partnerDoc = partnerQuery.docs[0];
            const partnerData = partnerDoc.data();
            updates.partnerId = partnerDoc.id;
            updates.partnerEmail = partnerData.email;
            updates.isLinked = true;
            hasUpdates = true;
            console.log(`💕 Fixed partner ID for ${user.email}: found partner ${partnerData.email}`);
          }
        }
        
        // Debug: Log what we're checking for partner
        if (user.email === 'dave.yoon92@gmail.com') {
          console.log(`🔍 Partner check for ${user.email}:`, {
            hasPartnerId: !!user.partnerId,
            partnerId: user.partnerId,
            hasPartnerEmail: !!user.partnerEmail,
            partnerEmail: user.partnerEmail,
            hasPartnerName: !!user.partnerName,
            partnerName: user.partnerName,
            isLinked: user.isLinked
          });
        }
        
        // Fix planner relationships - check if user has plannerId but missing other fields
        if (user.plannerId && (!user.plannerEmail || !user.plannerName || !user.hasPlanner)) {
          const plannerDoc = await db.collection('users').doc(user.plannerId).get();
          if (plannerDoc.exists) {
            const plannerData = plannerDoc.data();
            if (plannerData) {
              updates.plannerEmail = plannerData.email;
              updates.plannerName = plannerData.displayName || plannerData.userName;
              updates.hasPlanner = true;
              hasUpdates = true;
              console.log(`👨‍💼 Fixed planner data for ${user.email}: ${plannerData.email}`);
            }
          }
        }
        
        // Fix planner relationships - check if user has plannerName but missing other fields
        if (user.plannerName && !user.plannerId && !user.hasPlanner) {
          // Try to find planner by name
          const plannerQuery = await db.collection('users')
            .where('displayName', '==', user.plannerName)
            .limit(1)
            .get();
          
          if (!plannerQuery.empty) {
            const plannerDoc = plannerQuery.docs[0];
            const plannerData = plannerDoc.data();
            updates.plannerId = plannerDoc.id;
            updates.plannerEmail = plannerData.email;
            updates.hasPlanner = true;
            hasUpdates = true;
            console.log(`👨‍💼 Fixed planner ID for ${user.email}: found planner ${plannerData.email}`);
          }
        }
        
        // Debug: Log what we're checking for planner
        if (user.email === 'dave.yoon92@gmail.com') {
          console.log(`🔍 Planner check for ${user.email}:`, {
            hasPlannerId: !!user.plannerId,
            plannerId: user.plannerId,
            hasPlannerEmail: !!user.plannerEmail,
            plannerEmail: user.plannerEmail,
            hasPlannerName: !!user.plannerName,
            plannerName: user.plannerName,
            hasPlanner: user.hasPlanner
          });
        }
        
        // Fix isLinked and hasPlanner flags if they're missing
        if (user.partnerId && !user.isLinked) {
          updates.isLinked = true;
          hasUpdates = true;
        }
        
        if (user.plannerId && !user.hasPlanner) {
          updates.hasPlanner = true;
          hasUpdates = true;
        }
        
        // Fix flags when names exist but IDs are missing
        if (user.partnerName && !user.isLinked) {
          updates.isLinked = true;
          hasUpdates = true;
        }
        
        if (user.plannerName && !user.hasPlanner) {
          updates.hasPlanner = true;
          hasUpdates = true;
        }
        
        // Update user if there are changes
        if (hasUpdates) {
          await db.collection('users').doc(user.id).update({
            ...updates,
            updatedAt: new Date()
          });
          updatedCount++;
        }
        
      } catch (error: any) {
        console.error(`❌ Error processing user ${user.email}:`, error.message);
        errors.push({ userId: user.id, email: user.email, error: error.message });
      }
    }
    
    console.log(`\n✅ Relationship data fix completed!`);
    console.log(`📈 Updated ${updatedCount} users`);
    
    if (errors.length > 0) {
      console.log(`❌ ${errors.length} errors encountered:`);
      errors.forEach(error => {
        console.log(`  - ${error.email}: ${error.error}`);
      });
    }
    
    // Generate summary report
    const summary = {
      totalUsers: users.length,
      updatedUsers: updatedCount,
      errors: errors.length,
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json({
      success: true,
      message: `Successfully fixed relationship data for ${updatedCount} users`,
      summary
    });
    
  } catch (error: any) {
    console.error('💥 Fatal error:', error);
    return NextResponse.json({ 
      error: 'Failed to fix relationship data',
      details: error.message 
    }, { status: 500 });
  }
}
