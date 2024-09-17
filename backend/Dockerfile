# Dockerfile for an Express.js application

FROM node:lts-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install

RUN apk update
RUN apk add ffmpeg

# Bundle app source
COPY . .

EXPOSE 3000

CMD [ "node", "index.js" ]


