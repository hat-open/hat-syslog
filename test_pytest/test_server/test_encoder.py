import time

import pytest

from hat.syslog.server import common
from hat.syslog.server import encoder


filters = [
    common.Filter(
        max_results=10,
        last_id=None,
        entry_timestamp_from=None,
        entry_timestamp_to=round(time.time(), 3),
        facility=common.Facility.KERNEL,
        severity=common.Severity.CRITICAL,
        hostname='host',
        app_name='app1',
        procid='1234',
        msgid='msg.id',
        msg='this is message'),
    common.Filter(
        max_results=None,
        last_id=None,
        entry_timestamp_from=None,
        entry_timestamp_to=None,
        facility=common.Facility.KERNEL,
        severity=common.Severity.ERROR,
        hostname=None,
        app_name=None,
        procid=None,
        msgid=None,
        msg=None)]

entries = [
    common.Entry(
        id=1,
        timestamp=round(time.time(), 3),
        msg=common.Msg(
            facility=common.Facility.KERNEL,
            severity=common.Severity.EMERGENCY,
            version=1,
            timestamp=None,
            hostname=None,
            app_name=None,
            procid=None,
            msgid=None,
            data=None,
            msg=None)),
    common.Entry(
        id=123456,
        timestamp=round(time.time(), 3),
        msg=common.Msg(
            facility=common.Facility.KERNEL,
            severity=common.Severity.ERROR,
            version=1,
            timestamp=None,
            hostname=None,
            app_name=None,
            procid=None,
            msgid=None,
            data=None,
            msg=None))]


@pytest.mark.parametrize("filter", filters)
def test_filter_json_serialization(filter):
    filter_json = encoder.filter_to_json(filter)
    assert filter == encoder.filter_from_json(filter_json)


@pytest.mark.parametrize("entry", entries)
def test_entry_json_serialization(entry):
    entry_json = encoder.entry_to_json(entry)
    assert entry == encoder.entry_from_json(entry_json)
