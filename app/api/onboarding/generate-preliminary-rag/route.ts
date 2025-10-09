import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

interface WeddingData {
  userName: string;
  partnerName: string;
  weddingDate: string | null;
  weddingDateUndecided?: boolean;
  weddingLocation: string;
  selectedVenueMetadata: any | null;
  maxBudget: number;
  guestCount: number;
  vibe: string[];
  additionalContext?: string;
}

// Helper function to generate fallback todos from templates
// Returns appropriate template without AI-generated deadlines
function getFallbackTodos(hasWeddingDate: boolean) {
  // If no wedding date, use venue selection template (19 tasks)
  if (!hasWeddingDate) {
    return [
      { title: 'Browse and favorite venues on the Vendors page', note: 'Favorite promising venues with <3 in the catalog to build your Shortlist. Visit the venue website, take notes and leave comments on the venue page!' },
      { title: 'Set your venue budget cap on the Budget page', note: 'Go to the Budget page and add a category for Venue expenses to start tracking how much you\'re willing to spend on your selected venue' },
      { title: 'Confirm guest count', note: 'Go to the Settings page and navigate to the Wedding Details tab to confirm your guest count' },
      { title: 'Update your wedding vibe', note: 'Go to Moodboards and add images, and vibes to come up with the vibes for your big day' },
      { title: 'Pick 3–5 date windows that work for you', note: 'Consider your preferred seasons, holidays, and guest availability' },
      { title: 'Add must-haves', note: 'e.g. do you have accessibility needs, do you need a Plan B room, do you need to bring in your own caterer, etc.' },
      { title: 'Send availability + full-pricing requests to your Shortlist', note: 'Use the Messages page to send inquiries to your shortlisted venues. Ask about availability for your date windows and request full pricing breakdowns including all fees, taxes, and required services' },
      { title: 'Keep tabs of the responses on the Messages page', note: 'Track all venue responses, pricing details, and availability in the Messages page. Compare responses side-by-side to make informed decisions' },
      { title: 'Book tours for shortlisted venues', note: 'Schedule in-person tours to see spaces, ask detailed questions, and envision your wedding day' },
      { title: 'Ask about guest capacity (seated + standing)', note: 'Confirm the venue can comfortably accommodate your guest count' },
      { title: 'Request floor plan and layout options', note: 'Review the venue layout to plan ceremony and reception spaces' },
      { title: 'Inquire about vendor restrictions (caterer, bar, etc.)', note: 'Understand any vendor requirements or restrictions before booking' },
      { title: 'Check accessibility features', note: 'Ensure the venue is accessible for all your guests' },
      { title: 'Review contingency plans (weather, emergencies)', note: 'Ask about backup plans for outdoor ceremonies or unexpected situations' },
      { title: 'Understand cancellation and refund policies', note: 'Review the contract terms for cancellations or date changes' },
      { title: 'Compare total costs (including hidden fees)', note: 'Use Compare → Venue Cost Calculator to factor all fees and make an informed decision' },
      { title: 'Select your venue and negotiate final contract', note: 'Choose your favorite venue and finalize contract terms' },
      { title: 'Pay deposit and sign contract', note: 'Secure your venue by paying the deposit. Mark chosen venue as Main Venue in Vendors page' },
      { title: 'Set your official wedding date', note: 'Once venue is confirmed, set your wedding date in Settings → Wedding Details' }
    ];
  }
  
  // Full Wedding Checklist (56 tasks) - no deadlines
  return [
    { title: 'Define budget, contributors, and decision style (who signs off on what)', note: 'Go to Budget page to set your max budget and track contributions.' },
    { title: 'Sketch guest count range and vibe', note: 'Update guest count in Settings → Wedding Details. Create mood boards to define your vibe.' },
    { title: 'Choose 3–5 date windows', note: 'Note your preferred date windows in Settings → Wedding Details.' },
    { title: 'Create a shared email/folder/spreadsheet for planning', note: 'Set up your planning email in Settings. Use Files page to organize documents.' },
    { title: 'List cultural/religious must-haves', note: 'Add cultural requirements in Settings → Wedding Details.' },
    { title: 'Shortlist venues; request availability + full pricing; hold top dates', note: 'Use Vendors page to favorite venues and send inquiries via Messages.' },
    { title: 'Tour spaces; inspect Plan B; verify policies', note: 'Schedule tours via Messages. Take photos and upload to Files.' },
    { title: 'Compare true cost; select venue; sign + pay deposit', note: 'Use Compare → Venue Cost Calculator. Mark chosen venue as Main Venue.' },
    { title: 'Block hotel rooms', note: 'Research hotels in Vendors page and book room blocks.' },
    { title: 'Book photographer, videographer, planner/coordinator (if using), entertainment, florist, officiant', note: 'Use Vendors page to research vendors. Send inquiries via Messages.' },
    { title: 'Start registry (can be private)', note: 'Set up your wedding registry. You can keep it private until ready to share.' },
    { title: 'Shop for attire (dress/suit/tux)', note: 'Start browsing and scheduling appointments for wedding attire.' },
    { title: 'Order attire + accessories', note: 'Order your wedding attire with enough time for alterations.' },
    { title: 'Book hair + makeup artist', note: 'Research and book your hair and makeup professionals.' },
    { title: 'Order rings', note: 'Shop for and order your wedding bands with time for sizing.' },
    { title: 'Design + order invitations, menus, programs, signage', note: 'Work on all printed materials for your wedding.' },
    { title: 'Finalize ceremony details (readings, music, vows)', note: 'Plan all ceremony elements with your officiant.' },
    { title: 'Finalize food/bar choices; do tasting', note: 'Complete menu tastings and finalize all catering details.' },
    { title: 'Book transportation (couple + guests)', note: 'Arrange transportation for the wedding party and guests.' },
    { title: 'Select + order favors (if doing)', note: 'Choose and order wedding favors if you plan to have them.' },
    { title: 'Decide on welcome bags (if doing)', note: 'Plan welcome bags for out-of-town guests if desired.' },
    { title: 'Plan ceremony + reception layout', note: 'Work with venue on floor plan and seating arrangements.' },
    { title: 'Order rentals (tables, chairs, linens, etc.)', note: 'Coordinate all rental needs with your venue and vendors.' },
    { title: 'Confirm décor details (centerpieces, florals, lighting)', note: 'Finalize all decoration plans with your florist and decorator.' },
    { title: 'Mail save-the-dates', note: 'Send save-the-dates 6-8 months before your wedding.' },
    { title: 'Address + mail invitations', note: 'Send invitations 6-8 weeks before the wedding.' },
    { title: 'Track RSVPs and meal preferences', note: 'Update guest responses in Contacts page.' },
    { title: 'Order rings + accessories', note: 'Ensure all rings and accessories are ordered and sized.' },
    { title: 'Confirm officiant script + license requirements', note: 'Finalize ceremony script and check marriage license requirements.' },
    { title: 'Reserve rehearsal-dinner space + after-party spot', note: 'Book venues for rehearsal dinner and after-party if planned.' },
    { title: 'Build seating chart; confirm headcount with caterer', note: 'Create final seating chart and confirm guest count.' },
    { title: 'Finalize timeline + share with vendors', note: 'Create detailed day-of timeline and distribute to all vendors.' },
    { title: 'Do attire fittings', note: 'Complete all final fittings for wedding attire.' },
    { title: 'Confirm all vendor arrival times', note: 'Verify arrival times with all vendors.' },
    { title: 'Prep welcome bags, favors, signage', note: 'Assemble and prepare all day-of items.' },
    { title: 'Pack for honeymoon', note: 'Start packing for your honeymoon trip.' },
    { title: 'Break in shoes', note: 'Wear your wedding shoes around the house to break them in.' },
    { title: 'Get marriage license', note: 'Obtain your marriage license according to local requirements.' },
    { title: 'Final venue walkthrough', note: 'Do final walkthrough with venue coordinator.' },
    { title: 'Confirm final headcount + payments with all vendors', note: 'Provide final counts and settle outstanding vendor payments.' },
    { title: 'Rehearsal + rehearsal dinner', note: 'Run through ceremony and enjoy dinner with wedding party.' },
    { title: 'Set up welcome bags + signage (if doing day-before)', note: 'Deliver and set up all welcome materials.' },
    { title: 'Pack emergency kit', note: 'Prepare emergency kit with essentials (safety pins, pain reliever, etc.).' },
    { title: 'Confirm transportation times', note: 'Double-check all transportation arrangements.' },
    { title: 'Give rings to best man/maid of honor', note: 'Hand off rings to your wedding party members.' },
    { title: 'Final check: dress, suit, accessories laid out', note: 'Lay out all attire and accessories the night before.' },
    { title: 'Wedding day!', note: 'Enjoy your special day!' },
    { title: 'Send thank-you notes', note: 'Send personalized thank-you notes to all guests and vendors.' },
    { title: 'Preserve dress/suit (if desired)', note: 'Arrange for professional cleaning and preservation of attire.' },
    { title: 'Return rentals', note: 'Ensure all rental items are returned on time.' },
    { title: 'Review + tip vendors', note: 'Leave reviews and send additional tips if desired.' },
    { title: 'Order prints/albums from photographer', note: 'Review photos and order prints or albums.' },
    { title: 'Update name/address (if applicable)', note: 'Handle any legal name changes and address updates.' },
    { title: 'File marriage certificate', note: 'Submit marriage certificate to appropriate authorities.' },
    { title: 'Enjoy honeymoon', note: 'Relax and enjoy your honeymoon!' },
    { title: 'Share photos with friends + family', note: 'Share your favorite wedding photos with loved ones.' }
  ];
}

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Starting RAG API...');
    const { userId, weddingData }: { userId: string; weddingData: WeddingData } = await req.json();
    console.log('📝 Received data:', { userId, weddingData: weddingData ? 'present' : 'missing' });
    console.log('🏠 Wedding location:', weddingData?.weddingLocation);
    console.log('🔑 Google Places API key available:', process.env.GOOGLE_PLACES_API_KEY ? 'YES' : 'NO');

    if (!userId || !weddingData) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    console.log('Generating preliminary content with RAG for:', weddingData.userName, '&', weddingData.partnerName);

    // Prepare the wedding context for RAG (exact format expected by n8n)
    const weddingContext = {
      couple: `${weddingData.userName} & ${weddingData.partnerName}`,
      weddingDate: weddingData.weddingDate || 'TBD', // Keep original format
      location: weddingData.weddingLocation || 'TBD', // Use actual wedding location
      venue: weddingData.selectedVenueMetadata?.name || 'Garden Manor', // Use default venue
      budget: weddingData.maxBudget,
      guestCount: weddingData.guestCount,
      style: weddingData.vibe.join(', ') || 'TBD',
      additionalContext: weddingData.additionalContext || 'None provided'
    };

  // Call n8n RAG workflow (using test webhook for now)
  const n8nUrl = process.env.N8N_WEBHOOK_URL || 'https://paigewedding.app.n8n.cloud/webhook-test/onboarding-rag';
    // Call n8n RAG workflow
    
    const n8nResponse = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        userId,
        weddingContext,
        requestType: 'generate_preliminary'
      }]),
    });

    // Process n8n response

    // Declare variables at the top level
    let todos: any[] = [];
    let budget: any = { total: 0, categories: [] };
    let vendors: any = {};
    let usedFallbackTodos = false; // Track if we used fallback todos
    
    // Generate optimized todos using existing templates
    console.log('🎯 Generating optimized todos using existing templates...');
    
    // Convert Firestore Timestamp to ISO string if needed
    let weddingDateString = null;
    if (weddingData.weddingDate) {
      if (typeof weddingData.weddingDate === 'string') {
        // Already a string
        weddingDateString = weddingData.weddingDate;
      } else if (typeof weddingData.weddingDate === 'object' && weddingData.weddingDate !== null) {
        // Handle Firestore Timestamp objects
        if ('toDate' in weddingData.weddingDate && typeof (weddingData.weddingDate as any).toDate === 'function') {
          // Firestore Timestamp with toDate() method
          weddingDateString = (weddingData.weddingDate as any).toDate().toISOString();
        } else if ('seconds' in weddingData.weddingDate && typeof (weddingData.weddingDate as any).seconds === 'number') {
          // Firestore Timestamp object with seconds property
          weddingDateString = new Date((weddingData.weddingDate as any).seconds * 1000).toISOString();
        } else {
          // Try to parse as Date
          const parsedDate = new Date(weddingData.weddingDate as any);
          if (!isNaN(parsedDate.getTime())) {
            weddingDateString = parsedDate.toISOString();
          }
        }
      } else {
        // Try to parse as Date for other types
        const parsedDate = new Date(weddingData.weddingDate as any);
        if (!isNaN(parsedDate.getTime())) {
          weddingDateString = parsedDate.toISOString();
        }
      }
    }
    
    try {
      const todoResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/onboarding/generate-todos-optimized`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          weddingData: {
            ...weddingData,
            weddingDate: weddingDateString
          }
        })
      });
      
      if (todoResponse.ok) {
        const todoData = await todoResponse.json();
        console.log('📦 Optimized todo response:', JSON.stringify(todoData).substring(0, 200));
        if (todoData.success && todoData.todos) {
          todos = todoData.todos.todos;
          console.log(`✅ Generated ${todos.length} todos using ${todoData.templateUsed} template`);
        } else {
          console.log('⚠️ Optimized todo generation failed - no success or todos in response');
          console.log('Response structure:', Object.keys(todoData));
          const hasWeddingDate = weddingDateString && weddingDateString !== 'TBD' && !weddingData.weddingDateUndecided;
          todos = getFallbackTodos(hasWeddingDate);
          usedFallbackTodos = true;
        }
      } else {
        const errorText = await todoResponse.text();
        console.log('⚠️ Optimized todo generation HTTP error:', todoResponse.status, errorText);
        const hasWeddingDate = weddingDateString && weddingDateString !== 'TBD' && !weddingData.weddingDateUndecided;
        todos = getFallbackTodos(hasWeddingDate);
        usedFallbackTodos = true;
      }
    } catch (todoError) {
      console.log('⚠️ Optimized todo generation error, using fallback:', todoError);
      const hasWeddingDate = weddingDateString && weddingDateString !== 'TBD' && !weddingData.weddingDateUndecided;
      todos = getFallbackTodos(hasWeddingDate);
      usedFallbackTodos = true;
    }

    if (!n8nResponse.ok) {
      console.log('⚠️ n8n webhook failed, using fallback data');
      // Use fallback data if n8n fails
      const fallbackData = {
        todos: [
          { title: 'Book venue', description: 'Find and book your wedding venue', category: 'Venue', priority: 'High' },
          { title: 'Hire photographer', description: 'Research and book wedding photographer', category: 'Photography', priority: 'High' },
          { title: 'Order flowers', description: 'Choose and order wedding flowers', category: 'Flowers', priority: 'Medium' }
        ],
        budget: {
          total: weddingData.maxBudget || 50000,
          categories: [
            { name: 'Venue', amount: Math.round((weddingData.maxBudget || 50000) * 0.4) },
            { name: 'Catering', amount: Math.round((weddingData.maxBudget || 50000) * 0.3) },
            { name: 'Photography', amount: Math.round((weddingData.maxBudget || 50000) * 0.15) }
          ]
        },
        vendors: {}
      };
      
      // Don't override todos - they're already generated by optimized endpoint
      budget = fallbackData.budget;
      vendors = fallbackData.vendors;
      
      console.log('Using fallback data:', { todos: todos.length, budget: budget.total, vendors: Object.keys(vendors).length });
    } else {
      const responseText = await n8nResponse.text();
      // Parse RAG response
      
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response from n8n webhook');
      }

      const ragResult = JSON.parse(responseText);
      
      // Extract generated content from RAG response
      // Handle both direct data and nested data formats
      const responseData = ragResult.data || ragResult;
      const { todos: rawTodos, budget: rawBudget, vendors: rawVendors } = responseData;
      
      // Extract data from RAG response
      
      // Clean the data to remove undefined values
      const cleanData = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) {
          return obj.map(cleanData).filter(item => item !== null && item !== undefined);
        }
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined && value !== null) {
            cleaned[key] = cleanData(value);
          }
        }
        return cleaned;
      };
      
      // Clean budget and vendors data (todos already generated by optimized endpoint)
      budget = cleanData(rawBudget) || { total: 0, categories: [] };
      vendors = cleanData(rawVendors) || {};
      
      // Data cleaned and ready for processing
    }
    
    // Check if vendors are just string arrays and convert to proper objects
    if (vendors && typeof vendors === 'object') {
      const convertedVendors: any = {};
      
      // Map RAG categories to proper vendor categories
      const categoryMapping: { [key: string]: { value: string; label: string; singular: string } } = {
        'venues': { value: 'wedding_venue', label: 'Venues', singular: 'Venue' },
        'photographers': { value: 'photographer', label: 'Photographers', singular: 'Photographer' },
        'florists': { value: 'florist', label: 'Florists', singular: 'Florist' },
        'caterers': { value: 'caterer', label: 'Catering', singular: 'Caterer' },
        'music': { value: 'dj', label: 'DJs', singular: 'DJ' }
      };
      
      // Convert each category from string array to vendor objects
      Object.keys(vendors).forEach(category => {
        if (Array.isArray(vendors[category])) {
          const mappedCategory = categoryMapping[category] || { value: category, label: category, singular: category };
          convertedVendors[category] = vendors[category].map((name: string, index: number) => ({
            id: `${mappedCategory.value}-${index}`,
            name: name,
            category: mappedCategory.singular,
            price: 'Contact for pricing',
            rating: parseFloat((4.0 + (Math.random() * 1.0)).toFixed(2)), // Random rating between 4.0-5.0, rounded to 2 decimals
            vicinity: 'Local area',
            description: `${mappedCategory.singular} services`,
            image: null, // Will be replaced with real vendor data
            website: null,
            phone: null,
            address: 'Local area'
          }));
        }
      });
      
      // Fetch real vendors with images from Google Places API directly
      try {
        const vendorCategories = [
          { googleType: 'wedding_venue', categoryKey: 'venues', searchTerm: 'wedding venue' },
          { googleType: 'establishment', categoryKey: 'photographers', searchTerm: 'wedding photographer' },
          { googleType: 'florist', categoryKey: 'florists', searchTerm: 'wedding florist' },
          { googleType: 'caterer', categoryKey: 'caterers', searchTerm: 'wedding caterer' },
          { googleType: 'establishment', categoryKey: 'music', searchTerm: 'wedding music dj band' }
        ];
        
        for (const { googleType, categoryKey, searchTerm } of vendorCategories) {
          try {
            // Call Google Places API directly
            const searchQuery = `${searchTerm} near ${weddingData.weddingLocation || 'Washington DC'}`;
            // Search Google Places API
            
            const googleResponse = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&type=${googleType}&fields=place_id,name,rating,price_level,vicinity,formatted_address,types,photos,website,formatted_phone_number,editorial_summary&key=${process.env.GOOGLE_PLACES_API_KEY}`);
            
            // Process Google Places response
            
            if (googleResponse.ok) {
              const googleData = await googleResponse.json();
              // Process Google Places results
              
              if (googleData.results && googleData.results.length > 0) {
                // Convert Google Places results to vendor objects with detailed information
                convertedVendors[categoryKey] = await Promise.all(googleData.results.slice(0, 5).map(async (place: any) => {
                  try {
                    // Get detailed information from Place Details API
                    const detailsResponse = await fetch(
                      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,rating,formatted_phone_number,website,formatted_address,editorial_summary,photos,price_level,types,opening_hours,reviews,url,international_phone_number,opening_hours,current_opening_hours,utc_offset,adr_address,plus_code,geometry,place_id,user_ratings_total&key=${process.env.GOOGLE_PLACES_API_KEY}`
                    );
                    
                    const detailsData = await detailsResponse.json();
                    const details = detailsData.result;
                    
                    // Debug logging for Hook Hall specifically
                    if (place.name.toLowerCase().includes('hook hall')) {
                      console.log('Hook Hall details:', {
                        editorial_summary: details.editorial_summary,
                        types: place.types,
                        reviews: details.reviews?.slice(0, 2),
                        website: details.website,
                        phone: details.formatted_phone_number
                      });
                    }
                    
                    const vendor: any = {
                      id: place.place_id,
                      name: place.name,
                      category: categoryMapping[categoryKey]?.singular || googleType,
                      price: place.price_level ? '$'.repeat(place.price_level) : 'Contact for pricing',
                      rating: parseFloat((place.rating || 4.0).toFixed(2)),
                      vicinity: place.vicinity || place.formatted_address || 'Local area',
                      description: details.editorial_summary?.overview || 
                        (details.reviews && details.reviews.length > 0 ? details.reviews[0].text?.substring(0, 200) + '...' : null) ||
                        (place.types && place.types.length > 0 && !place.types[0].includes('point_of_interest') ? place.types[0] : `${categoryMapping[categoryKey]?.singular || googleType} services`)
                    };
                    
                    // Add detailed information from Google Business Profile
                    if (details.website) {
                      vendor.website = details.website;
                    }
                    if (details.formatted_phone_number) {
                      vendor.phone = details.formatted_phone_number;
                    }
                    if (details.international_phone_number) {
                      vendor.internationalPhone = details.international_phone_number;
                    }
                    if (details.formatted_address) {
                      vendor.address = details.formatted_address;
                    }
                    if (details.url) {
                      vendor.googleUrl = details.url;
                    }
                    if (details.opening_hours) {
                      vendor.openingHours = details.opening_hours;
                    }
                    if (details.current_opening_hours) {
                      vendor.currentOpeningHours = details.current_opening_hours;
                    }
                    if (details.geometry && details.geometry.location) {
                      vendor.coordinates = {
                        lat: details.geometry.location.lat,
                        lng: details.geometry.location.lng
                      };
                    }
                    if (details.reviews && details.reviews.length > 0) {
                      vendor.reviews = details.reviews.slice(0, 3).map((review: any) => ({
                        text: review.text,
                        author_name: review.author_name,
                        rating: review.rating,
                        time: review.time
                      }));
                    }
                    if (details.user_ratings_total) {
                      vendor.totalReviews = details.user_ratings_total;
                      console.log(`📊 ${place.name} totalReviews set to:`, details.user_ratings_total);
                    } else {
                      console.log(`⚠️ ${place.name} has no user_ratings_total`);
                    }
                    
                    // Add all photos
                    if (details.photos && details.photos.length > 0) {
                      vendor.images = details.photos.map((photo: any) => 
                        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${process.env.GOOGLE_PLACES_API_KEY}`
                      );
                      vendor.image = vendor.images[0]; // First image as main image
                    }
                    
                    return vendor;
                  } catch (error) {
                    console.error(`Error fetching details for ${place.name}:`, error);
                    // Fallback to basic information
                    const vendor: any = {
                      id: place.place_id,
                      name: place.name,
                      category: categoryMapping[categoryKey]?.singular || googleType,
                      price: place.price_level ? '$'.repeat(place.price_level) : 'Contact for pricing',
                      rating: parseFloat((place.rating || 4.0).toFixed(2)),
                      vicinity: place.vicinity || place.formatted_address || 'Local area',
                      description: place.editorial_summary?.overview || (place.types && place.types.length > 0 && !place.types[0].includes('point_of_interest') ? place.types[0] : `${categoryMapping[categoryKey]?.singular || googleType} services`)
                    };
                    
                    if (place.photos?.[0]) {
                      vendor.image = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
                    }
                    
                    return vendor;
                  }
                }));
                // Vendors fetched successfully
              } else {
                // No results found
                convertedVendors[categoryKey] = [];
              }
            } else {
              // API error occurred
              convertedVendors[categoryKey] = [];
            }
          } catch (error) {
            // Error fetching vendors
            convertedVendors[categoryKey] = [];
          }
        }
      } catch (error) {
        console.error('Error fetching vendors:', error);
      }
      
      vendors = convertedVendors;
      // Vendors converted successfully
    }
    
    // If only todos are provided, generate budget and vendors
    if (todos && !budget && !vendors) {
      console.log('Only todos provided, generating budget and vendors...');
      
      // Generate basic budget breakdown
      const budget = {
        total: weddingData.maxBudget,
        categories: [
          { name: 'Venue', amount: Math.round(weddingData.maxBudget * 0.4), percentage: 40, description: 'Ceremony and reception venue' },
          { name: 'Catering', amount: Math.round(weddingData.maxBudget * 0.3), percentage: 30, description: 'Food and beverages' },
          { name: 'Photography', amount: Math.round(weddingData.maxBudget * 0.15), percentage: 15, description: 'Photos and videos' },
          { name: 'Flowers', amount: Math.round(weddingData.maxBudget * 0.08), percentage: 8, description: 'Bouquets and decorations' },
          { name: 'Music', amount: Math.round(weddingData.maxBudget * 0.07), percentage: 7, description: 'Entertainment' }
        ]
      };
      
      // Fetch real vendors from your database
      try {
        const vendorCategories = ['venue', 'photographer', 'florist', 'caterer', 'music'];
        const vendors: any = {};
        
        for (const category of vendorCategories) {
          try {
            const vendorResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/vendors/search?category=${category}&limit=5&location=${encodeURIComponent(weddingData.weddingLocation || '')}`);
            if (vendorResponse.ok) {
              const vendorData = await vendorResponse.json();
              vendors[category + 's'] = vendorData.vendors?.slice(0, 5).map((vendor: any) => ({
                id: vendor.placeId || vendor.id,
                name: vendor.name,
                category: category.charAt(0).toUpperCase() + category.slice(1),
                price: vendor.price_level ? '$'.repeat(vendor.price_level) : 'Contact for pricing',
                rating: vendor.rating || 0,
                vicinity: vendor.vicinity || vendor.formatted_address || 'Local area',
                description: vendor.types?.[0] || `${category} services`,
                image: vendor.photos?.[0] ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${vendor.photos[0].photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}` : '/Venue.png',
                address: vendor.formatted_address,
                phone: vendor.formatted_phone_number,
                website: vendor.website
              })) || [];
            } else {
              console.log(`Failed to fetch ${category} vendors:`, vendorResponse.status);
              vendors[category + 's'] = [];
            }
          } catch (error) {
            console.log(`Error fetching ${category} vendors:`, error);
            vendors[category + 's'] = [];
          }
        }
      } catch (error) {
        console.error('Error fetching real vendors:', error);
        // Fallback to empty vendors if real vendors fail
        vendors = {
          venues: [],
          photographers: [],
          florists: [],
          caterers: [],
          music: []
        };
      }
    }

    // Save generated content to Firestore
    const userRef = adminDb.collection('users').doc(userId);
    
    try {
      // Validate data before saving
      if (!Array.isArray(todos)) {
        console.log('⚠️ Todos is not an array, creating empty array');
        todos = [];
      }
      
      if (!budget || typeof budget !== 'object') {
        console.log('⚠️ Budget is not an object, creating default budget');
        budget = { total: 0, categories: [] };
      }
      
      if (!vendors || typeof vendors !== 'object') {
        console.log('⚠️ Vendors is not an object, creating empty object');
        vendors = {};
      }
      
      // Save todos
      const todoListRef = adminDb.collection('users').doc(userId).collection('todoLists').doc('wedding-planning');
    await todoListRef.set({
      name: 'Wedding Planning',
      description: 'Your personalized wedding planning checklist',
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: true,
      items: todos.map((todo: any, index: number) => {
        // Filter out undefined values
        const cleanTodo: any = {
          id: `todo-${index + 1}`,
          title: todo.title || 'Untitled Task',
          description: todo.description || '',
          category: todo.category || 'General',
          deadline: todo.deadline || null,
          priority: todo.priority || 'Medium',
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Remove any undefined values
        Object.keys(cleanTodo).forEach(key => {
          if (cleanTodo[key] === undefined) {
            delete cleanTodo[key];
          }
        });
        
        return cleanTodo;
      })
    });

    // Save budget
    const budgetRef = adminDb.collection('users').doc(userId).collection('budgetCategories').doc('wedding-budget');
    const cleanBudget = {
      name: 'Wedding Budget',
      total: budget.total || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      categories: budget.categories || []
    };
    
    // Remove undefined values
    Object.keys(cleanBudget).forEach(key => {
      if (cleanBudget[key] === undefined) {
        delete cleanBudget[key];
      }
    });
    
    await budgetRef.set(cleanBudget);
      // Budget saved

    // Save vendor recommendations
    const vendorsRef = adminDb.collection('users').doc(userId).collection('onboardingVendors').doc('recommendations');
    
    // Deep clean vendor data to remove all undefined values
    const deepCleanVendors = (vendors: any): any => {
      if (!vendors || typeof vendors !== 'object') return {};
      
      const cleaned: any = {};
      for (const [category, vendorList] of Object.entries(vendors)) {
        if (Array.isArray(vendorList)) {
          cleaned[category] = vendorList.map((vendor: any) => {
            if (!vendor || typeof vendor !== 'object') return {};
            
            const cleanVendor: any = {};
            for (const [key, value] of Object.entries(vendor)) {
              if (value !== undefined && value !== null) {
                cleanVendor[key] = value;
              }
            }
            
            // Debug totalReviews specifically
            if (vendor.name && vendor.name.toLowerCase().includes('hook')) {
              console.log(`🧹 Cleaning ${vendor.name}:`, {
                originalTotalReviews: vendor.totalReviews,
                cleanedTotalReviews: cleanVendor.totalReviews,
                originalKeys: Object.keys(vendor),
                cleanedKeys: Object.keys(cleanVendor)
              });
            }
            
            return cleanVendor;
          });
        } else if (vendorList && typeof vendorList === 'object') {
          cleaned[category] = deepCleanVendors(vendorList);
        }
      }
      return cleaned;
    };
    
    const cleanVendors = {
      createdAt: new Date(),
      updatedAt: new Date(),
      vendors: deepCleanVendors(vendors)
    };
    
    // Vendor data cleaned
    
    await vendorsRef.set(cleanVendors);
    // Vendors saved

    // Update user onboarding status
      await userRef.update({
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
        lastUpdated: new Date()
      });

      // Content generated and saved successfully
      // Final vendor data prepared

      return NextResponse.json({
        success: true,
        data: {
          todos,
          budget,
          vendors,
          // Include wedding details for the UI
          weddingDate: weddingData.weddingDate,
          guestCount: weddingData.guestCount,
          budgetAmount: weddingData.maxBudget,
          location: weddingData.weddingLocation,
          additionalContext: weddingData.additionalContext,
          usedFallbackTodos // Flag to show banner if fallback was used
        }
      });
    } catch (firestoreError) {
      console.error('❌ Firestore save error:', firestoreError);
      throw new Error(`Failed to save to Firestore: ${firestoreError.message}`);
    }

  } catch (error) {
    console.error('Error generating preliminary content with RAG:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      { error: 'Failed to generate preliminary content', details: error.message },
      { status: 500 }
    );
  }
}
