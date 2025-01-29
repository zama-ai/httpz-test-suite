# Use Node.js LTS version
FROM node:20

# Install system packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    vim \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Install npm dependencies
RUN npm install

# Keep container running
CMD ["tail", "-f", "/dev/null"]