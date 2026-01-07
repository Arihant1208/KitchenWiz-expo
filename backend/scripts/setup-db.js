const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  const client = new Client({
    connectionString: 'postgresql://arihant.opensource:dxQqjBV7Jf4v@ep-white-haze-a1a9o5op.ap-southeast-1.aws.neon.tech/KitchenWiz?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

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
