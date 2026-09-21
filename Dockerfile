FROM node:22 AS base

# Set working directory
WORKDIR /home/node/app/

FROM base AS dev 
# Set npm cache
RUN --mount=type=cache,target=/home/node/.npm \
    npm set cache /home/node/.npm 

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies (this will be preserved in the named volume)
RUN npm install

# Copy the rest of the application
COPY . .

# Set environment variables
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV DOCKER=true

# Expose the port the app runs on
EXPOSE 5173

# Create entrypoint script to ensure node_modules exist and are properly installed
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'set -e' >> /entrypoint.sh && \
    echo 'echo "Checking dependencies..."' >> /entrypoint.sh && \
    echo 'if [ ! -d "node_modules" ] || [ ! "$(ls -A node_modules 2>/dev/null)" ] || [ ! -f "node_modules/.package-lock.json" ]; then' >> /entrypoint.sh && \
    echo '  echo "Installing dependencies..."' >> /entrypoint.sh && \
    echo '  npm install --legacy-peer-deps' >> /entrypoint.sh && \
    echo '  echo "Dependencies installed successfully"' >> /entrypoint.sh && \
    echo 'else' >> /entrypoint.sh && \
    echo '  echo "Dependencies already installed"' >> /entrypoint.sh && \
    echo 'fi' >> /entrypoint.sh && \
    echo 'echo "Starting Vite dev server..."' >> /entrypoint.sh && \
    echo 'exec "$@"' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
# Start the application in development mode 
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--force"]
