FROM python:3.11-slim

WORKDIR /app

# Install system dependencies and Node.js
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm

# Copy and install Backend dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Copy Frontend files
COPY frontend/ ./frontend/

# Build Frontend
WORKDIR /app/frontend
RUN pnpm install && pnpm run build

# Copy built files to static directory
RUN cp -r dist/* ../static/ || mkdir -p ../static && cp -r dist/* ../static/ || true

# Go back to app directory
WORKDIR /app

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "main.py"]

