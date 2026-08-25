# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Runtime stage
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Create nginx user directory
RUN mkdir -p /var/www && \
    chown -R nginx:nginx /var/www

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Create a non-root user for better security
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

USER nginx

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/index.html || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
