FROM node:18.17.1

WORKDIR /server

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm","start"]
