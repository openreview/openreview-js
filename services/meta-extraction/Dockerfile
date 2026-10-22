FROM node:24-trixie-slim@sha256:43b9ba1142b8dcf33fa8f922ca1be85714adc444e0586c7cf7726daaeabc1bea

ENV USER=openreview
ENV HOME=/home/$USER

# Shared libraries Chrome needs to run headless under Puppeteer, plus tidy for HTML cleanup
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2t64 \
    libatk-bridge2.0-0t64 \
    libatk1.0-0t64 \
    libatspi2.0-0t64 \
    libcairo2 \
    libcups2t64 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libglib2.0-0t64 \
    libgtk-3-0t64 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxkbcommon0 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    tidy \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -ms /bin/bash $USER && \
    install -d -o $USER -g $USER $HOME/app

WORKDIR $HOME/app

COPY --chown=$USER:$USER . .

USER $USER

# Puppeteer's postinstall downloads the Chrome build matching the locked version into $HOME/.cache
RUN npm ci --omit=dev

EXPOSE 8080

CMD ["node", "src/index.js"]
