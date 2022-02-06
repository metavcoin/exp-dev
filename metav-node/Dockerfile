FROM mono

RUN curl -sL https://deb.nodesource.com/setup_12.x | bash -
RUN apt-get update && apt-get install -y nodejs liblmdb0 libgomp1
RUN /usr/bin/npm i -g npm

RUN /usr/bin/npm config set @metavcoin:registry https://www.myget.org/F/metavcoin/npm/
RUN /usr/bin/npm install @metavcoin/metavcoin-node@latest -g

EXPOSE 5050
CMD ["metavcoin-node", "--api *:5050"]