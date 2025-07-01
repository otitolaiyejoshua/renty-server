# Use Node.js official image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy all remaining app files
COPY . .

# Set environment variables if needed (Render sets PORT automatically)
ENV PORT=5000

# Expose the port your app runs on
EXPOSE 5000

# Start your server (use index.js)
CMD ["node", "index.js"]
