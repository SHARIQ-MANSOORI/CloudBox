# Stage 1: Build & Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app

# Install package dependencies
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Create application directory and assign permissions to non-root node user
RUN chown -R node:node /app

# Copy production node_modules from dependencies stage
COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules
# Copy application source code
COPY --chown=node:node . .

# Run as non-root user
USER node

# Expose backend application port
EXPOSE 5000

# Start server (node-cron tasks run in-process)
CMD ["node", "server.js"]
