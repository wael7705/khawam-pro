FROM node:18-slim AS frontend-builder

# Build frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* frontend/pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile || npm install
COPY frontend/ .
RUN pnpm build || npm run build

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
