#!/bin/sh

. $(dirname -- "$0")/env.sh

exec $PYTHON -m hat.syslog.server \
    --db-path $DATA_PATH/syslog.db \
    "$@"
