import asyncio
import logging

import pytest

from hat import json
from hat import juggler
import hat.syslog.handler

from test_sys.process import Process


pytestmark = pytest.mark.asyncio


async def create_ui(port):
    ui = await juggler.connect(f'ws://127.0.0.1:{port}/ws')
    ui.set_local_data({'max_results': None,
                       'last_id': None,
                       'entry_timestamp_from': None,
                       'entry_timestamp_to': None,
                       'facility': None,
                       'severity': None,
                       'hostname': None,
                       'app_name': None,
                       'procid': None,
                       'msgid': None,
                       'msg': None})
    return ui


@pytest.fixture
def syslog_port(unused_tcp_port_factory):
    return unused_tcp_port_factory()


@pytest.fixture
def ui_port(unused_tcp_port_factory):
    return unused_tcp_port_factory()


@pytest.fixture
def db_path(tmp_path):
    return tmp_path / 'syslog.db'


@pytest.fixture
def conf(tmp_path, syslog_port, ui_port, db_path):
    return {'type': 'syslog',
            'log': {'version': 1},
            'syslog_addr': f'tcp://127.0.0.1:{syslog_port}',
            'ui_addr': f'http://127.0.0.1:{ui_port}',
            'db_path': str(db_path),
            'db_low_size': 10,
            'db_high_size': 100,
            'db_enable_archive': True,
            'db_disable_journal': False}


@pytest.fixture
def conf_path(tmp_path, conf):
    path = tmp_path / 'syslog.yaml'
    json.encode_file(conf, path)
    return path


@pytest.fixture
def server(tmp_path, conf_path, ui_port):
    with Process(['python', '-m', 'hat.syslog.server',
                  '--conf', str(conf_path)]) as srv:
        srv.wait_connection(ui_port, 1)
        yield srv


@pytest.fixture
def logger(syslog_port, server):
    handler = hat.syslog.handler.SysLogHandler(host='127.0.0.1',
                                               port=syslog_port,
                                               comm_type='TCP',
                                               queue_size=10)
    handler.setLevel('DEBUG')
    logger = logging.getLogger(__name__)
    logger.setLevel('DEBUG')
    logger.addHandler(handler)
    yield logger
    logger.removeHandler(handler)
    handler.close()


async def test_connect_ui(ui_port, server):
    ui = await create_ui(ui_port)
    assert not ui.is_closed
    await ui.async_close()


async def test_simple_log(ui_port, server, logger):
    ui = await create_ui(ui_port)
    await asyncio.sleep(1)

    ui.remote_data['entries'] == []

    logger.debug('xyz')
    await asyncio.sleep(1)

    assert len(ui.remote_data['entries']) == 1
    assert ui.remote_data['entries'][0]['msg']['msg'] == 'xyz'

    await ui.async_close()


async def test_archive(conf, db_path, server, logger):
    assert db_path.exists()
    assert len(list(db_path.parent.glob(f'{db_path.name}.*'))) == 0

    for i in range(conf['db_high_size']):
        logger.debug(f'msg{i}')
        await asyncio.sleep(0.01)

    await asyncio.sleep(1)
    assert len(list(db_path.parent.glob(f'{db_path.name}.*'))) == 0

    logger.debug('last message')
    await asyncio.sleep(1)
    assert len(list(db_path.parent.glob(f'{db_path.name}.*'))) == 1
