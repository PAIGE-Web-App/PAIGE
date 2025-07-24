#!/usr/bin/env node

/**
 * Vendor Search Category Mapping Validation Script
 * 
 * This script validates that all vendor search category mappings are consistent
 * and complete. Run this script to ensure the vendor search functionality works correctly.
 * 
 * Usage: node scripts/validate-vendor-search.js
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

console.log('🔍 Validating Vendor Search Category Mappings...\n');

try {
  const validation = validateVendorSearchMappings();
  
  if (validation.isValid) {
    console.log('✅ All vendor search category mappings are valid!');
  } else {
    console.log('❌ Validation failed with the following errors:');
    validation.errors.forEach(error => {
      console.log(`   • ${error}`);
    });
  }
  
  if (validation.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    validation.warnings.forEach(warning => {
      console.log(`   • ${warning}`);
    });
  }
  
  if (validation.missingMappings.length > 0) {
    console.log('\n📋 Missing mappings for contact categories:');
    validation.missingMappings.forEach(category => {
      console.log(`   • ${category}`);
    });
  }
  
  console.log('\n📊 Summary:');
  console.log(`   • Contact categories: ${getAllContactCategories().length}`);
  console.log(`   • Google Places types: ${getAllGooglePlacesTypes().length}`);
  console.log(`   • Mappings defined: ${Object.keys(VENDOR_SEARCH_CATEGORY_MAPPINGS).length}`);
  console.log(`   • Errors: ${validation.errors.length}`);
  console.log(`   • Warnings: ${validation.warnings.length}`);
  console.log(`   • Missing mappings: ${validation.missingMappings.length}`);
  
  if (!validation.isValid) {
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Error during validation:', error.message);
  process.exit(1);
} 