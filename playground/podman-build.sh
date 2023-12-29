#!/bin/sh

RUN_PATH=$(dirname "$(realpath "$0")")
ROOT_PATH=$RUN_PATH/..
. $RUN_PATH/env.sh

cd $ROOT_PATH
exec podman build -t bozokopic/hat-syslog:$VERSION .
