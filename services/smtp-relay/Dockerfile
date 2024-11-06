# Use Ubuntu 22.04 LTS as the base image
FROM ubuntu:22.04

ENV USER=openreview
ENV HOME=/home/$USER

# Install curl and gnupg for downloading and installing Node.js
RUN apt-get update && \
    apt-get install -y \
    curl \
    gnupg \
    postfix \
    && rm -rf /var/lib/apt/lists/*

RUN postconf -e 'inet_protocols = ipv4'
RUN postconf -e 'myhostname = celestecongrats.fun'
RUN postconf -e 'maillog_file = /var/log/postfix.log'
RUN service postfix start
EXPOSE 25

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
RUN npm install

# Expose port 8080
EXPOSE 8080

# Command to run the service
CMD ["node", "src/index.js"]
