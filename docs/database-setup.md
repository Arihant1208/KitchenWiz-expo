# Database Setup Guide

This guide covers setting up the PostgreSQL database for KitchenWiz.

## Database Options

### Option 1: Neon PostgreSQL (Recommended)

**Neon** is a serverless PostgreSQL platform with a generous free tier, perfect for development and small production deployments.

#### Advantages:
- ✅ Serverless - no server management needed
- ✅ Free tier with 0.5 GB storage
- ✅ Built-in connection pooling
- ✅ Automatic backups
- ✅ Instant database branching
- ✅ Global deployment

#### Setup Steps:

1. **Sign up at [Neon](https://neon.tech)**
   - Create a free account
   - No credit card required for free tier

2. **Create a new project**
   - Choose a region closest to your users
   - Select PostgreSQL version (15+ recommended)

3. **Get your connection string**
   - Copy the connection string from the dashboard
   - Format: `postgresql://user:password@host/database?sslmode=require`

4. **Configure backend/.env**
   ```env
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   JWT_SECRET=<generate-with-crypto>
   ```

5. **Run the setup script**
   ```bash
   cd backend
   npm install
   node scripts/setup-db.js
   ```

6. **Start the server**
   ```bash
   npm run dev
   ```

### Option 2: Local PostgreSQL

**Local PostgreSQL** gives you full control and works without internet.

#### Prerequisites:
- PostgreSQL 12+ installed locally
- PostgreSQL service running

#### Setup Steps:

1. **Install PostgreSQL**
   
   **Windows:**
   - Download from [postgresql.org](https://www.postgresql.org/download/windows/)
   - Use the installer with default settings
   - Remember the password you set for the `postgres` user

   **macOS (Homebrew):**
   ```bash
   brew install postgresql@15
   brew services start postgresql@15
   ```

   **Linux (Ubuntu/Debian):**
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. **Create the database**

   **Using createdb:**
   ```bash
   createdb kitchenwiz
   ```

   **Using psql:**
   ```bash
   psql -U postgres
   CREATE DATABASE kitchenwiz;
   \q
   ```

3. **Configure backend/.env**
   ```env
   DB_HOST=localhost
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=kitchenwiz
   DB_PORT=5432
   JWT_SECRET=<generate-with-crypto>
   ```

4. **Run the setup script**
   ```bash
   cd backend
   npm install
   node scripts/setup-db.js
   ```

5. **Start the server**
   ```bash
   npm run dev
   ```

### Option 3: Cloud PostgreSQL (AWS RDS, Azure, etc.)

Any PostgreSQL-compatible cloud service works.

#### AWS RDS Setup:

1. Create a PostgreSQL instance in AWS RDS
2. Configure security groups to allow your IP
3. Note the endpoint, username, and password
4. Use DATABASE_URL format in `.env`

#### Azure Database for PostgreSQL:

1. Create Azure Database for PostgreSQL server
2. Configure firewall rules
3. Get connection string from Azure Portal
4. Use DATABASE_URL format in `.env`

## Database Schema Setup Script

The project includes a Node.js script that sets up the database schema automatically.

**Location:** `backend/scripts/setup-db.js`

**What it does:**
- Connects to your PostgreSQL database
- Reads `database/schema.sql`
- Creates all tables, indexes, and triggers
- Inserts sample data for development

**Usage:**
```bash
cd backend
node scripts/setup-db.js
```

**Output:**
```
Connecting to database...
Connected successfully!
Reading schema file...
Executing schema...
✅ Database setup complete!
All tables and indexes have been created.
```

## Environment Variables

### Backend .env Configuration

```env
# ===== Database Configuration =====

# Option 1: Connection String (Recommended for cloud databases)
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Option 2: Individual Parameters (For local PostgreSQL)
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=kitchenwiz
DB_PORT=5432

# ===== JWT Configuration =====
JWT_SECRET=your_random_secret_key_min_32_chars_long_change_this_in_production
JWT_ISSUER=kitchenwiz
JWT_AUDIENCE=kitchenwiz-mobile
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_SECONDS=2592000

# ===== OAuth Configuration (Optional) =====
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_TENANT_ID=common
```

### Generate JWT Secret

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

## Database Connection Logic

The backend automatically detects which connection method to use:

**File:** `backend/src/db.ts`

```typescript
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'kitchenwiz',
        password: process.env.DB_PASSWORD || 'postgres',
        port: parseInt(process.env.DB_PORT || '5432'),
      }
);
```

- If `DATABASE_URL` is set, it uses the connection string (with SSL)
- Otherwise, it uses individual parameters

## Database Tables

The schema creates the following tables:

1. **users** - User accounts and profiles
2. **user_passwords** - Hashed passwords for email/password auth
3. **user_identities** - OAuth identities (Google, Microsoft)
4. **refresh_tokens** - JWT refresh tokens (hashed)
5. **email_verification_tokens** - Email verification tokens
6. **inventory_items** - User's food inventory
7. **recipes** - Discovered and saved recipes
8. **meal_plans** - Weekly meal planning
9. **shopping_items** - Shopping list items

## Migrations

For existing databases, migration scripts are available:

**Location:** `database/migrations/`

**Available migrations:**
- `001_add_email_verification.sql` - Adds email verification support

**Running a migration:**
```bash
psql -U postgres -d kitchenwiz -f database/migrations/001_add_email_verification.sql
```

Or use the setup script (safe for existing databases):
```bash
node scripts/setup-db.js
```

## Testing Database Connection

### Using the health endpoint:

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Test the endpoint:
   ```bash
   curl http://localhost:3000/health
   ```

3. Expected response:
   ```json
   {"status":"ok","timestamp":"2026-01-07T...","version":"1.0.0"}
   ```

### Using psql:

```bash
# Test connection
psql -U postgres -d kitchenwiz -c "SELECT COUNT(*) FROM users;"

# List all tables
psql -U postgres -d kitchenwiz -c "\dt"

# Check schema version
psql -U postgres -d kitchenwiz -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

### Using the test script:

```bash
cd backend
node test-server.js
```

## Troubleshooting

### "Connection refused" or "ECONNREFUSED"

**Cause:** PostgreSQL is not running

**Solution:**
```bash
# Check if PostgreSQL is running
# macOS/Linux
pg_isready

# Windows - check service status in Services app
# Or use PowerShell:
Get-Service postgresql*

# Start PostgreSQL
# macOS
brew services start postgresql@15

# Linux
sudo systemctl start postgresql

# Windows - use Services app or:
Start-Service postgresql*
```

### "authentication failed for user"

**Cause:** Wrong username or password

**Solution:**
- Check credentials in `.env`
- For local PostgreSQL, try `postgres` as username
- Reset password if needed:
  ```bash
  psql -U postgres
  ALTER USER postgres PASSWORD 'newpassword';
  ```

### "database does not exist"

**Cause:** Database not created yet

**Solution:**
```bash
createdb kitchenwiz
# or
psql -U postgres -c "CREATE DATABASE kitchenwiz;"
```

### "relation does not exist"

**Cause:** Tables not created

**Solution:**
```bash
cd backend
node scripts/setup-db.js
```

### "SSL connection required"

**Cause:** Cloud database requires SSL

**Solution:**
- Ensure `DATABASE_URL` includes `?sslmode=require`
- Or add to connection string: `&sslmode=require`

### Neon-specific: "Too many connections"

**Cause:** Free tier has connection limits

**Solution:**
- Use connection pooling (already configured in `db.ts`)
- Close unused database connections
- Consider upgrading Neon plan

## Best Practices

### Development

- ✅ Use Neon for quick setup and collaboration
- ✅ Use local PostgreSQL if you need offline work
- ✅ Keep `.env` in `.gitignore` (never commit credentials)
- ✅ Use the setup script for consistent schema

### Production

- ✅ Use managed PostgreSQL (Neon, AWS RDS, Azure)
- ✅ Enable SSL/TLS connections
- ✅ Use strong, unique passwords
- ✅ Set up automatic backups
- ✅ Monitor connection pool usage
- ✅ Use environment variables for credentials
- ✅ Implement connection retry logic

### Security

- ✅ Never commit `.env` files
- ✅ Use strong database passwords
- ✅ Restrict database access by IP (firewall rules)
- ✅ Keep PostgreSQL updated
- ✅ Encrypt connections with SSL
- ✅ Use least-privilege database users

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Neon Documentation](https://neon.tech/docs/introduction)
- [AWS RDS PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [Azure Database for PostgreSQL](https://docs.microsoft.com/en-us/azure/postgresql/)
- [Node.js pg module](https://node-postgres.com/)

## Support

If you encounter issues:
1. Check server logs for error messages
2. Verify database credentials in `.env`
3. Ensure PostgreSQL is running
4. Test connection with psql
5. Review troubleshooting section above
