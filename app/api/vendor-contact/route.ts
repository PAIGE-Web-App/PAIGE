import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import dns from 'dns';
import { promisify } from 'util';
import { createConnection } from 'net';
import { v4 as uuidv4 } from 'uuid';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

// Promisify DNS functions
const resolveMx = promisify(dns.resolveMx);

// Email verification functions
const verifyDomain = async (domain: string): Promise<boolean> => {
  try {
    const mxRecords = await resolveMx(domain);
    return mxRecords.length > 0;
  } catch {
    return false;
  }
};

const extractDomain = (website: string): string => {
  return website.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
};

const isValidEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const generateEmailCandidates = (domain: string): string[] => {
  const patterns = [
    'info@',
    'contact@', 
    'hello@',
    'inquiries@',
    'sales@',
    'events@',
    'weddings@',
    'bookings@',
    'reservations@',
    'venue@',
    'catering@',
    'florist@',
    'photography@',
    'dj@',
    'music@',
    'planning@',
    'coordination@',
    'admin@',
    'office@',
    'reception@'
  ];
  
  return patterns.map(pattern => pattern + domain);
};

// SMTP verification function
const verifyEmailWithSMTP = async (email: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const domain = email.split('@')[1];
    const timeout = 10000; // 10 second timeout
    
    // Get MX records for the domain
    resolveMx(domain)
      .then((mxRecords) => {
        if (mxRecords.length === 0) {
          resolve(false);
          return;
        }
        
        // Sort by priority and try the first one
        const sortedMx = mxRecords.sort((a, b) => a.priority - b.priority);
        const mailServer = sortedMx[0].exchange;
        
        // Create connection to mail server
        const socket = createConnection(25, mailServer);
        
        let response = '';
        let step = 0;
        
        const timeoutId = setTimeout(() => {
          socket.destroy();
          resolve(false);
        }, timeout);
        
        socket.on('connect', () => {
          step = 1;
        });
        
        socket.on('data', (data) => {
          response += data.toString();
          
          if (step === 1) {
            // Send HELO
            socket.write(`HELO ${domain}\r\n`);
            step = 2;
          } else if (step === 2 && response.includes('250')) {
            // Send MAIL FROM
            socket.write(`MAIL FROM: <test@${domain}>\r\n`);
            step = 3;
          } else if (step === 3 && response.includes('250')) {
            // Send RCPT TO
            socket.write(`RCPT TO: <${email}>\r\n`);
            step = 4;
          } else if (step === 4) {
            // Check response
            clearTimeout(timeoutId);
            socket.write('QUIT\r\n');
            socket.destroy();
            
            // 250 means email exists, 550 means it doesn't
            const isValid = response.includes('250') && !response.includes('550');
            resolve(isValid);
          }
        });
        
        socket.on('error', () => {
          clearTimeout(timeoutId);
          resolve(false);
        });
        
        socket.on('close', () => {
          clearTimeout(timeoutId);
          if (step < 4) resolve(false);
        });
      })
      .catch(() => {
        resolve(false);
      });
  });
};

// Function to get vendor category from types
const getVendorCategory = (vendor: any): string => {
  if (vendor.types && Array.isArray(vendor.types)) {
    const typeToCategory: Record<string, string> = {
      'florist': 'Florist',
      'jewelry_store': 'Jewelry',
      'bakery': 'Bakery',
      'restaurant': 'Reception Venue',
      'hair_care': 'Hair & Beauty',
      'photographer': 'Photographer',
      'videographer': 'Videographer',
      'clothing_store': 'Bridal Salon',
      'beauty_salon': 'Beauty Salon',
      'spa': 'Spa',
      'dj': 'DJ',
      'band': 'Band',
      'wedding_planner': 'Wedding Planner',
      'caterer': 'Catering',
      'car_rental': 'Car Rental',
      'travel_agency': 'Travel Agency',
      'officiant': 'Officiant',
      'suit_rental': 'Suit/Tux Rental',
      'makeup_artist': 'Makeup Artist',
      'stationery': 'Stationery',
      'rentals': 'Rentals',
      'favors': 'Favors'
    };
    
    for (const type of vendor.types) {
      if (typeToCategory[type]) {
        return typeToCategory[type];
      }
    }
  }
  return 'Vendor';
};

// Function to get verified vendor emails from global database
const getVendorEmails = async (placeId: string): Promise<string[]> => {
  try {
    const adminDb = (await import('@/lib/firebaseAdmin')).adminDb;
    const vendorEmailDoc = await adminDb.collection('vendorEmails').doc(placeId).get();
    
    if (vendorEmailDoc.exists) {
      const data = vendorEmailDoc.data();
      const emails = data?.emails || [];
      // Return primary email first, then others
      const primaryEmail = emails.find((e: any) => e.isPrimary);
      const otherEmails = emails.filter((e: any) => !e.isPrimary);
      return [primaryEmail?.email, ...otherEmails.map((e: any) => e.email)].filter(Boolean);
    }
    return [];
  } catch (error) {
    console.error('Error fetching vendor emails:', error);
    return [];
  }
};

// Function to save vendor as contact for messaging
const saveVendorAsContact = async (vendor: any, verifiedEmail: string | null, userId: string) => {
  try {
    const { addVendorAsContact } = await import('@/lib/addVendorToUserAndCommunity');
    
    // Use the new function to add vendor as a messaging contact
    const result = await addVendorAsContact({
      userId,
      vendorMetadata: vendor,
      category: getVendorCategory(vendor),
      selectedAsVenue: false,
      selectedAsVendor: true
    });
    
    if (result.success) {
      console.log(`✅ Vendor saved as contact: ${vendor.name}`);
      
      // Update the contact with additional information
      const adminDb = (await import('@/lib/firebaseAdmin')).adminDb;
      const contactRef = adminDb.collection(`users/${userId}/contacts`).doc(result.contactId!);
      await contactRef.update({
        email: verifiedEmail,
        contactedAt: new Date().toISOString(),
        lastContactMethod: verifiedEmail ? 'email' : 'website',
        channel: 'Vendor Catalog'
      });
      
      return { id: result.contactId, name: vendor.name };
    } else {
      console.error(`Error saving vendor as contact: ${vendor.name}`, result.error);
      return null;
    }
  } catch (error) {
    console.error(`Error saving vendor as contact: ${vendor.name}`, error);
    return null;
  }
};

const verifyVendorEmail = async (vendor: any): Promise<string | null> => {
  if (!vendor.website) return null;
  
  const domain = extractDomain(vendor.website);
  
  // Step 1: Verify domain accepts email
  const domainValid = await verifyDomain(domain);
  if (!domainValid) {
    console.log(`Domain ${domain} does not accept email`);
    return null;
  }
  
  // Step 2: Test email candidates with SMTP verification
  const emailCandidates = generateEmailCandidates(domain);
  
  // Limit to first 5 candidates to avoid overwhelming mail servers
  const limitedCandidates = emailCandidates.slice(0, 5);
  
  for (const email of limitedCandidates) {
    try {
      // Step 1: Basic format validation
      if (!isValidEmailFormat(email)) {
        console.log(`❌ Invalid email format: ${email}`);
        continue;
      }
      
      console.log(`Testing email with SMTP: ${email}`);
      
      // Step 2: SMTP verification with timeout
      const emailValid = await Promise.race([
        verifyEmailWithSMTP(email),
        new Promise<boolean>((resolve) => 
          setTimeout(() => resolve(false), 5000) // 5 second timeout per email
        )
      ]);
      
      if (emailValid) {
        console.log(`✅ Email verified: ${email}`);
        return email;
      } else {
        console.log(`❌ Email invalid: ${email}`);
      }
      
      // Small delay between attempts to be respectful to mail servers
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`Email ${email} verification failed:`, error);
      continue;
    }
  }
  
  console.log(`No valid emails found for domain: ${domain}`);
  return null;
};

export async function POST(req: NextRequest) {
  try {
    const { vendorDetails, message, userId } = await req.json();

    if (!vendorDetails || !message || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user's Google tokens from Firestore
    const adminDb = (await import('@/lib/firebaseAdmin')).adminDb;
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const { accessToken, refreshToken } = userData?.googleTokens || {};

    if (!accessToken || !refreshToken) {
      return NextResponse.json({ error: 'Google authentication required' }, { status: 401 });
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });

    // Check if token needs refresh
    const tokenExpiry = oauth2Client.credentials.expiry_date;
    if (tokenExpiry && tokenExpiry < Date.now()) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        await userDocRef.set({
          googleTokens: {
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token || refreshToken,
            expiryDate: credentials.expiry_date,
          },
        }, { merge: true });
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        return NextResponse.json({ error: 'Failed to refresh Google authentication' }, { status: 401 });
      }
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Process each vendor
    const results: any[] = [];
    const savedContacts: any[] = [];
    
    for (const vendor of vendorDetails) {
      try {
        // Add vendor to community database and user's vendor management system
        try {
          const { addVendorToUserAndCommunity } = await import('@/lib/addVendorToUserAndCommunity');
          const result = await addVendorToUserAndCommunity({
            userId,
            vendorMetadata: vendor,
            category: getVendorCategory(vendor),
            selectedAsVenue: false,
            selectedAsVendor: true
          });

          if (!result.success) {
            console.error('Failed to add vendor to management system:', result.error);
          } else {
            console.log('Successfully added vendor to management system');
          }
        } catch (error) {
          console.error('Error adding vendor to management system:', error);
        }

        // First, check for verified emails in global database
        const verifiedEmails = await getVendorEmails(vendor.place_id);
        let vendorEmail: string | null = null;
        let emailSource = '';

        if (verifiedEmails.length > 0) {
          // Use verified email from global database
          vendorEmail = verifiedEmails[0]; // Use primary email
          emailSource = 'crowdsourced';
        } else {
          // Fallback to SMTP verification
          vendorEmail = await verifyVendorEmail(vendor);
          emailSource = 'smtp';
        }
        
        if (vendorEmail) {
          // Send email via Gmail
          const emailContent = `To: ${vendorEmail}\r\n` +
            `Subject: Wedding Inquiry - ${vendor.name}\r\n` +
            `Content-Type: text/plain; charset=utf-8\r\n` +
            `\r\n` +
            message;

          const encodedEmail = Buffer.from(emailContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

          const sentMessage = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
              raw: encodedEmail,
            },
          });

          // Save vendor as contact
          const savedContact = await saveVendorAsContact(vendor, vendorEmail, userId);
          if (savedContact) {
            savedContacts.push(savedContact);
          }

          results.push({
            vendor: vendor.name,
            method: 'email',
            email: vendorEmail,
            success: true,
            messageId: sentMessage.data.id,
            verified: true,
            contactSaved: !!savedContact,
            emailSource: emailSource
          });
        } else {
          // Fallback: open website contact form
          // Still save vendor as contact even without email
          const savedContact = await saveVendorAsContact(vendor, null, userId);
          if (savedContact) {
            savedContacts.push(savedContact);
          }

          results.push({
            vendor: vendor.name,
            method: 'website',
            website: vendor.website,
            success: true,
            note: 'No valid email found, website opened for manual contact',
            verified: false,
            contactSaved: !!savedContact
          });
        }
      } catch (error) {
        console.error(`Error contacting ${vendor.name}:`, error);
        results.push({
          vendor: vendor.name,
          method: 'failed',
          success: false,
          error: error.message,
          verified: false,
          contactSaved: false
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      results,
      savedContacts,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        emailsSent: results.filter(r => r.method === 'email').length,
        websitesOpened: results.filter(r => r.method === 'website').length,
        contactsSaved: savedContacts.length
      }
    });

  } catch (error) {
    console.error('Error in vendor contact:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 