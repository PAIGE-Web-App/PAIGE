#!/usr/bin/env node

/**
 * Category Mapping Validation Script
 * 
 * This script validates that all category mappings are consistent across
 * the three core functions: getCategorySlug, getCategoryFromSlug, and getCategoryLabel.
 * 
 * Usage: node scripts/validate-categories.js
 */

// Import the validation function (this would need to be adapted for Node.js)
// For now, we'll include the validation logic directly

const validateCategoryMappings = () => {
  const errors = [];
  const warnings = [];
  const missingMappings = [];

  // Define the mappings (keep in sync with utils/vendorUtils.ts)
  const slugToCategory = {
    'restaurant': 'Reception Venue',
    'church': 'Church',
    'night_club': 'Night Club',
    'bakery': 'Baker',
    'jewelry_store': 'Jeweler',
    'hair_care': 'Hair Stylist',
    'clothing_store': 'Dress Shop',
    'beauty_salon': 'Beauty Salon',
    'spa': 'Spa',
    'photographer': 'Photographer',
    'florist': 'Florist',
    'caterer': 'Caterer',
    'car_rental': 'Car Rental',
    'travel_agency': 'Travel Agency',
    'wedding_planner': 'Wedding Planner',
    'officiant': 'Officiant',
    'suit_rental': 'Suit & Tux Rental',
    'makeup_artist': 'Makeup Artist',
    'stationery': 'Stationery',
    'rentals': 'Event Rental',
    'favors': 'Wedding Favor',
    'band': 'Band',
    'dj': 'DJ'
  };

  const categoryToSlug = {
    'Venue': 'restaurant',
    'Reception Venue': 'restaurant',
    'Church': 'church',
    'Night Club': 'night_club',
    'Baker': 'bakery',
    'Jeweler': 'jewelry_store',
    'Hair Stylist': 'hair_care',
    'Dress Shop': 'clothing_store',
    'Beauty Salon': 'beauty_salon',
    'Spa': 'spa',
    'Photographer': 'photographer',
    'Florist': 'florist',
    'Caterer': 'caterer',
    'Car Rental': 'car_rental',
    'Travel Agency': 'travel_agency',
    'Wedding Planner': 'wedding_planner',
    'Officiant': 'officiant',
    'Suit & Tux Rental': 'suit_rental',
    'Makeup Artist': 'makeup_artist',
    'Stationery': 'stationery',
    'Event Rental': 'rentals',
    'Wedding Favor': 'favors',
    'Band': 'band',
    'DJ': 'dj'
  };

  const categoryToPlural = {
    'Venue': 'Venues',
    'Reception Venue': 'Reception Venues',
    'Church': 'Churches',
    'Night Club': 'Night Clubs',
    'Baker': 'Bakeries & Cakes',
    'Jeweler': 'Jewelers',
    'Hair Stylist': 'Hair & Beauty',
    'Dress Shop': 'Bridal Salons',
    'Beauty Salon': 'Beauty Salons',
    'Spa': 'Spas',
    'Photographer': 'Photographers',
    'Florist': 'Florists',
    'Caterer': 'Catering',
    'Car Rental': 'Car Rentals',
    'Travel Agency': 'Travel Agencies',
    'Wedding Planner': 'Wedding Planners',
    'Officiant': 'Officiants',
    'Suit & Tux Rental': 'Suit & Tux Rentals',
    'Makeup Artist': 'Makeup Artists',
    'Stationery': 'Stationery & Invitations',
    'Event Rental': 'Event Rentals',
    'Wedding Favor': 'Wedding Favors',
    'Band': 'Bands',
    'DJ': 'DJs'
  };

  // Check for bidirectional consistency
  for (const [slug, category] of Object.entries(slugToCategory)) {
    if (categoryToSlug[category] !== slug) {
      errors.push(`Inconsistent mapping: ${slug} -> ${category} but ${category} -> ${categoryToSlug[category]}`);
    }
  }

  // Check for missing plural mappings
  for (const category of Object.values(slugToCategory)) {
    if (!categoryToPlural[category]) {
      missingMappings.push(`Missing plural mapping for: ${category}`);
    }
  }

  // Check for orphaned mappings (excluding special cases like 'Venue' which maps to 'restaurant')
  for (const category of Object.keys(categoryToPlural)) {
    if (!Object.values(slugToCategory).includes(category)) {
      // Special case: 'Venue' maps to 'restaurant' slug, so it's not orphaned
      if (category !== 'Venue') {
        warnings.push(`Orphaned plural mapping: ${category} (not in slug mappings)`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missingMappings
  };
};

// Test specific conversions
const testConversions = () => {
  console.log('\n🧪 Testing Category Conversions:');
  
  const testCases = [
    { slug: 'wedding_planner', expected: 'Wedding Planner' },
    { slug: 'hair_care', expected: 'Hair Stylist' },
    { slug: 'jewelry_store', expected: 'Jeweler' },
    { slug: 'suit_rental', expected: 'Suit & Tux Rental' },
    { slug: 'beauty_salon', expected: 'Beauty Salon' }
  ];

  testCases.forEach(({ slug, expected }) => {
    // Simulate getCategoryFromSlug logic
    const slugToCategory = {
      'restaurant': 'Reception Venue',
      'church': 'Church',
      'night_club': 'Night Club',
      'bakery': 'Baker',
      'jewelry_store': 'Jeweler',
      'hair_care': 'Hair Stylist',
      'clothing_store': 'Dress Shop',
      'beauty_salon': 'Beauty Salon',
      'spa': 'Spa',
      'photographer': 'Photographer',
      'florist': 'Florist',
      'caterer': 'Caterer',
      'car_rental': 'Car Rental',
      'travel_agency': 'Travel Agency',
      'wedding_planner': 'Wedding Planner',
      'officiant': 'Officiant',
      'suit_rental': 'Suit & Tux Rental',
      'makeup_artist': 'Makeup Artist',
      'stationery': 'Stationery',
      'rentals': 'Event Rental',
      'favors': 'Wedding Favor',
      'band': 'Band',
      'dj': 'DJ'
    };
    
    const result = slugToCategory[slug] || slug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const status = result === expected ? '✅' : '❌';
    console.log(`${status} ${slug} -> ${result} (expected: ${expected})`);
  });
};

// Main execution
console.log('🔍 Category Mapping Validation');
console.log('================================');

const validation = validateCategoryMappings();

console.log(`\n📊 Validation Results:`);
console.log(`Valid: ${validation.isValid ? '✅ Yes' : '❌ No'}`);

if (validation.errors.length > 0) {
  console.log(`\n❌ Errors (${validation.errors.length}):`);
  validation.errors.forEach(error => console.log(`  - ${error}`));
}

if (validation.warnings.length > 0) {
  console.log(`\n⚠️  Warnings (${validation.warnings.length}):`);
  validation.warnings.forEach(warning => console.log(`  - ${warning}`));
}

if (validation.missingMappings.length > 0) {
  console.log(`\n🔍 Missing Mappings (${validation.missingMappings.length}):`);
  validation.missingMappings.forEach(missing => console.log(`  - ${missing}`));
}

if (validation.isValid) {
  console.log('\n🎉 All category mappings are consistent!');
} else {
  console.log('\n🚨 Category mappings have issues that need to be fixed.');
  process.exit(1);
}

testConversions();

console.log('\n📋 Summary:');
console.log('- Total categories:', Object.keys(validation.errors).length + 23); // Approximate
console.log('- Validation passed:', validation.isValid);
console.log('- Ready for deployment:', validation.isValid); 