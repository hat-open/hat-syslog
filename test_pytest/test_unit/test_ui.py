import asyncio
import itertools
import datetime

import pytest

from hat import aio
from hat import juggler
from hat import util

from hat.syslog.server import common
from hat.syslog.server import encoder
import hat.syslog.server.backend
import hat.syslog.server.ui


default_filter_json = encoder.filter_to_json(
    hat.syslog.server.ui.default_filter)


@pytest.fixture
def port():
    return util.get_unused_tcp_port()


@pytest.fixture
def db_path(tmp_path):
    return tmp_path / 'syslog.db'


@pytest.fixture
async def backend(monkeypatch, db_path):
    monkeypatch.setattr(hat.syslog.server.backend, "register_delay", 0)
    monkeypatch.setattr(hat.syslog.server.backend, "register_queue_treshold",
                        1)
    monkeypatch.setattr(hat.syslog.server.backend, "register_queue_size", 1)

    backend = await hat.syslog.server.backend.create_backend(
        path=db_path,
        low_size=1000,
        high_size=0,
        enable_archive=False,
        disable_journal=False)

    try:
        yield backend

    finally:
        await backend.async_close()


@pytest.fixture
async def create_server(monkeypatch, port, backend):
    monkeypatch.setattr(hat.syslog.server.ui, "autoflush_delay", 0)

    async def create_server():
        return await hat.syslog.server.ui.create_web_server(
            f'http://127.0.0.1:{port}', backend)

    return create_server


@pytest.fixture
async def create_client(port):

    async def create_client():
        return await juggler.connect(f'ws://127.0.0.1:{port}/ws')

    return create_client


@pytest.fixture
def create_msg():
    next_counters = itertools.count(1)
    severities = ['DEBUG', 'INFORMATIONAL', 'WARNING', 'ERROR', 'CRITICAL']

    def create_msg():
        counter = next(next_counters)
        return common.Msg(
            facility=common.Facility.USER,
            severity=common.Severity[severities[counter % len(severities)]],
            version=1,
            timestamp=now(),
            hostname=None,
            app_name=None,
            procid=None,
            msgid='test_syslog.web',
            data="",
            msg=f'message no {counter}')

    return create_msg


@pytest.fixture
async def register_entry(backend):

    async def register_entry(msg):
        await backend.register(now(), msg)

    return register_entry


def now():
    return datetime.datetime.now(tz=datetime.timezone.utc).timestamp()


async def test_create_server(create_server):
    server = await create_server()
    assert server.is_open

    await server.async_close()
    assert server.is_closed


@pytest.mark.parametrize("client_count", [1, 2, 5])
async def test_create_client(create_server, create_client, client_count):
    server = await create_server()

    clients = []
    for _ in range(client_count):
        client = await create_client()
        clients.append(client)

    for client in clients:
        assert client.is_open
        await client.async_close()

    await server.async_close()


async def test_initial_state(create_server, create_client):
    server = await create_server()
    client = await create_client()

    change_queue = aio.Queue()
    client.state.register_change_cb(change_queue.put_nowait)

    while not client.state.data:
        await change_queue.get()

    assert client.state.data == {'filter': default_filter_json,
                                 'entries': [],
                                 'first_id': None,
                                 'last_id': None}

    await client.async_close()
    await server.async_close()


async def test_register_entry(create_server, create_client, create_msg,
                              register_entry):
    server = await create_server()
    client = await create_client()

    change_queue = aio.Queue()
    client.state.register_change_cb(change_queue.put_nowait)

    while not client.state.data:
        await change_queue.get()

    assert client.state.data == {'filter': default_filter_json,
                                 'entries': [],
                                 'first_id': None,
                                 'last_id': None}

    for i in range(10):
        msg = create_msg()
        msg_json = encoder.msg_to_json(msg)
        await register_entry(msg)

        state = await change_queue.get()

        assert state['filter'] == default_filter_json
        assert len(state['entries']) == i + 1
        assert state['entries'][0]['msg'] == msg_json
        assert state['first_id'] == state['entries'][-1]['id']
        assert state['last_id'] == state['entries'][0]['id']

    await client.async_close()
    await server.async_close()


@pytest.mark.parametrize("entries_count", [1, 5, 100, 1000])
async def test_preregistered_entries(create_server, create_client, create_msg,
                                     register_entry, entries_count):
    server = await create_server()

    for i in range(entries_count):
        msg = create_msg()
        await register_entry(msg)

    await asyncio.sleep(0.01)

    client = await create_client()

    change_queue = aio.Queue()
    client.state.register_change_cb(change_queue.put_nowait)

    while not client.state.data:
        await change_queue.get()

    state = client.state.data
    count = min(entries_count, hat.syslog.server.ui.max_results_limit)

    assert state['filter'] == default_filter_json
    assert len(state['entries']) == count
    assert state['first_id'] <= state['entries'][-1]['id']
    assert state['last_id'] == state['entries'][0]['id']

    await client.async_close()
    await server.async_close()


async def test_change_filter(create_server, create_client):
    server = await create_server()
    client = await create_client()

    change_queue = aio.Queue()
    client.state.register_change_cb(change_queue.put_nowait)

    while not client.state.data:
        await change_queue.get()

    assert client.state.data == {'filter': default_filter_json,
                                 'entries': [],
                                 'first_id': None,
                                 'last_id': None}

    new_filter = common.Filter(
        max_results=hat.syslog.server.ui.max_results_limit * 2,
        hostname='hostname abc',
        msg='msg abc')
    new_filter_json = encoder.filter_to_json(new_filter)

    await client.send('filter', new_filter_json)

    state = await change_queue.get()

    assert state == {
        'filter': dict(new_filter_json,
                       max_results=hat.syslog.server.ui.max_results_limit),
        'entries': [],
        'first_id': None,
        'last_id': None}

    await client.async_close()
    await server.async_close()


# TODO test filter
