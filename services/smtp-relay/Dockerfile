# Use Ubuntu 22.04 LTS as the base image
FROM ubuntu:22.04

ENV USER=openreview
ENV HOME=/home/$USER

RUN mkdir -p $HOME/app

# Install curl and gnupg for downloading and installing Node.js
RUN apt-get update && \
    apt-get install -y \
    curl \
    gnupg \
    postfix \
    iputils-ping \
    vim \
    iproute2 \
    && rm -rf /var/lib/apt/lists/*

RUN postconf -e 'inet_protocols = ipv4'
RUN postconf -e 'myhostname = celestecongrats.fun'
RUN postconf -e 'mydomain = celestecongrats.fun'
RUN postconf -e 'maillog_file = /var/log/postfix.log'
RUN postconf -e 'smtp_host_lookup = dns'
RUN touch /etc/mailname


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

# Expose port 8080 and 25
EXPOSE 8080
EXPOSE 25

RUN npm install -g pm2
RUN echo '{\
  "apps": [\
    {\
      "name": "node-app",\
      "script": "src/index.js"\
    },\
    {\
      "name": "postfix",\
      "script": "postfix start && tail -f /var/log/postfix.log"\
    }\
  ]\
}' > pm2.json

# Command to run the service
CMD ["pm2-runtime", "start", "pm2.json"]
