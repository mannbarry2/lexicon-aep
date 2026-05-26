# Builds and runs the AEP Lexicon Express app on Firebase App Hosting.
#
# The default buildpack-based deploy fails for the PDF export feature
# because @sparticuz/chromium bundles the Chromium binary but assumes
# the host has the standard shared libraries (libnss3, libnspr4, etc.).
# Firebase App Hosting's default base image does not include them, so
# Chromium fails to launch with:
#   "libnspr4.so: cannot open shared object file: No such file or directory"
#
# This Dockerfile uses a Debian-based Node image and apt-installs the
# missing libraries before the app starts.

FROM node:20-bookworm-slim

# Chromium runtime dependencies. Matches the list Puppeteer/Playwright
# recommend for Debian hosts. If a future Chromium version asks for more,
# add it here.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libxshmfence1 \
    fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first so the npm install layer caches across builds
# that only change application code.
COPY package.json package-lock.json ./
RUN npm ci

# Bring in the rest of the project and build the client + server bundles.
COPY . .
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "start"]
