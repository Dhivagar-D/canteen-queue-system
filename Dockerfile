FROM node:22-slim AS production
WORKDIR /app

ENV PORT=5000

# Install server dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev
ENV NODE_ENV=production

# Copy server code
COPY server/ ./

# Copy the production frontend bundle. Run `npm --prefix client run build`
# before building this image.
COPY client/dist /app/client/dist

# Expose HTTP port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:5000/health').then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1))"

# Start production server
CMD ["node", "src/server.js"]
