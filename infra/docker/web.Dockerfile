# Use pre-built .next AND host's pre-installed node_modules
# Avoids docker build running npm install (which fails due to network/pnpm lock)
FROM docker.m.daocloud.io/library/node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Copy pre-built Next.js output
COPY apps/web/.next ./.next
COPY apps/web/package.json ./
COPY apps/web/next.config.mjs ./

# Copy node_modules (buildkit supports COPY for directories, but may lose empty dirs)
# Use RUN with cp from build context to ensure all files are copied
RUN cp -r /build-context/node_modules /app/node_modules 2>/dev/null || true

EXPOSE 3000

# Run next directly from copied node_modules
CMD ["./node_modules/.bin/next", "start", "-p", "3000"]