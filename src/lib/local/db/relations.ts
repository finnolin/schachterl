import * as schema from './schema';

// Drizzle 0.x receives the complete schema object through the `schema` config
// property. There are currently no relational-query definitions for the local
// database, so this is intentionally just the table schema.
export const relations = schema;
