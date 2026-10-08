FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node . .
RUN mkdir -p /app/runtime && chown node:node /app/runtime
USER node
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
