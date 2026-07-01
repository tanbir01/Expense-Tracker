FROM node:20-slim

# Install OpenSSL for Prisma engine compatibility
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency configs
COPY package*.json ./

# Install package dependencies
RUN npm install

# Copy application files
COPY . .

# Generate Prisma Client library
RUN DATABASE_URL="postgresql://dummy@dummy:5432/dummy" DIRECT_URL="postgresql://dummy@dummy:5432/dummy" npx prisma generate

EXPOSE 5000

CMD ["npm", "start"]
