FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Pass build arguments to Vite
ARG RAZORPAY_KEY_ID
ENV RAZORPAY_KEY_ID=$RAZORPAY_KEY_ID

# Expose Vite preview port
EXPOSE 4173

# Build and preview
RUN npm run build
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
