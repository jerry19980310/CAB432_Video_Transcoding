FROM node:lts-alpine

# install ClamAV
RUN apk update && \
    apk add --no-cache clamav clamav-daemon bash && \
    rm -rf /var/cache/apk/*

# update ClamAV database
RUN freshclam

# create a directory for the app
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["entrypoint.sh"]

CMD ["node", "scanner.js"]