# Use Node.js LTS version
FROM node:20

# Install system packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    vim \
    jq \
    && npm install -g npm@11.0.0 hardhat \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy project files
COPY e2e/. .

# Keep container running
CMD ["tail", "-f", "/dev/null"]