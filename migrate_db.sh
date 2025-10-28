#!/bin/bash
# Railway Database Migration Script

echo "🚀 Starting Database Migration..."

# Get DATABASE_URL from Railway
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found!"
    exit 1
fi

echo "📊 Connecting to database..."

# Run the SQL file
psql "$DATABASE_URL" -f KHAWAM_DB.sql

if [ $? -eq 0 ]; then
    echo "✅ Database migration completed successfully!"
else
    echo "❌ Database migration failed!"
    exit 1
fi

echo "🎉 Setup complete!"
