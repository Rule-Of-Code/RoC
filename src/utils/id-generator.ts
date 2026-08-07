/**
 * Constitutional Law ID Generator
 * Generates unique, deterministic IDs for constitutional laws using cryptographic hashing
 */

import { createHash } from 'crypto';

/**
 * Generates a unique, deterministic ID for a constitutional law
 * Uses SHA-256 hash of title + description, truncated to 8 chars for readability
 *
 * @param title - The law title
 * @param description - The law description
 * @param category - Optional category prefix for better organization
 * @returns Unique law ID (e.g., "ngrx_a1b2c3d4" or "angular_f5e6d7c8")
 */
export function generateLawId(
  title: string,
  description: string,
  category?: string
): string {
  // Normalize input to ensure consistent hashing
  const normalizedTitle = title.trim().toLowerCase();
  const normalizedDescription = description.trim().toLowerCase();
  const input = `${normalizedTitle}|${normalizedDescription}`;

  // Generate SHA-256 hash
  const hash = createHash('sha256').update(input, 'utf8').digest('hex');

  // Take first 8 characters for readability while maintaining uniqueness
  const shortHash = hash.substring(0, 8);

  // Add category prefix if provided
  if (category) {
    const normalizedCategory = category.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${normalizedCategory}_${shortHash}`;
  }

  return shortHash;
}

/**
 * Validates that an ID follows the expected format
 * @param id - ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidLawId(id: string): boolean {
  // Valid formats: "a1b2c3d4" or "category_a1b2c3d4"
  const regex = /^([a-z0-9]+_)?[a-f0-9]{8}$/;
  return regex.test(id);
}

/**
 * Extracts category from a categorized ID
 * @param id - Law ID
 * @returns category name or null if no category
 */
export function extractCategory(id: string): string | null {
  const parts = id.split('_');
  return parts.length === 2 ? (parts[0] ?? null) : null;
}

/**
 * Batch generates IDs for multiple laws to check for collisions
 * In the extremely unlikely event of a collision, will append a counter
 * @param laws - Array of {title, description, category?} objects
 * @returns Array of unique IDs
 */
export function generateBatchIds(
  laws: Array<{
    title: string;
    description: string;
    category?: string;
  }>
): string[] {
  const ids: string[] = [];
  const seenIds = new Set<string>();

  for (const law of laws) {
    let id = generateLawId(law.title, law.description, law.category);
    let counter = 1;

    // Handle the extremely rare case of hash collision
    while (seenIds.has(id)) {
      const baseId = id.includes('_') ? id.split('_')[1] : id;
      const prefix = law.category
        ? `${law.category.toLowerCase().replace(/[^a-z0-9]/g, '')}_`
        : '';
      id = `${prefix}${baseId}_${counter}`;
      counter++;
    }

    ids.push(id);
    seenIds.add(id);
  }

  return ids;
}

/**
 * Migration helper - converts old numeric IDs to new hash-based system
 * @param laws - Laws with existing numeric IDs
 * @returns Laws with new hash-based IDs
 */
export function migrateLawIds<
  T extends { id: number | string; title: string; description: string },
>(
  laws: T[],
  categoryPrefix?: string
): Array<Omit<T, 'id'> & { id: string; legacyId: number | string }> {
  return laws.map(law => ({
    ...law,
    legacyId: law.id,
    id: generateLawId(law.title, law.description, categoryPrefix),
  }));
}
