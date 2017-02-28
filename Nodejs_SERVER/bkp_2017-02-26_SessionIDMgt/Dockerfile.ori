FROM node:latest

# Create application directory
RUN mkdir -p /usr/src/venyaserver
WORKDIR /usr/src/venyaserver

# Install app dependencies
COPY package.json /usr/src/venyaserver
RUN npm install

# Bundle app source code
COPY . /usr/src/venyaserver

# Application port
EXPOSE 8888

# Command to be run
CMD [ "npm", "start" ]
