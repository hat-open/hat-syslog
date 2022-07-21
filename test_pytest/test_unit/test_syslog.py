import asyncio
import contextlib
import datetime
import inspect
import logging.config
import os
import socket
import threading
import time
import traceback

import pytest

from hat import aio
from hat import json
from hat import util
from hat.syslog.server import common
import hat.syslog.handler
import hat.syslog.server.syslog

import pem


@pytest.fixture
def syslog_port():
    return util.get_unused_tcp_port()


@pytest.fixture(params=['tcp', 'ssl'])
def comm_type(request):
    return request.param


@pytest.fixture
def syslog_address(syslog_port, comm_type):
    return f"{comm_type}://127.0.0.1:{syslog_port}"


@pytest.fixture(scope="session")
def pem_path(tmp_path_factory):
    path = tmp_path_factory.mktemp('syslog') / 'pem'
    pem.create_pem_file(path)
    return path


@pytest.fixture
def create_syslog_server(syslog_address, pem_path):

    async def create_syslog_server(backend):
        return await hat.syslog.server.syslog.create_syslog_server(
            syslog_address, pem_path, backend)

    return create_syslog_server


@pytest.fixture
async def message_queue(create_syslog_server):
    backend = create_backend('test_syslog.syslog')
    server = await create_syslog_server(backend)
    try:
        yield backend._msg_queue
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
    yield logger
    logger.removeHandler(handler)
    handler.close()
    time.sleep(0.01)


def create_backend(msgid):
    backend = MockBackend()
    backend._msgid = msgid
    backend._first_id = 0
    backend._last_id = 0
    backend._async_group = aio.Group()
    backend._change_cbs = util.CallbackRegistry()
    backend._msg_queue = aio.Queue()
    return backend


class MockBackend:

    @property
    def first_id(self):
        return self._first_id

    @property
    def last_id(self):
        return self._last_id

    def register_change_cb(self, cb):
        return self._change_cbs.register(cb)

    @property
    def closed(self):
        return self._async_group.closed

    async def async_close(self):
        await self._async_group.async_close()

    async def register(self, timestamp, msg):
        if (not msg.msgid.startswith('test_syslog') and
                msg.msgid != 'hat.syslog.handler'):
            return
        await self._msg_queue.put((timestamp, msg))

    async def query(self, filter):
        pass


async def test_msg(message_queue, logger):
    ts_before = datetime.datetime.now(tz=datetime.timezone.utc).timestamp()
    logger.info('for your information')
    lineno = inspect.currentframe().f_lineno - 1
    ts, msg = await message_queue.get()
    ts_after = datetime.datetime.now(tz=datetime.timezone.utc).timestamp()

    assert ts_before < ts < ts_after
    assert msg.facility == common.Facility.USER
    assert msg.severity == common.Severity.INFORMATIONAL
    assert msg.version == 1
    assert ts_before < msg.timestamp < ts
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


async def test_dropped(logger, create_syslog_server):
    for i in range(20):
        logger.info('%s', i)
    backend = create_backend(logger.name)
    server = await create_syslog_server(backend)

    message_queue = backend._msg_queue
    assert message_queue.empty()
    _, msg_drop = await message_queue.get()

    assert msg_drop.msg == 'dropped 10 log messages'
    assert msg_drop.severity == common.Severity.ERROR
    for i in range(10, 20):
        _, msg = await message_queue.get()
        assert int(msg.msg) == i
    assert message_queue.empty()

    logger.info('%s', i)
    _, msg = await message_queue.get()
    assert int(msg.msg) == i
    assert message_queue.empty()

    await server.async_close()


@pytest.mark.skip(reason='WIP')
@pytest.mark.parametrize("root_level, levels_exp", [
    ('CRITICAL', ['CRITICAL']),
    ('ERROR', ['CRITICAL', 'ERROR']),
    ('WARNING', ['CRITICAL', 'ERROR', 'WARNING']),
    ('INFO', ['CRITICAL', 'ERROR', 'WARNING', 'INFORMATIONAL']),
    ('DEBUG', ['CRITICAL', 'ERROR', 'WARNING', 'INFORMATIONAL', 'DEBUG']),
    ])
@pytest.mark.asyncio
async def test_level(message_queue, logger, root_level, levels_exp):
    logger.setLevel(root_level)
    levels_res = []
    all_levels = [logging.CRITICAL, logging.ERROR, logging.WARNING,
                  logging.INFO, logging.DEBUG]
    for level in all_levels:
        logger.log(level, 'message on level %s', level)
    with contextlib.suppress(asyncio.TimeoutError):
        for _ in all_levels:
            _, msg = await asyncio.wait_for(message_queue.get(), 0.)
            levels_res.append(msg.severity.name)
    assert levels_res == levels_exp


async def test_exc_info(message_queue, logger):
    try:
        raise Exception('Exception!')
    except Exception as e:
        logger.error('an exception occured: %s', e, exc_info=e)
        exc_info_exp = traceback.format_exc()
    ts, msg = await message_queue.get()
    msg_data = json.decode(msg.data)
    assert msg_data['hat@1']['exc_info'] == exc_info_exp
    assert msg.msg == 'an exception occured: Exception!'
