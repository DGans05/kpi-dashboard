import { Pool, PoolClient, QueryResult } from 'pg';
import { logger, config } from './logger';

let pool: Pool;

/**
 * Initialize the database connection pool
 */
export function initializePool(): Pool {
  const databaseUrl = config.database.url;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  pool = new Pool({
    connectionString: databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err: Error) => {
    logger.error('Unexpected error on idle client', { err });
  });

  return pool;
}

/**
 * Get the connection pool instance
 */
export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializePool() first.');
  }
  return pool;
}

/**
 * Execute a SQL query with optional parameters
 * @param text - SQL query string
 * @param values - Query parameters
 * @returns Query result
 */
export async function query(
  text: string,
  values?: unknown[]
): Promise<QueryResult> {
  const start = Date.now();

  try {
    const result = await getPool().query(text, values);
    const duration = Date.now() - start;

    logger.debug('Query executed', {
      query: text,
      duration,
      rows: result.rowCount,
    });

    return result;
  } catch (error) {
    logger.error('Query error', {
      query: text,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get a client from the pool for transaction management
 * @returns A client instance for manual transaction control
 */
export async function getClient(): Promise<PoolClient> {
  try {
    const client = await getPool().connect();
    return client;
  } catch (error) {
    logger.error('Failed to get client from pool', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Execute a transaction with automatic rollback on error
 * @param callback - Async function that executes within the transaction
 * @returns The result from the callback function
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction failed and rolled back', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test the database connection
 * @returns True if connection is successful
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW()');
    logger.info('Database connection successful', {
      timestamp: result.rows[0].now,
    });
    return true;
  } catch (error) {
    logger.error('Database connection test failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Close the database connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
      logger.info('Database connection pool closed');
    } catch (error) {
      logger.error('Error closing database pool', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
