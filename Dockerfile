# Build stage for frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY app/package*.json ./
RUN npm install
COPY app/ ./
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Copy all server files at once
COPY server/ ./server/

# Install server dependencies
RUN cd server && npm install

# Copy built frontend
COPY --from=frontend-build /app/dist ./app/dist

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "server/server.js"]
