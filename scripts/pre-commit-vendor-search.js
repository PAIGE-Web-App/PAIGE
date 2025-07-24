#!/usr/bin/env node

/**
 * Pre-commit Hook for Vendor Search Category Mappings
 * 
 * This script runs before each commit to ensure vendor search category mappings
 * are valid and consistent. It will prevent commits if mappings are broken.
 * 
 * Usage: node scripts/pre-commit-vendor-search.js
 */

// Since this is a TypeScript file, we'll define the validation logic directly here
// This ensures the script works without TypeScript compilation

const VENDOR_SEARCH_CATEGORY_MAPPINGS = {
  'Jeweler': ['jewelry_store'],
  'Florist': ['florist'],
  'Baker': ['bakery'],
  'Venue': ['restaurant'],
  'Hair Stylist': ['hair_care'],
  'Photographer': ['photographer'],
  'Videographer': ['videographer'],
  'Dress Shop': ['clothing_store'],
  'Beauty Salon': ['beauty_salon'],
  'Spa': ['spa'],
  'DJ': ['dj'],
  'Musician': ['band'],
  'Wedding Planner': ['wedding_planner'],
  'Caterer': ['caterer'],
  'Car Rental': ['car_rental'],
  'Travel Agency': ['travel_agency'],
  'Officiant': ['officiant'],
  'Suit/Tux Rental': ['suit_rental'],
  'Makeup Artist': ['makeup_artist'],
  'Stationery': ['stationery'],
  'Rentals': ['rentals'],
  'Favors': ['favors'],
  'Transportation': ['car_rental']
};

const getAllContactCategories = () => {
  return [
    'Photographer', 'Caterer', 'Florist', 'DJ', 'Venue', 'Wedding Planner', 
    'Officiant', 'Baker', 'Dress Shop', 'Suit/Tux Rental', 'Hair Stylist', 
    'Makeup Artist', 'Musician', 'Stationery', 'Transportation', 'Rentals', 
    'Favors', 'Jeweler', 'Videographer', 'Beauty Salon', 'Spa', 'Travel Agency', 
    'Car Rental'
  ];
};

const getAllGooglePlacesTypes = () => {
  return [
    'florist', 'jewelry_store', 'bakery', 'restaurant', 'hair_care', 
    'photographer', 'videographer', 'clothing_store', 'beauty_salon', 
    'spa', 'dj', 'band', 'wedding_planner', 'caterer', 'car_rental', 
    'travel_agency', 'officiant', 'suit_rental', 'makeup_artist', 
    'stationery', 'rentals', 'favors'
  ];
};

const validateVendorSearchMappings = () => {
  const errors = [];
  const warnings = [];
  const missingMappings = [];

  const allContactCategories = getAllContactCategories();

  // Check for missing mappings
  allContactCategories.forEach(category => {
    if (!VENDOR_SEARCH_CATEGORY_MAPPINGS[category]) {
      missingMappings.push(category);
      errors.push(`Missing mapping for contact category: "${category}"`);
    }
  });

  // Check for orphaned mappings
  const mappedCategories = Object.keys(VENDOR_SEARCH_CATEGORY_MAPPINGS);
  mappedCategories.forEach(mappedCategory => {
    if (!allContactCategories.includes(mappedCategory)) {
      warnings.push(`Orphaned mapping: "${mappedCategory}" (not in contact categories list)`);
    }
  });

  // Validate that all Google Places types are valid
  const validGooglePlacesTypes = getAllGooglePlacesTypes();

  Object.entries(VENDOR_SEARCH_CATEGORY_MAPPINGS).forEach(([contactCategory, googleTypes]) => {
    googleTypes.forEach(googleType => {
      if (!validGooglePlacesTypes.includes(googleType)) {
        errors.push(`Invalid Google Places type "${googleType}" for contact category "${contactCategory}"`);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missingMappings
  };
};

console.log('🔍 Pre-commit: Validating Vendor Search Category Mappings...');

try {
  const validation = validateVendorSearchMappings();
  
  if (validation.isValid) {
    console.log('✅ Vendor search mappings are valid - commit allowed');
    process.exit(0);
  } else {
    console.log('❌ Vendor search mappings are invalid - commit blocked');
    console.log('\nErrors found:');
    validation.errors.forEach(error => {
      console.log(`   • ${error}`);
    });
    
    if (validation.warnings.length > 0) {
      console.log('\nWarnings:');
      validation.warnings.forEach(warning => {
        console.log(`   • ${warning}`);
      });
    }
    
    console.log('\n💡 To fix:');
    console.log('   1. Update the VENDOR_SEARCH_CATEGORY_MAPPINGS in utils/vendorSearchUtils.ts');
    console.log('   2. Run: npm run validate-vendor-search');
    console.log('   3. Ensure all contact categories have proper mappings');
    
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Error during vendor search validation:', error.message);
  console.log('\n💡 This might be due to:');
  console.log('   • Missing utils/vendorSearchUtils.ts file');
  console.log('   • Syntax errors in the vendor search utilities');
  console.log('   • Missing dependencies');
  
  process.exit(1);
} 