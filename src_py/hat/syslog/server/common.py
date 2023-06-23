"""Common data structures"""

from hat.syslog.common import *  # NOQA

import typing

from hat.syslog.common import (Facility,
                               Msg,
                               Severity)


class Entry(typing.NamedTuple):
    id: int
    timestamp: float
    msg: Msg


class Filter(typing.NamedTuple):
    max_results: int | None = None
    last_id: int | None = None
    entry_timestamp_from: float | None = None
    entry_timestamp_to: float | None = None
    facility: Facility | None = None
    severity: Severity | None = None
    hostname: str | None = None
    app_name: str | None = None
    procid: str | None = None
    msgid: str | None = None
    msg: str | None = None
