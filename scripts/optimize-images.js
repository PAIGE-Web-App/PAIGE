// scripts/optimize-images.js
// Image optimization script to convert images to WebP and create responsive sizes

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Configuration
const PUBLIC_DIR = path.join(__dirname, '../public');
const OPTIMIZED_DIR = path.join(PUBLIC_DIR, 'optimized');
const QUALITY = 85;
const FORMATS = ['webp', 'avif'];

// Responsive image sizes
const SIZES = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

// Ensure optimized directory exists
if (!fs.existsSync(OPTIMIZED_DIR)) {
  fs.mkdirSync(OPTIMIZED_DIR, { recursive: true });
}

// Get all image files from public directory
function getImageFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && item !== 'optimized') {
      files.push(...getImageFiles(fullPath));
    } else if (stat.isFile() && isImageFile(item)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Check if file is an image
function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff'].includes(ext);
}

// Optimize a single image
async function optimizeImage(inputPath) {
  try {
    const filename = path.basename(inputPath, path.extname(inputPath));
    const relativePath = path.relative(PUBLIC_DIR, inputPath);
    const outputDir = path.dirname(path.join(OPTIMIZED_DIR, relativePath));
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    console.log(`Optimizing: ${relativePath}`);
    
    // Create optimized versions for each format
    for (const format of FORMATS) {
      const outputPath = path.join(outputDir, `${filename}.${format}`);
      
      await image
        .resize(metadata.width, metadata.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFormat(format, { quality: QUALITY })
        .toFile(outputPath);
      
      console.log(`  Created: ${path.relative(PUBLIC_DIR, outputPath)}`);
    }
    
    // Create responsive sizes
    for (const [sizeName, width] of Object.entries(SIZES)) {
      for (const format of FORMATS) {
        const outputPath = path.join(outputDir, `${filename}-${sizeName}.${format}`);
        
        await image
          .resize(width, null, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .toFormat(format, { quality: QUALITY })
          .toFile(outputPath);
        
        console.log(`  Created: ${path.relative(PUBLIC_DIR, outputPath)}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error optimizing ${inputPath}:`, error.message);
    return false;
  }
}

// Generate image manifest
function generateImageManifest(optimizedFiles) {
  const manifest = {
    images: {},
    generated: new Date().toISOString()
  };
  
  for (const file of optimizedFiles) {
    const relativePath = path.relative(OPTIMIZED_DIR, file);
    const filename = path.basename(file, path.extname(file));
    const ext = path.extname(file).substring(1);
    
    if (!manifest.images[filename]) {
      manifest.images[filename] = {};
    }
    
    if (relativePath.includes('-')) {
      // Responsive size
      const parts = filename.split('-');
      const baseName = parts[0];
      const size = parts[1];
      
      if (!manifest.images[baseName]) {
        manifest.images[baseName] = {};
      }
      
      if (!manifest.images[baseName].responsive) {
        manifest.images[baseName].responsive = {};
      }
      
      if (!manifest.images[baseName].responsive[size]) {
        manifest.images[baseName].responsive[size] = {};
      }
      
      manifest.images[baseName].responsive[size][ext] = `/optimized/${relativePath}`;
    } else {
      // Original size
      manifest.images[filename][ext] = `/optimized/${relativePath}`;
    }
  }
  
  return manifest;
}

// Main optimization function
async function optimizeImages() {
  console.log('🚀 Starting image optimization...\n');
  
  const imageFiles = getImageFiles(PUBLIC_DIR);
  console.log(`Found ${imageFiles.length} images to optimize\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const imageFile of imageFiles) {
    const success = await optimizeImage(imageFile);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
  }
  
  console.log(`\n✅ Optimization complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  // Generate manifest
  const optimizedFiles = getImageFiles(OPTIMIZED_DIR);
  const manifest = generateImageManifest(optimizedFiles);
  
  const manifestPath = path.join(OPTIMIZED_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`   Manifest: ${path.relative(PUBLIC_DIR, manifestPath)}`);
  console.log(`   Total optimized files: ${optimizedFiles.length}`);
}

// Run optimization
if (require.main === module) {
  optimizeImages().catch(console.error);
}

module.exports = { optimizeImages, generateImageManifest }; 