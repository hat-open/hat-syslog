ARG IMAGE_BASE_TAG=3.12-slim-bookworm

FROM "python:${IMAGE_BASE_TAG}" AS hat-syslog-base
WORKDIR /hat-syslog
RUN apt-get update

FROM hat-syslog-base AS hat-syslog-build
WORKDIR /hat-syslog
RUN apt-get install -y nodejs npm
COPY . .
RUN pip install --upgrade pip && \
    pip install --group dev && \
    doit clean_all && \
    doit

FROM hat-syslog-base AS hat-syslog-run
WORKDIR /hat-syslog
RUN --mount=type=tmpfs,target=/stages \
    --mount=type=bind,source=/hat-syslog/build,target=/stages/build,from=hat-syslog-build \
    pip install /stages/build/py/*.whl
EXPOSE 6514/tcp \
       6514/udp \
       23020/tcp
VOLUME /hat-syslog
CMD ["/usr/local/bin/hat-syslog-server", "--db-path", "/hat-syslog/syslog.db"]
