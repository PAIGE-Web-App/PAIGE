import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

interface WeddingData {
  userName: string;
  partnerName: string;
  weddingDate: string | null;
  weddingDateUndecided?: boolean;
  weddingLocation: string;
  maxBudget: number;
  guestCount: number;
  vibe: string[];
  additionalContext?: string;
}

// Template data from TodoTemplatesModal.tsx - Full Wedding Checklist
const FULL_WEDDING_CHECKLIST = {
  id: 'full-wedding-planning',
  name: 'Full Wedding Checklist',
  description: 'Complete checklist from engagement to honeymoon',
  tasks: [
    // Kickoff (ASAP)
    { name: 'Define budget, contributors, and decision style (who signs off on what)', note: 'Go to Budget page to set your max budget and track contributions. Use Settings → Wedding Details to note decision-makers.' },
    { name: 'Sketch guest count range and vibe', note: 'Update guest count in Settings → Wedding Details. Create mood boards in Moodboards page to define your vibe.' },
    { name: 'Choose 3–5 date windows', note: 'Note your preferred date windows in Settings → Wedding Details for planning purposes.' },
    { name: 'Create a shared email/folder/spreadsheet for planning', note: 'Set up your planning email in Settings → Account. Use Files page to organize all wedding documents.' },
    { name: 'List cultural/religious must-haves', note: 'Add cultural requirements in Settings → Wedding Details. Use Notes in Vendors page to track venue policies.' },
    
    // Lock Venue + Date (early)
    { name: 'Shortlist venues; request availability + full pricing; hold top dates', note: 'Use Vendors page to favorite venues and send inquiries via Messages. Track responses and pricing in Messages page.' },
    { name: 'Tour spaces; inspect Plan B; verify policies', note: 'Schedule tours via Messages page. Take photos during tours and upload to Files page organized by venue name.' },
    { name: 'Compare true cost; select venue; sign + pay deposit', note: 'Use Compare → Venue Cost Calculator to factor all fees. Mark chosen venue as Main Venue in Vendors page.' },
    { name: 'Block hotel rooms', note: 'Research hotels in Vendors page and book room blocks. Track booking details in Files page.' },
    
    // Core Team (9–12 months)
    { name: 'Book photographer, videographer, planner/coordinator (if using), entertainment, florist, officiant', note: 'Use Vendors page to research and favorite vendors. Send inquiries via Messages and track responses.' },
    { name: 'Start registry (can be private)', note: 'Research registry options and create accounts with your preferred retailers. Keep private until ready to share.' },
    { name: 'Launch simple wedding website', note: 'Create wedding website in Settings → Wedding Details. Start with basic info and expand later.' },
    { name: 'Collect guest addresses', note: 'Use Contacts page to build your guest list with addresses. Import from existing contacts or add manually.' },
    
    // Looks + Attire (8–10 months)
    { name: 'Shop outfits; schedule alterations', note: 'Research bridal shops in Vendors page. Schedule fittings and track appointments in your personal calendar.' },
    { name: 'Pick wedding party; select their attire', note: 'Add wedding party members in Contacts page. Research attire options in Vendors page.' },
    { name: 'Plan engagement shoot (optional)', note: 'Book engagement shoot with your photographer via Messages page. Schedule in your personal calendar.' },
    
    // Food + Flow (6–8 months)
    { name: 'Taste menus/cake; decide bar approach', note: 'Schedule tastings with caterers via Messages page. Track menu decisions in Files page.' },
    { name: 'Reserve rentals/lighting/photo booth if needed', note: 'Research rental companies in Vendors page. Book via Messages and track in your personal calendar.' },
    { name: 'Outline ceremony + reception flow', note: 'Create timeline and share with vendors via Messages for feedback.' },
    { name: 'Book transportation (party + guests if needed)', note: 'Research transportation in Vendors page. Book via Messages and add to your personal calendar.' },
    { name: 'Plan honeymoon basics (passports, time off)', note: 'Check passport requirements and book time off. Track honeymoon planning in Files page.' },
    
    // Paper + Details (4–6 months)
    { name: 'Order invitations + day-of stationery', note: 'Research stationery vendors in Vendors page. Order via Messages and track delivery in your personal calendar.' },
    { name: 'Book hair/makeup; schedule trials', note: 'Find hair/makeup artists in Vendors page. Book trials via Messages and schedule in your personal calendar.' },
    { name: 'Choose ceremony readings + music', note: 'Select readings and music. Share choices with officiant via Messages page.' },
    { name: 'Design décor plan and timeline with your florist/venue', note: 'Collaborate with florist via Messages. Upload inspiration images to Files page.' },
    
    // Send + Finalize (2–4 months)
    { name: 'Mail invitations (set RSVP ~3–4 weeks before)', note: 'Mail invitations and track RSVPs in Contacts page. Set RSVP deadline in your personal calendar.' },
    { name: 'Track RSVPs and meal preferences', note: 'Update guest responses in Contacts page. Track meal preferences for caterer.' },
    { name: 'Order rings + accessories', note: 'Research jewelers in Vendors page. Order via Messages and track delivery in your personal calendar.' },
    { name: 'Confirm officiant script + license requirements', note: 'Finalize ceremony script with officiant via Messages. Check license requirements in Files.' },
    { name: 'Reserve rehearsal-dinner space + after-party spot', note: 'Book venues in Vendors page. Reserve via Messages and add to your personal calendar.' },
    
    // Tighten Up (4–6 weeks)
    { name: 'Build seating chart; confirm headcount with caterer', note: 'Create seating chart in Contacts page. Confirm final headcount with caterer via Messages.' },
    { name: 'Share day-of timeline + contacts with vendors and wedding party', note: 'Share timeline via Messages with all vendors. Include contact list for wedding day.' },
    { name: 'Approve floor plan; confirm load-in/out and power/AV', note: 'Review floor plan with venue via Messages. Confirm technical requirements and timing.' },
    { name: 'Book final fittings; break in shoes', note: 'Schedule final fittings in your personal calendar. Break in shoes and track in Files page.' },
    { name: 'Prepare vendor meal list + allergies', note: 'Create vendor meal list in Files page. Include dietary restrictions and allergies.' },
    
    // Week Of
    { name: 'Walk the venue; verify Plan B and signage placement', note: 'Schedule final walk-through via Messages. Verify backup plans and signage locations.' },
    { name: 'Pack emergency kit (tape, steamer, meds, sewing kit, stain stick, chargers)', note: 'Create emergency kit checklist in Files page. Pack and organize by category.' },
    { name: 'Assemble tip envelopes + final payments; assign who hands them out', note: 'Prepare tip envelopes in Files page. Assign distribution to trusted wedding party members.' },
    { name: 'Organize décor/welcome bags; label boxes by area', note: 'Organize décor by venue area in Files page. Label boxes clearly for setup team.' },
    { name: 'Print extra timelines, shot list, and seating', note: 'Print backup copies of all documents. Store in Files page for easy access.' },
    
    // Day Before
    { name: 'Rehearse ceremony; confirm lineup and timing', note: 'Run through ceremony with officiant and wedding party. Confirm timing and positioning.' },
    { name: 'Stage flat-lay items (invites, rings, keepsakes)', note: 'Set up flat-lay items for photographer. Include invitation suite, rings, and special keepsakes.' },
    { name: 'Hydrate, eat, sleep', note: 'Take care of yourself! Get plenty of rest and stay hydrated for the big day.' },
    
    // Wedding Day
    { name: 'Start hair/makeup on schedule; buffer 15 mins before lineup', note: 'Follow your timeline. Build in buffer time for any delays.' },
    { name: 'Hand off rings, vows, license, and emergency kit to point people', note: 'Assign trusted people to handle important items. Use your emergency kit from Files page.' },
    { name: 'Sneak a plate + water during cocktail hour', note: 'Make sure to eat and stay hydrated! Delegate someone to bring you food and water.' },
    { name: 'Enjoy the moments—delegate everything else', note: 'Focus on enjoying your day. Let your wedding party and vendors handle the details.' },
    
    // After
    { name: 'Return rentals; tip/settle final invoices', note: 'Return all rentals and settle final vendor payments. Track in Files page for records.' },
    { name: 'Send thank-yous; review vendors online', note: 'Send thank-you notes to vendors via Messages. Leave reviews to help other couples.' },
    { name: 'Preserve attire; back up photos/videos', note: 'Get attire professionally cleaned and preserved. Back up all photos and videos in Files page.' },
    { name: 'Handle name changes (if applicable)', note: 'Start name change process if desired. Track required documents in Files page.' },
    
    // Tiny "Don't-Forget" Wins
    { name: 'Confirm accessibility, shade/heat, and quiet space', note: 'Verify venue accessibility and comfort options. Check with venue via Messages page.' },
    { name: 'Set rain/heat trigger time and who decides', note: 'Establish weather backup plan with venue. Document decision-makers in Files page.' },
    { name: 'Arrange kids\' plan (meals, activities, sitter)', note: 'Plan activities and meals for children. Coordinate with venue and parents via Messages.' },
    { name: 'Map local events that impact traffic/hotels', note: 'Check for local events that might affect traffic or hotel availability. Share with guests.' },
    { name: 'Print 10–15% extra stationery for mistakes/keepsakes', note: 'Order extra stationery for mistakes and keepsakes. Track quantities in Files page.' }
  ]
};

const VENUE_SELECTION_TEMPLATE = {
  id: 'venue-selection',
  name: 'Select Main Venue & Set Wedding Date',
  description: 'This is the first step to successful wedding prep!',
  tasks: [
    // Discover & Shortlist
    { name: 'Browse and favorite venues on the Vendors page', note: 'Favorite promising venues with <3 in the catalog to build your Shortlist. Visit the venue website, take notes and leave comments on the venue page!' },
    { name: 'Set your venue budget cap on the Budget page', note: 'Go to the Budget page and add a category for Venue expenses to start tracking how much you\'re willing to spend on your selected venue' },
    { name: 'Confirm guest count', note: 'Go to the Settings page and navigate to the Wedding Details tab to confirm your guest count' },
    { name: 'Update your wedding vibe', note: 'Go to Moodboards and add images, and vibes to come up with the vibes for your big day' },
    { name: 'Pick 3–5 date windows that work for you' },
    { name: 'Add must-haves', note: 'e.g. do you have accessibility needs, do you need a Plan B room, do you need to bring in your own caterer, etc.' },
    
    // Inquire (from your Shortlist)
    { name: 'Send availability + full-pricing requests to your Shortlist', note: 'Use the Messages page to send inquiries to your shortlisted venues. Ask about availability for your date windows and request full pricing breakdowns including all fees, taxes, and required services' },
    { name: 'Keep tabs of the responses on the Messages page', note: 'Track all venue responses, pricing details, and availability in the Messages page. Compare responses side-by-side to make informed decisions' },
    
    // Tour Like a Pro
    { name: 'Schedule tours in with the venues and add them to your calendar!', note: 'Book tours for your top 3-5 venues. Schedule them close together if possible to compare while details are fresh' },
    { name: 'Take notes on guest path, Plan B room, catering rules, power/AV', note: 'During tours, document the guest flow, backup indoor spaces, catering restrictions, and technical requirements. Use the Notes feature in the Vendors page' },
    { name: 'Snap photos and upload them to unique folders in the Files page', note: 'Take photos of ceremony spaces, reception areas, bathrooms, parking, and any concerns. Organize by venue name in the Files page' },
    { name: 'Calculate "true cost" in Compare → Venue Cost Calc', note: 'Use the venue cost calculator to factor in all fees, required services, and hidden costs to get the real total price' },
    { name: 'Check true capacity (with dance floor) and log sunset/photo window', note: 'Verify actual capacity with dance floor and note the best lighting times for photos, especially for outdoor ceremonies' },
    { name: 'Take note of hotel/airport travel time', note: 'Consider guest convenience and transportation logistics when evaluating venue locations' },
    
    // Lock It In
    { name: 'Select your winner in the Vendors page and choose your Main Venue', note: 'Mark your chosen venue as the Main Venue in the Vendors page. This will be used for AI recommendations and other features' },
    { name: 'Set your official Wedding Date', note: 'This is crucial! Set your official wedding date in Settings → Wedding Details. This enables AI functionality and helps with timeline planning' },
    { name: 'Request a written proposal and upload to Files', note: 'Get a detailed written proposal from your chosen venue and upload it to the Files page for your records' },
    { name: 'Review & e-sign in Contracts (payments, cancellation, overtime, Plan B trigger), then Mark as Signed', note: 'Carefully review all contract terms including payment schedules, cancellation policies, overtime charges, and weather backup plans. Use the Contracts page to track and mark as signed' },
    { name: 'Pay deposit and record it in Budget', note: 'Make your venue deposit payment and record it in the Budget page under your Venue category to track your spending' }
  ]
};

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Starting optimized todo generation...');
    const { userId, weddingData }: { userId: string; weddingData: WeddingData } = await req.json();
    
    if (!userId || !weddingData) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Determine which template to use based on wedding date
    const hasWeddingDate = weddingData.weddingDate && 
                          weddingData.weddingDate !== 'TBD' && 
                          weddingData.weddingDate !== '' && 
                          !weddingData.weddingDateUndecided;
    
    let selectedTemplate;
    let templateName;
    
    if (hasWeddingDate) {
      // Use Full Wedding Checklist with AI-powered deadlines
      selectedTemplate = FULL_WEDDING_CHECKLIST;
      templateName = 'Full Wedding Checklist';
      console.log('📅 Wedding date found, using Full Wedding Checklist with AI deadlines');
    } else {
      // Use Venue Selection template
      selectedTemplate = VENUE_SELECTION_TEMPLATE;
      templateName = 'Select Main Venue & Set Wedding Date';
      console.log('📅 No wedding date, using Venue Selection template');
    }

    // Transform template tasks to match expected format - preserve exact order
    const todos = selectedTemplate.tasks.map((task: any, index: number) => {
      const todo: any = {
        id: `todo-${index + 1}`,
        title: task.name,
        description: task.note || '',
        category: '', // No category set - let user assign
        priority: 'Medium',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add intelligent deadlines only if wedding date is set
      if (hasWeddingDate && weddingData.weddingDate) {
        todo.deadline = getIntelligentDeadline(index, task, weddingData.weddingDate, selectedTemplate.id);
        todo.deadlineReasoning = getDeadlineReasoning(index, task, selectedTemplate.id);
      }

      return todo;
    });

    // Save todos to Firestore - convert Date objects to Firestore Timestamps
    const todoListRef = adminDb.collection('users').doc(userId).collection('todoLists').doc('wedding-planning');
    
    // Convert todos with Date objects to Firestore-compatible format
    const firestoreTodos = todos.map((todo, idx) => {
      let firestoreDeadline = null;
      
      if (todo.deadline) {
        try {
          // Ensure it's a valid Date object
          if (todo.deadline instanceof Date && !isNaN(todo.deadline.getTime())) {
            firestoreDeadline = admin.firestore.Timestamp.fromDate(todo.deadline);
          } else {
            console.warn(`⚠️ Invalid deadline for todo ${idx}: ${todo.deadline} (type: ${typeof todo.deadline})`);
          }
        } catch (err) {
          console.error(`❌ Error converting deadline for todo ${idx}:`, err);
        }
      }
      
      // Convert all Date objects to Firestore Timestamps
      return {
        id: todo.id,
        title: todo.title,
        description: todo.description,
        category: todo.category,
        priority: todo.priority,
        completed: todo.completed || false,
        deadline: firestoreDeadline,
        deadlineReasoning: todo.deadlineReasoning || null,
        createdAt: admin.firestore.Timestamp.fromDate(todo.createdAt),
        updatedAt: admin.firestore.Timestamp.fromDate(todo.updatedAt)
      };
    });
    
    await todoListRef.set({
      name: templateName,
      description: selectedTemplate.description,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      isDefault: true,
      items: firestoreTodos,
      templateUsed: selectedTemplate.id,
      hasWeddingDate: hasWeddingDate
    });

    console.log(`✅ Generated ${todos.length} todos using ${templateName} template`);

    return NextResponse.json({
      success: true,
      todos: {
        listName: templateName,
        todos: todos.map(todo => ({
          id: todo.id,
          name: todo.title,
          note: todo.description,
          category: todo.category,
          priority: todo.priority,
          isCompleted: todo.completed,
          deadline: (todo.deadline && todo.deadline instanceof Date && !isNaN(todo.deadline.getTime())) 
            ? todo.deadline.toISOString() 
            : null,
          deadlineReasoning: todo.deadlineReasoning || null
        }))
      },
      templateUsed: selectedTemplate.id,
      hasWeddingDate: hasWeddingDate,
      resourceOptimized: true
    });

  } catch (error) {
    console.error('❌ Error in optimized todo generation:', error);
    return NextResponse.json({ error: 'Failed to generate todos' }, { status: 500 });
  }
}

/**
 * Generate intelligent deadline based on task index, task content, and wedding date
 * Uses the same logic as the existing deadline generation API
 */
function getIntelligentDeadline(index: number, task: any, weddingDate: string, templateId: string): Date {
  const now = new Date();
  const wedding = new Date(weddingDate);
  const daysUntilWedding = Math.ceil((wedding.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Generate realistic time based on task content
  const getRealisticTime = (taskName: string, index: number): { hours: number; minutes: number } => {
    const taskLower = taskName.toLowerCase();
    
    // Administrative/research tasks - morning
    if (taskLower.includes('budget') || taskLower.includes('define') || taskLower.includes('research') || 
        taskLower.includes('browse') || taskLower.includes('shortlist')) {
      return { hours: 9, minutes: 30 }; // 9:30 AM
    }
    
    // Vendor communications - afternoon
    if (taskLower.includes('venue') || taskLower.includes('vendor') || taskLower.includes('photographer') || 
        taskLower.includes('caterer') || taskLower.includes('hire') || taskLower.includes('book')) {
      return { hours: 14, minutes: 0 }; // 2:00 PM
    }
    
    // Personal tasks - evening
    if (taskLower.includes('attire') || taskLower.includes('guest') || taskLower.includes('invitation') || 
        taskLower.includes('personal') || taskLower.includes('dress') || taskLower.includes('suit')) {
      return { hours: 19, minutes: 0 }; // 7:00 PM
    }
    
    // Default to rotating time slots to avoid clustering
    const timeSlots = [
      { hours: 9, minutes: 0 },   // 9:00 AM
      { hours: 9, minutes: 30 },  // 9:30 AM
      { hours: 10, minutes: 0 },  // 10:00 AM
      { hours: 14, minutes: 0 },  // 2:00 PM
      { hours: 14, minutes: 30 }, // 2:30 PM
      { hours: 19, minutes: 0 },  // 7:00 PM
      { hours: 19, minutes: 30 }  // 7:30 PM
    ];
    
    return timeSlots[index % timeSlots.length];
  };

  const time = getRealisticTime(task.name, index);
  
  // For tight timelines (< 90 days), compress all deadlines
  if (daysUntilWedding < 90) {
    let deadline: Date;
    
    // Use index-based distribution for tight timelines
    if (index < 5) {
      // Kickoff tasks - ASAP (1-3 days)
      deadline = new Date(now.getTime() + (index + 1) * 24 * 60 * 60 * 1000);
    } else if (index < 9) {
      // Lock Venue + Date - early (4-7 days)
      deadline = new Date(now.getTime() + (index + 3) * 24 * 60 * 60 * 1000);
    } else if (index < 13) {
      // Core Team - 9-12 months out (1-2 weeks)
      deadline = new Date(now.getTime() + (index + 7) * 24 * 60 * 60 * 1000);
    } else if (index < 16) {
      // Looks + Attire - 8-10 months out (2-3 weeks)
      deadline = new Date(now.getTime() + (index + 14) * 24 * 60 * 60 * 1000);
    } else if (index < 21) {
      // Food + Flow - 6-8 months out (3-4 weeks)
      deadline = new Date(now.getTime() + (index + 21) * 24 * 60 * 60 * 1000);
    } else if (index < 25) {
      // Paper + Details - 4-6 months out (4-5 weeks)
      deadline = new Date(now.getTime() + (index + 28) * 24 * 60 * 60 * 1000);
    } else if (index < 30) {
      // Send + Finalize - 2-4 months out (5-6 weeks)
      deadline = new Date(now.getTime() + (index + 35) * 24 * 60 * 60 * 1000);
    } else if (index < 35) {
      // Tighten Up - 4-6 weeks out (6-7 weeks)
      deadline = new Date(now.getTime() + (index + 42) * 24 * 60 * 60 * 1000);
    } else if (index < 40) {
      // Week Of (1 week before)
      deadline = new Date(wedding.getTime() - (40 - index) * 24 * 60 * 60 * 1000);
    } else if (index < 43) {
      // Day Before
      deadline = new Date(wedding.getTime() - 24 * 60 * 60 * 1000);
    } else if (index < 47) {
      // Wedding Day
      deadline = new Date(wedding);
    } else if (index < 56) {
      // After (1-7 days after wedding, distributed)
      const daysAfter = Math.floor((index - 47) / 2) + 1; // 1, 1, 2, 2, 3, 3, 4, 4, 5
      deadline = new Date(wedding.getTime() + daysAfter * 24 * 60 * 60 * 1000);
    } else {
      // Fallback for any index >= 56
      deadline = new Date(wedding.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    
    // Ensure deadline is not after wedding (except for "after" items)
    if (deadline > wedding && !task.name.toLowerCase().includes('after')) {
      deadline = new Date(wedding.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day before
    }
    
    // Set the realistic time
    deadline.setHours(time.hours, time.minutes, 0, 0);
    return deadline;
  }
  
  // Normal timeline (90+ days) - use original planning phases
  let deadline: Date;
  
  if (index < 5) {
    // Kickoff tasks - ASAP (1 week)
    deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  } else if (index < 9) {
    // Lock Venue + Date - early (2-4 weeks)
    deadline = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  } else if (index < 13) {
    // Core Team - 9-12 months out (6-9 months)
    deadline = new Date(now.getTime() + 240 * 24 * 60 * 60 * 1000);
  } else if (index < 16) {
    // Looks + Attire - 8-10 months out (5-8 months)
    deadline = new Date(now.getTime() + 200 * 24 * 60 * 60 * 1000);
  } else if (index < 21) {
    // Food + Flow - 6-8 months out (4-6 months)
    deadline = new Date(now.getTime() + 150 * 24 * 60 * 60 * 1000);
  } else if (index < 25) {
    // Paper + Details - 4-6 months out (3-5 months)
    deadline = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
  } else if (index < 30) {
    // Send + Finalize - 2-4 months out (2-4 months)
    deadline = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  } else if (index < 35) {
    // Tighten Up - 4-6 weeks out (1-2 months)
    deadline = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
  } else if (index < 40) {
    // Week Of (2 weeks before)
    deadline = new Date(wedding.getTime() - 14 * 24 * 60 * 60 * 1000);
  } else if (index < 43) {
    // Day Before
    deadline = new Date(wedding.getTime() - 24 * 60 * 60 * 1000);
  } else if (index < 47) {
    // Wedding Day
    deadline = new Date(wedding);
  } else if (index < 56) {
    // After (1-7 days after wedding, distributed)
    const daysAfter = Math.floor((index - 47) / 2) + 1; // 1, 1, 2, 2, 3, 3, 4, 4, 5
    deadline = new Date(wedding.getTime() + daysAfter * 24 * 60 * 60 * 1000);
  } else {
    // Fallback for any index >= 56
    deadline = new Date(wedding.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  
  // Ensure deadline is not after wedding (except for "after" items)
  if (deadline > wedding && !task.name.toLowerCase().includes('after')) {
    deadline = new Date(wedding.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day before
  }
  
  // Set the realistic time
  deadline.setHours(time.hours, time.minutes, 0, 0);
  return deadline;
}

/**
 * Generate reasoning for deadline assignment
 */
function getDeadlineReasoning(index: number, task: any, templateId: string): string {
  const taskName = task.name.toLowerCase();
  
  if (taskName.includes('budget') || taskName.includes('define')) {
    return 'Budget planning should be done early to guide all other decisions';
  } else if (taskName.includes('venue') || taskName.includes('book venue')) {
    return 'Venue booking is critical and should be prioritized early in planning';
  } else if (taskName.includes('photographer') || taskName.includes('hire')) {
    return 'Photographer booking requires early planning due to high demand';
  } else if (taskName.includes('attire') || taskName.includes('dress')) {
    return 'Attire selection takes time for fittings and alterations';
  } else if (taskName.includes('invitation') || taskName.includes('send')) {
    return 'Invitations need time for design, printing, and mailing';
  } else if (taskName.includes('week of') || taskName.includes('day before')) {
    return 'Final preparations scheduled close to wedding date';
  } else if (taskName.includes('after')) {
    return 'Post-wedding tasks scheduled after the big day';
  } else if (index < 5) {
    return 'Kickoff task scheduled early in planning process';
  } else if (index < 13) {
    return 'Core planning task scheduled based on wedding timeline';
  } else if (index < 21) {
    return 'Mid-planning task scheduled for optimal timing';
  } else if (index < 30) {
    return 'Final planning task scheduled closer to wedding date';
  } else {
    return 'Task scheduled based on optimal wedding planning timeline';
  }
}
