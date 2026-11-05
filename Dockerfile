FROM node:22-alpine
WORKDIR /app
COPY . .
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data TRUST_PROXY=1
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
USER node
CMD ["node", "server.js"]
