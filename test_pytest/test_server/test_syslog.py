import asyncio
import contextlib
import inspect
import logging.config
import os
import socket
import threading
import time
import traceback
import subprocess

import pytest

from hat import aio
from hat import json
from hat import util
from hat.syslog.server import common
import hat.syslog.handler
import hat.syslog.server.syslog


@pytest.fixture
def syslog_port():
    return util.get_unused_tcp_port()


@pytest.fixture(params=['tcp', 'ssl', 'udp'])
def comm_type(request):
    return request.param


@pytest.fixture
def syslog_address(syslog_port, comm_type):
    return f"{comm_type}://127.0.0.1:{syslog_port}"


@pytest.fixture(scope="session")
def pem_path(tmp_path_factory):
    path = tmp_path_factory.mktemp('syslog') / 'pem'
    subprocess.run(['openssl', 'req', '-batch', '-x509', '-noenc',
                    '-newkey', 'rsa:2048',
                    '-days', '1',
                    '-keyout', str(path),
                    '-out', str(path)],
                   stderr=subprocess.DEVNULL,
                   check=True)
    return path


@pytest.fixture
def create_syslog_server(syslog_address, pem_path):

    async def create_syslog_server(msg_cb):
        return await hat.syslog.server.syslog.create_syslog_server(
            syslog_address, msg_cb, pem_path)

    return create_syslog_server


@pytest.fixture
async def message_queue(create_syslog_server):
    queue = aio.Queue()
    server = await create_syslog_server(queue.put_nowait)

    try:
        yield queue

    finally:
        await server.async_close()


@pytest.fixture
def logger(syslog_port, comm_type):
    handler = hat.syslog.handler.SysLogHandler(host='127.0.0.1',
                                               port=syslog_port,
                                               comm_type=comm_type.upper(),
                                               queue_size=10,
                                               reconnect_delay=0.001)
    handler.setLevel('DEBUG')
    logger = logging.getLogger('test_syslog.syslog')
    logger.propagate = False
    logger.setLevel('DEBUG')
    logger.addHandler(handler)

    try:
        yield logger

    finally:
        logger.removeHandler(handler)
        handler.close()
        time.sleep(0.01)


async def test_msg(message_queue, logger):
    logger.info('for your information')
    lineno = inspect.currentframe().f_lineno - 1
    msg = await message_queue.get()

    assert msg.facility == common.Facility.USER
    assert msg.severity == common.Severity.INFORMATIONAL
    assert msg.version == 1
    assert msg.hostname == socket.gethostname()

    # TODO pytest/__main__.py != pytest/__init__.py
    # assert msg.app_name == pytest.__file__

    assert int(msg.procid) == os.getpid()
    assert msg.msgid == logger.name
    assert msg.msg == 'for your information'

    msg_data = json.decode(msg.data)
    assert msg_data['hat@1']['name'] == logger.name
    assert int(msg_data['hat@1']['thread']) == threading.current_thread().ident
    assert msg_data['hat@1']['funcName'] == 'test_msg'
    assert int(msg_data['hat@1']['lineno']) == lineno
    assert not msg_data['hat@1']['exc_info']


async def test_dropped(logger, message_queue):
    for i in range(20):
        logger.info('%s', i)

    assert message_queue.empty()
    msg_drop = await message_queue.get()

    assert msg_drop.msg == 'dropped 10 log messages'
    assert msg_drop.severity == common.Severity.ERROR
    for i in range(10, 20):
        msg = await message_queue.get()
        assert int(msg.msg) == i
    assert message_queue.empty()

    logger.info('%s', i)
    msg = await message_queue.get()
    assert int(msg.msg) == i
    assert message_queue.empty()


async def test_exc_info(message_queue, logger):
    try:
        raise Exception('Exception!')
    except Exception as e:
        logger.error('an exception occured: %s', e, exc_info=e)
        exc_info_exp = traceback.format_exc()
    msg = await message_queue.get()
    msg_data = json.decode(msg.data)
    assert msg_data['hat@1']['exc_info'] == exc_info_exp
    assert msg.msg == 'an exception occured: Exception!'
