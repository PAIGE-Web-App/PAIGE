/**
 * Safe Edge Config Service
 * Provides fallback to existing systems if Edge Config fails
 */

import { createClient } from '@vercel/edge-config';

// Initialize Edge Config with fallback
let edgeConfig: ReturnType<typeof createClient> | null = null;

try {
  if (process.env.EDGE_CONFIG) {
    edgeConfig = createClient(process.env.EDGE_CONFIG);
  }
} catch (error) {
  console.warn('Edge Config initialization failed, using fallbacks:', error);
}

/**
 * Safe get function with fallback
 */
export async function getEdgeConfig<T = any>(key: string, fallback: T): Promise<T> {
  try {
    if (!edgeConfig) {
      return fallback;
    }

    const value = await edgeConfig.get(key);
    return value !== undefined ? (value as T) : fallback;
  } catch (error) {
    console.warn(`Edge Config get failed for key: ${key}, using fallback:`, error);
    return fallback;
  }
}

/**
 * Safe put function with fallback
 * Note: Edge Config is read-only in production, this is for development only
 */
export async function putEdgeConfig<T = any>(key: string, value: T): Promise<boolean> {
  try {
    if (!edgeConfig) {
      console.log(`Edge Config not available, skipping put for key: ${key}`);
      return false;
    }

    // Edge Config is read-only in production
    // This would need to be done through Vercel dashboard or API
    console.log(`Edge Config put not supported in client, key: ${key}, value:`, value);
    return false;
  } catch (error) {
    console.warn(`Edge Config put failed for key: ${key}:`, error);
    return false;
  }
}

/**
 * Check if Edge Config is available
 */
export function isEdgeConfigAvailable(): boolean {
  return edgeConfig !== null && process.env.EDGE_CONFIG !== undefined;
}

/**
 * Get multiple keys at once with fallbacks
 */
export async function getMultipleEdgeConfig<T = any>(
  keys: Record<string, T>
): Promise<Record<string, T>> {
  const results: Record<string, T> = {};
  
  for (const [key, fallback] of Object.entries(keys)) {
    results[key] = await getEdgeConfig(key, fallback);
  }
  
  return results;
}
