# Vendor Search Category Mapping System Guide

## Overview

The vendor search category mapping system ensures consistent and accurate vendor search functionality across the entire PAIGE application. This system is **critical for ensuring users can find relevant vendors when adding contacts**.

## Architecture

The system consists of **one centralized utility file** that contains all the mapping logic:

1. **`utils/vendorSearchUtils.ts`** - Contains all category mappings and validation functions
2. **`getRelevantCategories(contactCategory)`** - Main function used by all components
3. **`validateVendorSearchMappings()`** - Validation function for consistency checks

## Current Category Mappings

| Contact Category (Dropdown) | Google Places API Type | Description |
|----------------------------|----------------------|-------------|
| `Jeweler` | `jewelry_store` | Jewelry stores and wedding rings |
| `Florist` | `florist` | Flower shops and floral arrangements |
| `Baker` | `bakery` | Bakeries and wedding cakes |
| `Venue` | `restaurant` | Reception venues and event spaces |
| `Hair Stylist` | `hair_care` | Hair salons and styling services |
| `Photographer` | `photographer` | Wedding photographers |
| `Videographer` | `videographer` | Wedding videographers |
| `Dress Shop` | `clothing_store` | Bridal salons and dress shops |
| `Beauty Salon` | `beauty_salon` | Beauty salons and makeup services |
| `Spa` | `spa` | Spas and wellness services |
| `DJ` | `dj` | DJs and music services |
| `Musician` | `band` | Live bands and musicians |
| `Wedding Planner` | `wedding_planner` | Wedding planners and coordinators |
| `Caterer` | `caterer` | Catering services |
| `Car Rental` | `car_rental` | Car rental and transportation |
| `Travel Agency` | `travel_agency` | Travel agencies and honeymoon planning |
| `Officiant` | `officiant` | Wedding officiants and ministers |
| `Suit/Tux Rental` | `suit_rental` | Formal wear rental |
| `Makeup Artist` | `makeup_artist` | Makeup artists and beauty services |
| `Stationery` | `stationery` | Wedding invitations and stationery |
| `Event Rental` | `rentals` | Event equipment and furniture rental |
| `Wedding Favor` | `favors` | Wedding favors and gifts |
| `Transportation` | `car_rental` | Transportation services |

## Components Using This System

The following components use the centralized `getRelevantCategories` function:

- **`components/AddContactModal.tsx`** - Adding new contacts with vendor linking
- **`components/EditContactModal.tsx`** - Editing existing contacts with vendor linking
- **`components/OnboardingModal.tsx`** - Onboarding flow with vendor linking
- **`components/VendorAssociationDrawer.tsx`** - Dedicated vendor association interface

## Maintenance Rules

### ⚠️ CRITICAL: When Adding/Modifying Categories

**You MUST update the following:**

1. **`VENDOR_SEARCH_CATEGORY_MAPPINGS`** in `utils/vendorSearchUtils.ts`
2. **`getAllContactCategories()`** function in the same file
3. **`validateVendorSearchMappings()`** function to include new categories
4. **Run validation**: `npm run validate-vendor-search`
5. **Update this documentation**

### Example: Adding a New Category

```typescript
// In utils/vendorSearchUtils.ts

// 1. Add to the mappings
export const VENDOR_SEARCH_CATEGORY_MAPPINGS: Record<string, string[]> = {
  // ... existing mappings ...
  'New Category': ['new_google_places_type'],
};

// 2. Add to getAllContactCategories
export const getAllContactCategories = (): string[] => {
  return [
    // ... existing categories ...
    'New Category',
  ];
};

// 3. Add to validation function
const allContactCategories = [
  // ... existing categories ...
  'New Category',
];
```

## Validation System

### Manual Validation

Run the validation script to check for issues:

```bash
npm run validate-vendor-search
```

This will check for:
- ✅ Missing mappings for contact categories
- ✅ Orphaned mappings (not in contact categories list)
- ✅ Invalid Google Places API types
- ✅ Consistency across all components

### Automated Validation

The pre-commit hook automatically validates mappings:

```bash
npm run pre-commit-vendor-search
```

This prevents commits if mappings are broken.

## Troubleshooting

### Common Issues

1. **"Missing mapping for contact category"**
   - Add the category to `VENDOR_SEARCH_CATEGORY_MAPPINGS`
   - Add the category to `getAllContactCategories()`

2. **"Orphaned mapping"**
   - Remove unused mappings from `VENDOR_SEARCH_CATEGORY_MAPPINGS`
   - Or add the category to `getAllContactCategories()`

3. **"Invalid Google Places type"**
   - Check that the Google Places API type is valid
   - Update the mapping to use a valid type

### Debugging

To debug vendor search issues:

1. Check the browser console for API calls
2. Verify the category is being passed correctly
3. Run the validation script to check mappings
4. Test with different categories to isolate the issue

## Best Practices

1. **Always use the centralized utility** - Never create local category mappings
2. **Test all categories** - Ensure each category returns relevant results
3. **Keep mappings simple** - One contact category should map to one Google Places type when possible
4. **Document changes** - Update this guide when modifying mappings
5. **Run validation** - Always run validation after changes

## Integration with Other Systems

This system works alongside:

- **Breadcrumb System** (`utils/vendorUtils.ts`) - For URL slug mapping
- **Category Display System** (`utils/categoryStyle.ts`) - For UI styling
- **Google Places API** (`app/api/google-places/route.ts`) - For vendor search

## Future Considerations

When expanding this system:

1. **Consider multiple Google Places types** for complex categories
2. **Add location-specific mappings** if needed
3. **Implement caching** for better performance
4. **Add analytics** to track search effectiveness

---

**Remember**: This system is critical for user experience. Always test thoroughly and maintain consistency across all components. 