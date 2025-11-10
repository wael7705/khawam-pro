FROM node:18-slim AS frontend-builder

# Build frontend
WORKDIR /frontend

# Copy package files first
COPY frontend/package.json ./

# Install pnpm (latest stable version)
RUN npm install -g pnpm@latest

# Copy frontend source files (needed for pnpm to resolve dependencies correctly)
COPY frontend/ .

# Install dependencies with pnpm (without frozen-lockfile if lockfile doesn't exist)
# Use --no-frozen-lockfile to allow pnpm to create/update lockfile
# Fallback to npm with --legacy-peer-deps to handle React 19 peer dependency issues
RUN if [ -f pnpm-lock.yaml ]; then \
        pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile; \
    else \
        pnpm install --no-frozen-lockfile || \
        (npm install --legacy-peer-deps && echo "⚠️ Used npm with --legacy-peer-deps"); \
    fi

# Build frontend
RUN pnpm build || npm run build

# Verify build output exists
RUN if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then \
        echo "❌ Frontend build failed - dist directory not found or empty"; \
        ls -la; \
        exit 1; \
    else \
        echo "✅ Frontend build completed successfully"; \
        ls -la dist/; \
    fi

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for PostgreSQL
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements.txt from backend directory (build context is project root)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend files to /app
COPY backend/ .

# Copy frontend dist files from frontend-builder stage
COPY --from=frontend-builder /frontend/dist /app/static

# Create uploads directory
RUN mkdir -p uploads/orders

ENV PORT=8000
EXPOSE 8000

# Use uvicorn directly for better Railway compatibility
# Railway will set PORT environment variable automatically
# Use exec form with shell to allow variable expansion
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
