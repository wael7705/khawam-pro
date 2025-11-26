# Multi-stage build for Railway
FROM node:20-slim AS frontend-builder

# Build frontend
WORKDIR /frontend

# Copy package files first for better caching
COPY frontend/package.json frontend/pnpm-lock.yaml* ./

# Copy frontend source files
COPY frontend/ .

# Install dependencies using npm with --legacy-peer-deps
# This handles React 19 peer dependency conflicts reliably
RUN echo "📦 Installing dependencies..." && \
    npm install --legacy-peer-deps && \
    echo "✅ Dependencies installed successfully"

# Build frontend
RUN echo "🔨 Building frontend..." && \
    npm run build && \
    echo "✅ Frontend build completed"

# Verify build output exists
RUN if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then \
        echo "❌ Frontend build failed - dist directory not found or empty"; \
        ls -la; \
        exit 1; \
    else \
        echo "✅ Frontend build verified"; \
        ls -la dist/ | head -10; \
    fi

# Python backend stage
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for PostgreSQL, build tools, and curl for health check
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements.txt first for better caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy all backend files to /app
COPY backend/ .

# Copy frontend dist files from frontend-builder stage
COPY --from=frontend-builder /frontend/dist /app/static

# Create uploads directory with proper permissions
RUN mkdir -p uploads/orders && \
    chmod -R 755 uploads

# Copy and make startup script executable
COPY backend/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Set environment variables
ENV PORT=8000
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

# Health check for Railway
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

# Use startup script for better error handling
# Railway sets PORT automatically, fallback to 8000
# Use shell form to ensure environment variables are expanded
CMD ["/bin/bash", "/app/start.sh"]
