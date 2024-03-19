# Use Ubuntu 22.04 LTS as the base image
FROM ubuntu:22.04

ENV USER=openreview
ENV HOME=/home/$USER

# Install curl and gnupg for downloading and installing Node.js
# Install necessary dependencies for Puppeteer and CUPS
RUN apt-get update && \
    apt-get install -y \
    curl \
    gnupg \
    libdrm2 \
    libgbm1 \
    libatspi2.0-0 \
    libatk-bridge2.0-0 \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libappindicator1 \
    libnss3 \
    lsb-release \
    tidy \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js v20
RUN curl -L https://raw.githubusercontent.com/tj/n/master/bin/n -o n && \
    bash n 20.11.0 && \
    hash -r && \
    npm install -g n && \
    rm -rf n

RUN mkdir -p $HOME/app

# Set working directory
WORKDIR $HOME/app

# Copy the application code
COPY . .

# Create a non-root user and set permissions
RUN useradd -ms /bin/bash $USER && \
    chown -R $USER:$USER $HOME
    # chmod -R 777 $HOME

# Change to non-root user
USER $USER

# Install dependencies
# RUN npm install
RUN npx puppeteer browsers install chrome && \
    npm install

# Expose port 8080
EXPOSE 8080

# Command to run the service
CMD ["node", "src/index.js"]
