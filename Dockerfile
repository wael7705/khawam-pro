FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js and pnpm
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g pnpm

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy and build Frontend
COPY frontend/package.json frontend/pnpm-lock.yaml ./frontend/
WORKDIR /app/frontend
RUN pnpm install --frozen-lockfile
COPY frontend/ .
RUN pnpm run build

# Copy backend code
WORKDIR /app
COPY backend/ .

# Copy built frontend to static directory
RUN mkdir -p static && \
    cp -r frontend/dist/* static/ || true

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "main.py"]

