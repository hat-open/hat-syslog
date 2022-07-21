"""Common data structures"""

import importlib.resources
import typing

from hat import json
from hat.syslog.common import (Facility,
                               Msg,
                               Severity)
from hat.syslog.common import *  # NOQA


with importlib.resources.path(__package__, 'json_schema_repo.json') as _path:
    json_schema_repo: json.SchemaRepository = json.SchemaRepository(
        json.json_schema_repo,
        json.SchemaRepository.from_json(_path))
    """JSON schema repository"""


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
