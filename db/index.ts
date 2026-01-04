import { drizzle } from 'drizzle-orm/node-postgres';
import 'dotenv/config';
import * as schema from './schema';

export const db = drizzle({
    connection: {
        connectionString: process.env.DATABASE_URL!,
        ssl: true,
    },
    schema,
});
