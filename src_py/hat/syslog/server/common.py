"""Common data structures and functions"""

import typing

from hat import json
from hat.syslog.common import (Facility,
                               Msg,
                               Severity,
                               msg_from_json,
                               msg_to_json)
from hat.syslog.common import *  # NOQA


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


def filter_to_json(filter: Filter) -> json.Data:
    """Convert filter to json data"""
    return dict(filter._asdict(),
                facility=filter.facility.name if filter.facility else None,
                severity=filter.severity.name if filter.severity else None)


def filter_from_json(json_filter: json.Data) -> Filter:
    """Create filter from json data"""
    return Filter(**dict(
        json_filter,
        facility=(Facility[json_filter['facility']]
                  if json_filter['facility'] else None),
        severity=(Severity[json_filter['severity']]
                  if json_filter['severity'] else None)))


def entry_to_json(entry: Entry) -> json.Data:
    """Convert entry to json data"""
    return dict(entry._asdict(),
                msg=msg_to_json(entry.msg))


def entry_from_json(json_entry: json.Data) -> Entry:
    """Create entry from json data"""
    return Entry(**dict(
        json_entry,
        msg=msg_from_json(json_entry['msg'])))
