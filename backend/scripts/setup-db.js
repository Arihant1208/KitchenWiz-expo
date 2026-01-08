const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  const connectionString = process.env.DATABASE_URL;
  const hasUrl = typeof connectionString === 'string' && connectionString.length > 0;

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;

  if (!hasUrl && !(host && user && password && database)) {
    console.error('❌ Missing database configuration. Set DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME.');
    process.exit(1);
  }

  const shouldUseSsl =
    (hasUrl && /sslmode=require/i.test(connectionString)) ||
    process.env.DB_SSL === 'true';

  const client = new Client(
    hasUrl
      ? {
          connectionString,
          ...(shouldUseSsl ? { ssl: { rejectUnauthorized: false } } : {}),
        }
      : {
          host,
          user,
          password,
          database,
          ...(port ? { port } : {}),
          ...(shouldUseSsl ? { ssl: { rejectUnauthorized: false } } : {}),
        }
  );

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    console.log('Reading schema file...');
    const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema...');
    await client.query(schema);
    
    console.log('✅ Database setup complete!');
    console.log('All tables and indexes have been created.');
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();
