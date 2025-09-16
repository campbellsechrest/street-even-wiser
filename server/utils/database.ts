import { randomUUID } from 'crypto';

/**
 * Database utility functions for portability across different database systems
 */

/**
 * Generate a UUID for database records using Node's built-in crypto.randomUUID()
 * This replaces PostgreSQL-specific gen_random_uuid() with application-generated UUIDs
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Safe insert with optional returning support
 * Handles databases that may not support .returning() by providing fallback behavior
 */
export async function safeInsert<T>(
  insertQueryBuilder: any,
  insertData: any,
  options: { ensureId?: boolean } = {}
): Promise<T> {
  // First, try .returning() approach for databases that support it
  try {
    const result = await insertQueryBuilder.values(insertData).returning();
    return result[0] as T;
  } catch (error) {
    console.warn('Database .returning() not supported, using fallback approach');
    
    // For databases without .returning() support, generate ID beforehand if needed
    const recordToInsert = { ...insertData };
    
    // Only add ID if requested and not already present
    if (options.ensureId && !recordToInsert.id) {
      recordToInsert.id = generateId();
    }
    
    // Execute the insert
    await insertQueryBuilder.values(recordToInsert).execute();
    
    // Return the record we just inserted
    return recordToInsert as T;
  }
}