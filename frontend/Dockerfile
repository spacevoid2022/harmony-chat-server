FROM node:20-alpine

WORKDIR /app

# Copy package files first for faster caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . .

# Expose the Vite dev port
EXPOSE 5173

# Start Vite with --host 0.0.0.0 so it can be seen from outside the container
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173"]
