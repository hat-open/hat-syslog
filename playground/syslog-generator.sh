#!/bin/sh

. $(dirname -- "$0")/env.sh

exec $PYTHON -m hat.syslog.generator \
    "$@"
