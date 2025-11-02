FROM node:20-alpine

# Install curl for Podman REST API access
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src ./src

# Expose the API port
EXPOSE 30727

# Set environment
ENV NODE_ENV=production

# Run the application
CMD ["npm", "start"]
