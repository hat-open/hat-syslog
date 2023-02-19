import time

import pytest

from hat import json

from hat.syslog import common
from hat.syslog import encoder


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
        timestamp=round(time.time(), 3),
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
