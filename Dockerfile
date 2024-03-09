FROM python:3.11-slim-bookworm as hat-syslog-base
WORKDIR /hat-syslog
RUN apt update -y

FROM hat-syslog-base as hat-syslog-build
WORKDIR /hat-syslog
RUN apt install -y nodejs npm
COPY . .
RUN pip install -r requirements.pip.txt && \
    doit clean_all && \
    doit

FROM hat-syslog-base as hat-syslog-run
WORKDIR /hat-syslog
COPY --from=hat-syslog-build /hat-syslog/build/py/*.whl .
RUN pip install *.whl && \
    rm *.whl
EXPOSE 6514/tcp \
       6514/udp \
       23020/tcp
VOLUME /hat-syslog
CMD ["/usr/local/bin/hat-syslog-server", "--db-path", "/hat-syslog/syslog.db"]
