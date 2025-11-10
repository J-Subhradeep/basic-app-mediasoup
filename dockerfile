# Use Node.js base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application
COPY . .

# Expose HTTPS port
EXPOSE 443

# Start the app
CMD ["npm", "start"]
