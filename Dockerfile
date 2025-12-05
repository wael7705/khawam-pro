FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js and pnpm 8
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g pnpm@8

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy workspace files for pnpm
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy and build Frontend
COPY frontend/ ./frontend/
WORKDIR /app/frontend

# Configure npm registry and retry mechanism
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Install dependencies with retry mechanism
RUN echo "جاري تثبيت التبعيات..." && \
    pnpm install --network-timeout=300000 || \
    (echo "فشلت المحاولة الأولى، جاري المحاولة مرة أخرى..." && sleep 10 && pnpm install --network-timeout=300000) || \
    (echo "فشلت المحاولة الثانية، جاري المحاولة مرة أخرى..." && sleep 20 && pnpm install --network-timeout=300000) || \
    (echo "فشلت المحاولة الثالثة، جاري المحاولة مرة أخرى..." && sleep 30 && pnpm install --network-timeout=300000) && \
    echo "تم تثبيت التبعيات بنجاح"

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

