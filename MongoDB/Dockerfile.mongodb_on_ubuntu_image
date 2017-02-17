FROM ubuntu:14.04
#FROM ubuntu:latest

RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927
RUN apt-get update && apt-get install -y apt-transport-https ca-certificates
RUN echo "deb http://repo.mongo.org/apt/ubuntu $(cat /etc/lsb-release | grep DISTRIB_CODENAME | cut -d= -f2)/mongodb-org/3.2 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-3.2.list
RUN apt-get update && apt-get install -y mongodb-org

#RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10 && \
#RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927 && \
 # echo "deb http://repo.mongo.org/apt/ubuntu $(cat /etc/lsb-release | grep DISTRIB_CODENAME | cut -d= -f2)/mongodb-org/3.2 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-3.2.list \
  #apt-get update && \
  #apt-get install -y mongodb-org && \
  #rm -rf /var/lib/apt/lists/*

#RUN mkdir -p /venya/mongo/data/db /venya/mongo/log && chown -R mongodb:mongodb /venya/mongo
#COPY ./data/db /venya/mongo/
#COPY ./mongod.cfg /venya/mongo/
#WORKDIR /venya/mongo/data

RUN mkdir -p /data/db
#COPY ./data/db /data
WORKDIR /data

EXPOSE 27017

CMD ["mongod","--storageEngine","wiredTiger","--smallfiles"]
#CMD ["/usr/bin/mongod","-f","./mongod.cfg"]
