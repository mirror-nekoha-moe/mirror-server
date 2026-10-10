FROM node:20-alpine

# Install curl for Podman REST API access
RUN apk add --no-cache curl ffmpeg

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Copy .env file to dist directory for runtime
RUN cp /app/src/.env /app/dist/.env 2>/dev/null || echo ".env will be loaded from env_file"

# Remove dev dependencies and TypeScript after build
RUN npm prune --production

# Expose the API port
EXPOSE 30727

# Set environment
ENV NODE_ENV=production

# Run the application
CMD ["npm", "start"]
