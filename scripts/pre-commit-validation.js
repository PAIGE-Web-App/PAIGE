#!/usr/bin/env node

/**
 * Pre-commit Category Validation Script
 * 
 * This script runs category mapping validation before commits to ensure
 * consistency is maintained. Can be integrated into git hooks or CI/CD.
 * 
 * Usage: node scripts/pre-commit-validation.js
 */

const fs = require('fs');
const path = require('path');

// Check if vendorUtils.ts has been modified
const checkVendorUtilsModified = () => {
  try {
    const gitStatus = require('child_process').execSync('git status --porcelain', { encoding: 'utf8' });
    return gitStatus.includes('utils/vendorUtils.ts');
  } catch (error) {
    console.log('⚠️  Could not check git status, proceeding with validation...');
    return true; // Assume modified to be safe
  }
};

// Extract category mappings from vendorUtils.ts
const extractMappingsFromFile = () => {
  try {
    const filePath = path.join(__dirname, '..', 'utils', 'vendorUtils.ts');
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract the three mapping objects using regex
    const slugToCategoryMatch = content.match(/const slugToCategory: Record<string, string> = \{([^}]+)\}/);
    const categoryToSlugMatch = content.match(/const categoryToGoogleType: Record<string, string> = \{([^}]+)\}/);
    const categoryToPluralMatch = content.match(/const categoryToPlural: Record<string, string> = \{([^}]+)\}/);
    
    if (!slugToCategoryMatch || !categoryToSlugMatch || !categoryToPluralMatch) {
      throw new Error('Could not extract category mappings from vendorUtils.ts');
    }
    
    // Parse the mappings (simplified parsing)
    const parseMapping = (match) => {
      const lines = match[1].split('\n');
      const mapping = {};
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.includes("': '") || trimmed.includes("': '")) {
          const parts = trimmed.split("': '");
          if (parts.length === 2) {
            const key = parts[0].replace("'", '').trim();
            const value = parts[1].replace("',", '').replace("'", '').trim();
            if (key && value) {
              mapping[key] = value;
            }
          }
        }
      });
      return mapping;
    };
    
    return {
      slugToCategory: parseMapping(slugToCategoryMatch),
      categoryToSlug: parseMapping(categoryToSlugMatch),
      categoryToPlural: parseMapping(categoryToPluralMatch)
    };
  } catch (error) {
    console.error('❌ Error extracting mappings:', error.message);
    return null;
  }
};

// Validate the extracted mappings
const validateMappings = (mappings) => {
  if (!mappings) return { isValid: false, errors: ['Could not extract mappings'] };
  
  const { slugToCategory, categoryToSlug, categoryToPlural } = mappings;
  const errors = [];
  const warnings = [];
  const missingMappings = [];

  // Check for bidirectional consistency
  for (const [slug, category] of Object.entries(slugToCategory)) {
    if (categoryToSlug[category] !== slug) {
      errors.push(`Inconsistent mapping: ${slug} -> ${category} but ${category} -> ${categoryToSlug[category] || 'undefined'}`);
    }
  }

  // Check for missing plural mappings
  for (const category of Object.values(slugToCategory)) {
    if (!categoryToPlural[category]) {
      missingMappings.push(`Missing plural mapping for: ${category}`);
    }
  }

  // Check for orphaned mappings
  for (const category of Object.keys(categoryToPlural)) {
    if (!Object.values(slugToCategory).includes(category)) {
      warnings.push(`Orphaned plural mapping: ${category} (not in slug mappings)`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missingMappings
  };
};

// Main execution
const main = () => {
  console.log('🔍 Pre-commit Category Validation');
  console.log('==================================');
  
  // Check if vendorUtils.ts was modified
  const vendorUtilsModified = checkVendorUtilsModified();
  if (!vendorUtilsModified) {
    console.log('✅ utils/vendorUtils.ts not modified, skipping validation');
    return 0;
  }
  
  console.log('📝 utils/vendorUtils.ts modified, running validation...');
  
  // Extract and validate mappings
  const mappings = extractMappingsFromFile();
  const validation = validateMappings(mappings);
  
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
    console.log('\n🎉 Category mappings are consistent!');
    console.log('✅ Pre-commit validation passed');
    return 0;
  } else {
    console.log('\n🚨 Category mappings have issues that need to be fixed.');
    console.log('❌ Pre-commit validation failed');
    console.log('\n💡 To fix:');
    console.log('1. Update all three mapping functions in utils/vendorUtils.ts');
    console.log('2. Run: node scripts/validate-categories.js');
    console.log('3. Ensure bidirectional consistency');
    return 1;
  }
};

// Run the validation
const exitCode = main();
process.exit(exitCode); 