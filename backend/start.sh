#!/bin/bash
# Startup script for Railway deployment

echo "🚀 Starting Khawam Application..."
echo "📊 PORT: ${PORT:-8000}"
echo "📊 DATABASE_URL: ${DATABASE_URL:+configured}"

# Wait for database to be ready (optional, but helpful)
# Don't fail if database is not ready - app will retry on first query
if [ -n "$DATABASE_URL" ]; then
    echo "⏳ Checking database connection..."
    # Try to connect to database (timeout after 5 seconds, don't fail)
    timeout 5 bash -c 'python -c "from database import engine; engine.connect(); print(\"✅ Database connection OK\")" 2>&1' || echo "⚠️ Database not ready yet, app will retry on first query..."
    
    # Run database migrations automatically
    echo "🔄 Running database migrations..."
    if [ -f "/app/migration_analytics_and_orders.py" ]; then
        python /app/migration_analytics_and_orders.py || echo "⚠️ Migration failed - continuing anyway (non-critical)"
    else
        echo "⚠️ Migration script not found - skipping (non-critical)"
    fi
else
    echo "⚠️ DATABASE_URL not set - app may not work correctly"
fi

# Start the application
# Use exec to replace shell process with uvicorn
echo "✅ Starting uvicorn server on port ${PORT:-8000}..."

# Ensure we're in the right directory
cd /app || exit 1

# Check if main.py exists
if [ ! -f "main.py" ]; then
    echo "❌ Error: main.py not found in /app"
    ls -la /app
    exit 1
fi

# Start uvicorn with proper error handling
exec uvicorn main:app \
    --host 0.0.0.0 \
    --port ${PORT:-8000} \
    --workers 1 \
    --log-level info \
    --timeout-keep-alive 30 \
    --timeout-graceful-shutdown 30 \
    --access-log

