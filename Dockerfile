# Use official Node.js base image
FROM node:18

# Create app directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose port (match the port your app uses)
EXPOSE 5000

# Start the server
CMD ["node", "index.js"]
