// app/api/optimize-image/route.ts
// On-demand image optimization API endpoint

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imagePath = searchParams.get('src');
    const width = searchParams.get('w') ? parseInt(searchParams.get('w')!) : undefined;
    const height = searchParams.get('h') ? parseInt(searchParams.get('h')!) : undefined;
    const quality = searchParams.get('q') ? parseInt(searchParams.get('q')!) : 85;
    const format = searchParams.get('f') || 'webp';
    const blur = searchParams.get('blur') ? parseInt(searchParams.get('blur')!) : 0;

    if (!imagePath) {
      return NextResponse.json(
        { error: 'Image path is required' },
        { status: 400 }
      );
    }

    // Validate format
    const supportedFormats = ['webp', 'avif', 'jpeg', 'png'];
    if (!supportedFormats.includes(format)) {
      return NextResponse.json(
        { error: 'Unsupported format' },
        { status: 400 }
      );
    }

    // Construct full path to image
    const publicDir = path.join(process.cwd(), 'public');
    const fullImagePath = path.join(publicDir, imagePath);

    // Check if image exists
    if (!fs.existsSync(fullImagePath)) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Read and optimize image
    let image = sharp(fullImagePath);

    // Apply transformations
    if (width || height) {
      image = image.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    if (blur > 0) {
      image = image.blur(blur);
    }

    // Convert to requested format
    const buffer = await image
      .toFormat(format as any, { quality })
      .toBuffer();

    // Set appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', `image/${format}`);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year cache
    headers.set('Content-Length', buffer.length.toString());

    return new NextResponse(buffer, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Image optimization error:', error);
    
    return NextResponse.json(
      { 
        error: 'Image optimization failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 