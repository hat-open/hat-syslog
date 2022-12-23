import datetime

import pytest

from hat import json

from hat.syslog.server import common
from hat.syslog.server import encoder


valid_msgs = [
    common.Msg(
        facility=common.Facility.KERNEL,
        severity=common.Severity.EMERGENCY,
        version=1,
        timestamp=None,
        hostname=None,
        app_name=None,
        procid=None,
        msgid=None,
        data=None,
        msg=None),
    common.Msg(
        facility=common.Facility.USER,
        severity=common.Severity.DEBUG,
        version=1,
        timestamp=datetime.datetime.now(tz=datetime.timezone.utc).timestamp(),
        hostname='abc1',
        app_name='abc2',
        procid='abc3',
        msgid='abc4',
        data=json.encode({'xyz@1': {'a': 'b',
                                    'd': 'e',
                                    'f': '"]\\\\',
                                    'g': ''},
                          'abc@1': {}}),
        msg='abcabcabcabc')]

invalid_msgs = [
    common.Msg(
        facility=None,
        severity=None,
        version=None,
        timestamp=None,
        hostname=None,
        app_name=None,
        procid=None,
        msgid=None,
        data=None,
        msg=None)]

filters = [
    common.Filter(
        max_results=10,
        last_id=None,
        entry_timestamp_from=None,
        entry_timestamp_to=datetime.datetime.utcnow().timestamp(),
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
        timestamp=datetime.datetime.utcnow().timestamp(),
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
        timestamp=datetime.datetime.utcnow().timestamp(),
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


@pytest.mark.parametrize("msg", valid_msgs)
def test_valid_msg_str_serialization(msg):
    msg_str = encoder.msg_to_str(msg)
    assert msg == encoder.msg_from_str(msg_str)


@pytest.mark.parametrize("msg", valid_msgs)
def test_valid_msg_json_serialization(msg):
    msg_json = encoder.msg_to_json(msg)
    assert msg == encoder.msg_from_json(msg_json)


@pytest.mark.parametrize("msg", invalid_msgs)
def test_invalid_msg_str_serialization(msg):
    with pytest.raises(Exception):
        msg_str = encoder.msg_to_str(msg)
        assert msg == encoder.msg_from_str(msg_str)


@pytest.mark.parametrize("msg", invalid_msgs)
def test_invalid_msg_json_serialization(msg):
    with pytest.raises(Exception):
        msg_json = encoder.msg_to_json(msg)
        assert msg == encoder.msg_from_json(msg_json)


@pytest.mark.parametrize("filter", filters)
def test_filter_json_serialization(filter):
    filter_json = encoder.filter_to_json(filter)
    assert filter == encoder.filter_from_json(filter_json)


@pytest.mark.parametrize("entry", entries)
def test_entry_json_serialization(entry):
    entry_json = encoder.entry_to_json(entry)
    assert entry == encoder.entry_from_json(entry_json)
