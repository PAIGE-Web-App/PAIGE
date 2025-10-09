import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userId, weddingData } = await req.json();

    if (!userId || !weddingData) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    console.log('Generating mock preliminary content for:', weddingData.userName, '&', weddingData.partnerName);

    // Mock data that matches the expected format
    const mockData = {
      todos: [
        {
          title: 'Book ceremony venue',
          category: 'Venue',
          deadline: '6 months before',
          priority: 'High',
          description: 'Secure your ceremony location'
        },
        {
          title: 'Hire photographer',
          category: 'Photography',
          deadline: '8 months before',
          priority: 'High',
          description: 'Research and book wedding photographer'
        },
        {
          title: 'Order wedding dress',
          category: 'Attire',
          deadline: '6 months before',
          priority: 'High',
          description: 'Find and order your dream dress'
        },
        {
          title: 'Book caterer',
          category: 'Food & Beverage',
          deadline: '4 months before',
          priority: 'High',
          description: 'Taste test and book catering service'
        },
        {
          title: 'Send save the dates',
          category: 'Invitations',
          deadline: '6 months before',
          priority: 'Medium',
          description: 'Send initial wedding announcements'
        }
      ],
      budget: {
        total: weddingData.maxBudget,
        categories: [
          {
            name: 'Venue & Reception',
            amount: Math.round(weddingData.maxBudget * 0.4),
            percentage: 40,
            description: 'Ceremony and reception venue costs'
          },
          {
            name: 'Photography & Videography',
            amount: Math.round(weddingData.maxBudget * 0.15),
            percentage: 15,
            description: 'Professional photo and video services'
          },
          {
            name: 'Food & Beverage',
            amount: Math.round(weddingData.maxBudget * 0.30),
            percentage: 30,
            description: 'Catering and bar services'
          },
          {
            name: 'Attire & Beauty',
            amount: Math.round(weddingData.maxBudget * 0.08),
            percentage: 8,
            description: 'Dress, suit, hair, and makeup'
          },
          {
            name: 'Flowers & Decor',
            amount: Math.round(weddingData.maxBudget * 0.10),
            percentage: 10,
            description: 'Bridal bouquet, centerpieces, and decorations'
          },
          {
            name: 'Music & Entertainment',
            amount: Math.round(weddingData.maxBudget * 0.06),
            percentage: 6,
            description: 'DJ or band for ceremony and reception'
          },
          {
            name: 'Transportation',
            amount: Math.round(weddingData.maxBudget * 0.02),
            percentage: 2,
            description: 'Wedding party transportation'
          },
          {
            name: 'Stationery',
            amount: Math.round(weddingData.maxBudget * 0.03),
            percentage: 3,
            description: 'Invitations, programs, and signage'
          },
          {
            name: 'Favors & Gifts',
            amount: Math.round(weddingData.maxBudget * 0.02),
            percentage: 2,
            description: 'Guest favors and wedding party gifts'
          }
        ]
      },
      vendors: {
        venues: [
          {
            name: 'Garden Manor',
            location: 'Downtown',
            price: '$$$',
            rating: 4.8,
            description: 'Beautiful garden venue with outdoor ceremony space'
          },
          {
            name: 'Historic Hall',
            location: 'Old Town',
            price: '$$',
            rating: 4.5,
            description: 'Charming historic building with character'
          },
          {
            name: 'Modern Loft',
            location: 'Arts District',
            price: '$$$',
            rating: 4.7,
            description: 'Contemporary space with city views'
          },
          {
            name: 'Riverside Pavilion',
            location: 'Waterfront',
            price: '$$',
            rating: 4.6,
            description: 'Scenic riverside location with natural beauty'
          },
          {
            name: 'Country Club',
            location: 'Suburbs',
            price: '$$$$',
            rating: 4.9,
            description: 'Elegant country club with golf course views'
          }
        ],
        photographers: [
          {
            name: 'Sarah Johnson Photography',
            location: 'Local',
            price: '$$$',
            rating: 4.9,
            description: 'Award-winning wedding photographer'
          },
          {
            name: 'Mike & Lisa Studios',
            location: 'Local',
            price: '$$',
            rating: 4.6,
            description: 'Husband and wife photography team'
          },
          {
            name: 'Artistic Visions',
            location: 'Local',
            price: '$$$',
            rating: 4.8,
            description: 'Creative and artistic wedding photography'
          },
          {
            name: 'Classic Moments',
            location: 'Local',
            price: '$$',
            rating: 4.5,
            description: 'Traditional wedding photography with modern touches'
          },
          {
            name: 'Luxury Weddings Co',
            location: 'Local',
            price: '$$$$',
            rating: 4.9,
            description: 'High-end wedding photography and videography'
          }
        ],
        florists: [
          {
            name: 'Blooms & Beyond',
            location: 'Local',
            price: '$$',
            rating: 4.7,
            description: 'Full-service floral design and delivery'
          },
          {
            name: 'Elegant Arrangements',
            location: 'Local',
            price: '$$$',
            rating: 4.8,
            description: 'Custom floral designs for every season'
          },
          {
            name: 'Garden Fresh Florals',
            location: 'Local',
            price: '$$',
            rating: 4.6,
            description: 'Local and seasonal flower arrangements'
          },
          {
            name: 'Luxury Blooms',
            location: 'Local',
            price: '$$$$',
            rating: 4.9,
            description: 'Premium floral design with exotic flowers'
          },
          {
            name: 'Simple & Sweet',
            location: 'Local',
            price: '$',
            rating: 4.4,
            description: 'Affordable and beautiful floral arrangements'
          }
        ],
        caterers: [
          {
            name: 'Gourmet Catering Co',
            location: 'Local',
            price: '$$$',
            rating: 4.8,
            description: 'Upscale catering with custom menus'
          },
          {
            name: 'Family Style Catering',
            location: 'Local',
            price: '$$',
            rating: 4.6,
            description: 'Traditional family recipes and comfort food'
          },
          {
            name: 'Farm to Table Events',
            location: 'Local',
            price: '$$$',
            rating: 4.7,
            description: 'Fresh, locally sourced ingredients'
          },
          {
            name: 'Classic Catering',
            location: 'Local',
            price: '$$',
            rating: 4.5,
            description: 'Reliable catering with standard wedding fare'
          },
          {
            name: 'Luxury Dining',
            location: 'Local',
            price: '$$$$',
            rating: 4.9,
            description: 'Fine dining experience for your special day'
          }
        ],
        music: [
          {
            name: 'DJ Mike Entertainment',
            location: 'Local',
            price: '$$',
            rating: 4.6,
            description: 'Professional DJ with extensive music library'
          },
          {
            name: 'The Wedding Band',
            location: 'Local',
            price: '$$$',
            rating: 4.8,
            description: 'Live band specializing in wedding entertainment'
          },
          {
            name: 'Sound & Vision DJs',
            location: 'Local',
            price: '$$',
            rating: 4.5,
            description: 'Full-service DJ and lighting company'
          },
          {
            name: 'Classical Strings',
            location: 'Local',
            price: '$$$',
            rating: 4.7,
            description: 'Elegant string quartet for ceremony music'
          },
          {
            name: 'Party Time Entertainment',
            location: 'Local',
            price: '$$',
            rating: 4.4,
            description: 'High-energy DJ and MC services'
          }
        ]
      }
    };

    console.log('Successfully generated mock preliminary content for user:', userId);

    return NextResponse.json({
      success: true,
      data: mockData
    });

  } catch (error) {
    console.error('Error generating mock preliminary content:', error);
    return NextResponse.json(
      { error: 'Failed to generate preliminary content' },
      { status: 500 }
    );
  }
}
