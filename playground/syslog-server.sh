#!/bin/sh

PLAYGROUND_PATH=$(dirname "$(realpath "$0")")
. $PLAYGROUND_PATH/env.sh

exec $PYTHON -m hat.syslog.server \
    --db-path $DATA_PATH/syslog.db \
    "$@"
