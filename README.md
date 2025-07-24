# PAIGE App

## Category Mapping System

The PAIGE app uses a critical category mapping system to ensure consistent formatting of vendor categories across the entire application. This system is **essential for breadcrumb consistency** and must be maintained carefully.

### Quick Validation

To validate category mappings are consistent:

```bash
npm run validate-categories
```

### Adding New Categories

When adding new vendor categories, you MUST update ALL THREE functions in `utils/vendorUtils.ts`:

1. `getCategorySlug()` - converts display category to URL slug
2. `getCategoryFromSlug()` - converts URL slug back to display category  
3. `getCategoryLabel()` - converts display category to plural form

### Documentation

For detailed information about the category system, see:
- [Category System Guide](./CATEGORY_SYSTEM_GUIDE.md)
- [Validation Scripts](./scripts/validate-categories.js)

### Pre-commit Validation

To automatically validate category mappings before commits:

```bash
npm run pre-commit-validation
```

## Vendor Search Category Mapping System

The vendor search category mapping system ensures consistent and accurate vendor search functionality when adding contacts. This system is **critical for ensuring users can find relevant vendors**.

### Quick Validation

To validate vendor search mappings are consistent:

```bash
npm run validate-vendor-search
```

### Documentation

For detailed information about the vendor search system, see:
- [Vendor Search System Guide](./VENDOR_SEARCH_SYSTEM_GUIDE.md)
- [Validation Scripts](./scripts/validate-vendor-search.js)

### Pre-commit Validation

To automatically validate vendor search mappings before commits:

```bash
npm run pre-commit-vendor-search
```

## Development

```bash
npm run dev
```

## Building

```bash
npm run build
npm start
``` 