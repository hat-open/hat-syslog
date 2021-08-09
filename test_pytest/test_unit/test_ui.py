import asyncio
import datetime

import pytest

from hat import aio
from hat import juggler
from hat import util
from hat.syslog.server import common
import hat.syslog.server.backend
import hat.syslog.server.ui


pytestmark = pytest.mark.asyncio


@pytest.fixture
def short_register_delay(monkeypatch):
    monkeypatch.setattr(hat.syslog.server.backend, "register_delay", 0.0)


@pytest.fixture
def small_max_results(monkeypatch):
    monkeypatch.setattr(hat.syslog.server.ui, "max_results_limit", 20)


@pytest.fixture
def ui_port():
    return util.get_unused_tcp_port()


@pytest.fixture
def ui_address(ui_port):
    return f"http://127.0.0.1:{ui_port}"


@pytest.fixture
def db_path(tmp_path):
    return tmp_path / 'syslog.db'


@pytest.fixture
async def backend(db_path):
    backend = await hat.syslog.server.backend.create_backend(
            path=db_path,
            low_size=1000,
            high_size=10000,
            enable_archive=False,
            disable_journal=False)
    try:
        yield backend
    finally:
        await backend.async_close()


@pytest.fixture
async def web_server(ui_address, backend):
    web_server = await hat.syslog.server.ui.create_web_server(
        ui_address, None, backend)
    try:
        yield web_server
    finally:
        await web_server.async_close()


@pytest.fixture
async def client(ui_port):
    client = await create_client(ui_port)
    try:
        yield client
    finally:
        await client.async_close()


@pytest.fixture
def create_msg():
    counter = 0
    severities = ['DEBUG', 'INFORMATIONAL', 'WARNING', 'ERROR', 'CRITICAL']

    def create_msg():
        nonlocal counter
        counter += 1
        ts = ts_now()
        return common.Msg(
            facility=common.Facility.USER,
            severity=common.Severity[
                severities[counter % len(severities)]],
            version=1,
            timestamp=ts,
            hostname=None,
            app_name=None,
            procid=None,
            msgid='test_syslog.web',
            data="",
            msg=f'message no {counter}')

    return create_msg


def ts_now():
    return datetime.datetime.now(tz=datetime.timezone.utc).timestamp()


def assert_client_vs_server_state(client):
    assert client.server_state['filter'] == client.state._replace(
        max_results=hat.syslog.server.ui.max_results_limit)


async def create_client(port):
    client = Client()
    client._conn = await juggler.connect(f'ws://127.0.0.1:{port}/ws',
                                         autoflush_delay=0)
    client._conn.set_local_data(common.Filter()._asdict())
    return client


class Client(aio.Resource):

    @property
    def async_group(self):
        return self._conn.async_group

    @property
    def state(self):
        return common.Filter(**self._conn.local_data)

    @property
    def server_state(self):
        if not self._conn.remote_data:
            return
        return {
            'filter': (common.Filter(
                **self._conn.remote_data['filter'])
                       if self._conn.remote_data['filter'] else None),
            'entries': [common.entry_from_json(e)
                        for e in self._conn.remote_data['entries']],
            'first_id': self._conn.remote_data['first_id'],
            'last_id': self._conn.remote_data['last_id']}

    def register_change_cb(self, cb):
        return self._conn.register_change_cb(cb)

    def set_filter(self, filter):
        self._conn.set_local_data(
            common.filter_to_json(filter))


async def test_backend_to_frontend(backend, web_server, client, create_msg):
    client_change_queue = aio.Queue()
    client.register_change_cb(lambda: client_change_queue.put_nowait(None))

    entry_queue = aio.Queue()
    backend.register_change_cb(entry_queue.put_nowait)

    await client_change_queue.get()
    assert_client_vs_server_state(client)

    entries = []
    for _ in range(10):
        msg = create_msg()
        await backend.register(ts_now(), msg)
        reg_entries = await entry_queue.get()
        entry = reg_entries[0]
        entries.insert(0, entry)
        await client_change_queue.get()
        assert entry in client.server_state['entries']
        assert util.first(client.server_state['entries'],
                          lambda i: i.msg == msg)
    assert entries == client.server_state['entries']
    assert client.server_state['first_id'] == 1
    assert client.server_state['last_id'] == len(entries)
    assert_client_vs_server_state(client)


@pytest.mark.skip("WIP")
async def test_backend_to_frontend_timeout(backend, web_server, client,
                                           create_msg):
    client_change_queue = aio.Queue()
    client.register_change_cb(lambda: client_change_queue.put_nowait(None))
    await client_change_queue.get()

    async with aio.Group() as group:
        for _ in range(50):
            group.spawn(backend.register, ts_now(), create_msg())
    await asyncio.wait_for(client_change_queue.get(), 0.1)
    assert len(client.server_state['entries']) == 50


async def test_frontend_to_backend(backend, web_server, client, create_msg):
    client_change_queue = aio.Queue()
    client.register_change_cb(lambda: client_change_queue.put_nowait(None))
    client.set_filter(common.Filter(msg='message no 1'))

    await client_change_queue.get()
    assert_client_vs_server_state(client)

    for _ in range(10):
        await backend.register(ts_now(), create_msg())
        await client_change_queue.get()

    assert len(client.server_state['entries']) == 2
    assert all('message no 1' in e.msg.msg
               for e in client.server_state['entries'])

    client.set_filter(common.Filter())
    await client_change_queue.get()
    assert len(client.server_state['entries']) == 10
    assert client_change_queue.empty()

    client.set_filter(common.Filter(msg='bla bla'))
    await client_change_queue.get()
    assert len(client.server_state['entries']) == 0
    assert client_change_queue.empty()

    client.set_filter(common.Filter(
        severity=common.Severity.ERROR))
    await client_change_queue.get()
    assert len(client.server_state['entries']) == 2
    assert all(e.msg.severity == common.Severity.ERROR
               for e in client.server_state['entries'])


async def test_max_size(backend, web_server, client, create_msg,
                        small_max_results):
    client_change_queue = aio.Queue()
    client.register_change_cb(lambda: client_change_queue.put_nowait(None))

    await client_change_queue.get()
    assert_client_vs_server_state(client)

    for _ in range(40):
        await backend.register(ts_now(), create_msg())
        await client_change_queue.get()

    assert len(client.server_state['entries']) == 20
    entry_ids_exp = list(reversed(range(21, 41)))
    assert [e.id for e in client.server_state['entries']] == entry_ids_exp

    client.set_filter(common.Filter(max_results=35))
    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(client_change_queue.get(), 0.1)
    assert_client_vs_server_state(client)
    assert len(client.server_state['entries']) == 20
    assert [e.id for e in client.server_state['entries']] == entry_ids_exp


@pytest.mark.skip("WIP")
@pytest.mark.parametrize("client_cont", [1])
async def test_connect_disconnect(backend, web_server, create_msg, ui_port,
                                  client_cont):
    message_count = 3
    async with aio.Group() as group:
        for _ in range(message_count):
            group.spawn(backend.register, ts_now(), create_msg())

    clients = set()
    for _ in range(client_cont):
        client = await create_client(ui_port)
        client_change_queue = aio.Queue()
        client.register_change_cb(lambda: client_change_queue.put_nowait(None))
        assert not client.is_closed
        await client_change_queue.get()
        await asyncio.sleep(0.1)
        assert len(client.server_state['entries']) == message_count
        clients.add(client)

    while clients:
        client = clients.pop()
        await client.async_close()
        assert client.is_closed
