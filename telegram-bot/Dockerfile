FROM node:20-alpine

WORKDIR /app

# Copy dependency configs
COPY package*.json ./

# Install package dependencies
RUN npm install

# Copy application files
COPY . .

CMD ["npm", "start"]
