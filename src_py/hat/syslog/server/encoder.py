"""Data structures encoder/decoder"""

from hat import json
from hat.syslog.server import common
from hat.syslog.encoder import (msg_from_json,
                                msg_to_json)
from hat.syslog.encoder import *  # NOQA


def filter_to_json(filter: common.Filter) -> json.Data:
    """Convert filter to json data"""
    return dict(filter._asdict(),
                facility=filter.facility.name if filter.facility else None,
                severity=filter.severity.name if filter.severity else None)


def filter_from_json(json_filter: json.Data) -> common.Filter:
    """Create filter from json data"""
    return common.Filter(**dict(
        json_filter,
        facility=(common.Facility[json_filter['facility']]
                  if json_filter['facility'] else None),
        severity=(common.Severity[json_filter['severity']]
                  if json_filter['severity'] else None)))


def entry_to_json(entry: common.Entry) -> json.Data:
    """Convert entry to json data"""
    return dict(entry._asdict(),
                msg=msg_to_json(entry.msg))


def entry_from_json(json_entry: json.Data) -> common.Entry:
    """Create entry from json data"""
    return common.Entry(**dict(
        json_entry,
        msg=msg_from_json(json_entry['msg'])))
