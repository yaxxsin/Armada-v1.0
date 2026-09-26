# Frontend image (Vite dev server)
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 5174

# host:true so the dev server is reachable from outside the container.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
