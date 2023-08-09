FROM python:3.11-slim-bullseye as hat-syslog-base
WORKDIR /hat-syslog
RUN apt update -qy

FROM hat-syslog-base as hat-syslog-build
WORKDIR /hat-syslog
RUN apt install -qy nodejs yarnpkg && \
    ln -sT /usr/bin/yarnpkg /usr/bin/yarn
COPY . .
RUN pip install -qq -r requirements.pip.txt && \
    doit clean_all && \
    doit

FROM hat-syslog-base as hat-syslog-run
WORKDIR /hat-syslog
COPY --from=hat-syslog-build /hat-syslog/build/py/dist/*.whl .
RUN pip install -qq *.whl && \
    rm *.whl
EXPOSE 6514/tcp \
       6514/udp \
       23020/tcp
VOLUME /hat-syslog
CMD ["/usr/local/bin/hat-syslog-server", "--db-path", "/hat-syslog/syslog.db"]
