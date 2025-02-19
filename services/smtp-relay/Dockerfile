# Use Ubuntu 22.04 LTS as the base image
FROM ubuntu:22.04

ENV USER=openreview
ENV HOME=/home/$USER

RUN mkdir -p $HOME/app

# Install Node.js v20
RUN curl -L https://raw.githubusercontent.com/tj/n/master/bin/n -o n && \
    bash n 20.11.0 && \
    hash -r && \
    npm install -g n && \
    rm -rf n

# Set working directory
WORKDIR $HOME/app

# Copy the application code
COPY . .

# Install dependencies
RUN npm install

# Expose port 8080 and 2525
EXPOSE 8080
EXPOSE 2525

# Command to run the service
CMD ["node", "src/index.js"]
