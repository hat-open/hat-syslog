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
    max_results: typing.Optional[int] = None
    last_id: typing.Optional[int] = None
    entry_timestamp_from: typing.Optional[float] = None
    entry_timestamp_to: typing.Optional[float] = None
    facility: typing.Optional[Facility] = None
    severity: typing.Optional[Severity] = None
    hostname: typing.Optional[str] = None
    app_name: typing.Optional[str] = None
    procid: typing.Optional[str] = None
    msgid: typing.Optional[str] = None
    msg: typing.Optional[str] = None
