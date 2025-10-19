# Category Mapping System Guide

## Overview

The category mapping system ensures consistent formatting of vendor categories across the entire PAIGE application. This system is **critical for breadcrumb consistency** and must be maintained carefully.

## Architecture

The system consists of **three core functions** that work together:

1. **`getCategorySlug(displayCategory)`** - Converts display category to URL slug
2. **`getCategoryFromSlug(slug)`** - Converts URL slug back to display category  
3. **`getCategoryLabel(displayCategory)`** - Converts display category to plural form

## Current Category Mappings

| URL Slug | Display Category | Plural Form |
|----------|------------------|-------------|
| `restaurant` | Reception Venue | Reception Venues |
| `church` | Church | Churches |
| `night_club` | Night Club | Night Clubs |
| `bakery` | Baker | Bakeries & Cakes |
| `jewelry_store` | Jeweler | Jewelers |
| `hair_care` | Hair Stylist | Hair & Beauty |
| `clothing_store` | Dress Shop | Bridal Salons |
| `beauty_salon` | Beauty Salon | Beauty Salons |
| `spa` | Spa | Spas |
| `photographer` | Photographer | Photographers |
| `florist` | Florist | Florists |
| `caterer` | Caterer | Catering |
| `car_rental` | Car Rental | Car Rentals |
| `travel_agency` | Travel Agency | Travel Agencies |
| `wedding_planner` | Wedding Planner | Wedding Planners |
| `officiant` | Officiant | Officiants |
| `suit_rental` | Suit & Tux Rental | Suit & Tux Rentals |
| `makeup_artist` | Makeup Artist | Makeup Artists |
| `stationery` | Stationery | Stationery & Invitations |
| `rentals` | Event Rental | Event Rentals |
| `favors` | Wedding Favor | Wedding Favors |
| `band` | Band | Bands |
| `dj` | DJ | DJs |

## Maintenance Rules

### ⚠️ CRITICAL: When Adding/Modifying Categories

**You MUST update ALL THREE functions simultaneously:**

1. **`getCategorySlug()`** - Add the display → slug mapping
2. **`getCategoryFromSlug()`** - Add the slug → display mapping  
3. **`getCategoryLabel()`** - Add the display → plural mapping

### Example: Adding a New Category

```typescript
// 1. In getCategorySlug()
'New Category': 'new_category',

// 2. In getCategoryFromSlug() 
'new_category': 'New Category',

// 3. In getCategoryLabel()
'New Category': 'New Categories',
```

## Validation

### Running Validation

Use the built-in validation function to check for inconsistencies:

```typescript
import { validateCategoryMappings } from '@/utils/vendorUtils';

const validation = validateCategoryMappings();
console.log('Is valid:', validation.isValid);
console.log('Errors:', validation.errors);
console.log('Warnings:', validation.warnings);
```

### What Validation Checks

- **Bidirectional Consistency**: Ensures slug ↔ display mappings are reversible
- **Missing Plural Mappings**: Finds categories without plural forms
- **Orphaned Mappings**: Identifies unused plural mappings

## Testing

### Manual Testing Checklist

Before deploying category changes:

- [ ] Run `validateCategoryMappings()` - should return `isValid: true`
- [ ] Test breadcrumb generation on vendor catalog pages
- [ ] Test breadcrumb generation on vendor detail pages
- [ ] Verify URL slugs work correctly in browser
- [ ] Check that category pills display correctly
- [ ] Ensure search functionality works with new categories

### Automated Testing

Consider adding unit tests for category mappings:

```typescript
describe('Category Mappings', () => {
  test('should have consistent bidirectional mappings', () => {
    const validation = validateCategoryMappings();
    expect(validation.isValid).toBe(true);
  });
  
  test('should convert wedding_planner to Wedding Planner', () => {
    expect(getCategoryFromSlug('wedding_planner')).toBe('Wedding Planner');
  });
  
  test('should convert Wedding Planner to wedding_planner', () => {
    expect(getCategorySlug('Wedding Planner')).toBe('wedding_planner');
  });
});
```

## Common Pitfalls

### ❌ Don't Do This

```typescript
// WRONG: Only updating one function
export const getCategorySlug = (displayCategory: string): string => {
  const categoryToGoogleType: Record<string, string> = {
    // ... existing mappings ...
    'New Category': 'new_category', // ✅ Added here
  };
  return categoryToGoogleType[displayCategory] || categoryToSlug(displayCategory);
};

// MISSING: Forgot to update getCategoryFromSlug and getCategoryLabel
```

### ✅ Do This Instead

```typescript
// 1. Update getCategorySlug
'New Category': 'new_category',

// 2. Update getCategoryFromSlug  
'new_category': 'New Category',

// 3. Update getCategoryLabel
'New Category': 'New Categories',

// 4. Run validation
const validation = validateCategoryMappings();
if (!validation.isValid) {
  throw new Error('Category mappings are inconsistent!');
}
```

## Debugging

### Common Issues

1. **Breadcrumbs showing underscores**: Missing mapping in `getCategoryFromSlug()`
2. **URLs not working**: Missing mapping in `getCategorySlug()`
3. **Plural forms wrong**: Missing mapping in `getCategoryLabel()`
4. **Inconsistent display**: Mappings not bidirectional

### Debug Commands

```typescript
// Check all available categories
import { getAllCategories } from '@/utils/vendorUtils';
console.log(getAllCategories());

// Validate mappings
import { validateCategoryMappings } from '@/utils/vendorUtils';
console.log(validateCategoryMappings());

// Test specific conversions
import { getCategoryFromSlug, getCategorySlug, getCategoryLabel } from '@/utils/vendorUtils';
console.log('Slug to Display:', getCategoryFromSlug('wedding_planner'));
console.log('Display to Slug:', getCategorySlug('Wedding Planner'));
console.log('Display to Plural:', getCategoryLabel('Wedding Planner'));
```

## Future Considerations

### Extensibility

- The system supports fallback conversion for unmapped categories
- New categories can be added without breaking existing functionality
- The validation system prevents inconsistent states

### Performance

- Category mappings are cached in memory
- No database queries required for category conversions
- Validation runs only when explicitly called

### Maintenance

- All mappings are centralized in `utils/vendorUtils.ts`
- Clear documentation and validation tools
- Consistent naming conventions

## Emergency Procedures

If category mappings become inconsistent:

1. **Immediate Fix**: Run validation to identify issues
2. **Rollback**: Revert to last known good state
3. **Gradual Fix**: Update mappings one at a time with validation
4. **Testing**: Verify all vendor pages work correctly

## Contact

For questions about the category mapping system, refer to this guide or check the validation functions in `utils/vendorUtils.ts`. 