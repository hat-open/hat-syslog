import asyncio
import pytest
import datetime
import socket
import os
import itertools

from hat import aio
from hat import util
from hat.syslog.server import common
import hat.syslog.server.backend


@pytest.fixture
def short_register_delay(monkeypatch):
    monkeypatch.setattr(hat.syslog.server.backend, "register_delay", 0.0)


@pytest.fixture(params=["delay", "queue_treshold"])
def force_delay_or_queue_threshold(monkeypatch, request):
    if request.param == "delay":
        monkeypatch.setattr(hat.syslog.server.backend,
                            "register_queue_treshold", 100)
        monkeypatch.setattr(hat.syslog.server.backend, "register_delay", 0.01)
    elif request.param == "queue_treshold":
        monkeypatch.setattr(hat.syslog.server.backend,
                            "register_delay", 1)


@pytest.fixture
def db_path(tmp_path):
    for i in itertools.count(1):
        path = tmp_path / f'syslog{i}.db'
        if not path.exists():
            return path


@pytest.fixture
def timestamp():
    dt = datetime.datetime.now(tz=datetime.timezone.utc)
    return dt.timestamp()


@pytest.fixture
def create_backend(db_path, short_register_delay):

    async def create_backend(path=db_path,
                             low_size=50,
                             high_size=100,
                             enable_archive=False,
                             disable_journal=False):
        return await hat.syslog.server.backend.create_backend(
            path=path,
            low_size=low_size,
            high_size=high_size,
            enable_archive=enable_archive,
            disable_journal=disable_journal)

    return create_backend


@pytest.fixture
def create_msg(timestamp):
    counter = 0

    def create_msg(facility=common.Facility.USER,
                   severity=common.Severity.ERROR,
                   hostname=socket.gethostname(),
                   app_name=pytest.__file__,
                   procid=os.getpid()):
        nonlocal counter
        counter += 1
        return common.Msg(facility=facility,
                          severity=severity,
                          version=1,
                          timestamp=timestamp,
                          hostname=hostname,
                          app_name=app_name,
                          procid=str(procid),
                          msgid='msgid',
                          data='',
                          msg=str(counter))

    return create_msg


async def test_register(create_backend, create_msg, timestamp):
    entry_queue = aio.Queue()
    backend = await create_backend()
    backend.register_change_cb(entry_queue.put_nowait)

    assert backend.first_id is None
    assert backend.last_id is None

    for i in range(10):
        msg = create_msg()
        await backend.register(timestamp, msg)

        entries = await entry_queue.get()
        entry = entries[0]
        assert entry.id == i + 1
        assert entry.timestamp == timestamp
        assert entry.msg == msg
        assert backend.first_id == 1
        assert backend.last_id == entry.id

    await backend.async_close()


async def test_register_with_delay(create_backend, create_msg, timestamp,
                                   force_delay_or_queue_threshold):
    entry_queue = aio.Queue()
    backend = await create_backend()
    backend.register_change_cb(lambda e: entry_queue.put_nowait(e))

    size = 100
    for i in range(size):
        await backend.register(timestamp, create_msg())

    entries = []
    while len(entries) != size:
        entries += await entry_queue.get()
    assert entry_queue.empty()

    await backend.async_close()


async def test_query(create_backend, create_msg, timestamp):
    change_queue = aio.Queue()
    backend = await create_backend()
    backend.register_change_cb(change_queue.put_nowait)

    facilities = list(common.Facility)
    severities = list(common.Severity)
    hosts = [f'h{i}' for i in range(1, 6)]
    apps = [f'app{i}' for i in range(1, 6)]
    procids = [f'{i:04}' for i in range(1, 6)]
    msgs = []
    for _ in range(3):
        for facility, severity, host, app, procid in zip(
                facilities, severities, hosts, apps, procids):
            msg = create_msg(facility=facility,
                             severity=severity,
                             hostname=host,
                             app_name=app,
                             procid=procid)
            msgs.insert(0, msg)
            await backend.register(timestamp, msg)
            await change_queue.get()

    query_res = await backend.query(common.Filter())
    assert [e.msg for e in query_res] == msgs
    assert len(set(e.id for e in query_res)) == len(msgs)

    query_res = await backend.query(common.Filter(max_results=3))
    assert [e.msg for e in query_res] == msgs[:3]

    query_res = await backend.query(common.Filter(last_id=10))
    assert [e.id for e in query_res] == [i for i in reversed(range(1, 11))]
    assert [e.msg for e in query_res] == msgs[-10:]

    for facility, severity, hostname, app_name, procid in zip(
            facilities, severities, hosts, apps, procids):
        query_res = await backend.query(common.Filter(
            facility=facility,
            severity=severity,
            hostname=hostname,
            app_name=app_name,
            procid=procid))
        assert len(query_res) == 3
        assert all(e.msg.facility == facility for e in query_res)
        assert all(e.msg.severity == severity for e in query_res)
        assert all(e.msg.hostname == hostname for e in query_res)
        assert all(e.msg.app_name == app_name for e in query_res)
        assert all(e.msg.procid == procid for e in query_res)

    query_res = await backend.query(common.Filter(msgid='msgid'))
    assert len(query_res) == len(msgs)

    query_res = await backend.query(common.Filter(msg=''))
    assert len(query_res) == len(msgs)

    query_res = await backend.query(common.Filter(msg='xyz'))
    assert len(query_res) == 0

    await backend.async_close()


@pytest.mark.parametrize("time_filter, exp_ts_ind", [
    ({'from': 0},
     [0, 1, 2]),

    ({'from': 1},
     [1, 2]),

    ({'from': 2},
     [2]),

    ({'to': 0},
     [0]),

    ({'to': 1},
     [0, 1]),

    ({'to': 2},
     [0, 1, 2]),

    ({'from': 1, 'to': 1},
     [1]),

    ({'from': 0, 'to': 2},
     [0, 1, 2]),
])
async def test_query_on_timestamp(create_backend, create_msg, timestamp,
                                  time_filter, exp_ts_ind):
    change_queue = aio.Queue()
    backend = await create_backend()
    backend.register_change_cb(change_queue.put_nowait)

    msgs = []
    tss = [timestamp - 20, timestamp - 10, timestamp]
    for ts in tss:
        for _ in range(5):
            msg = create_msg()
            msgs.insert(0, msg)
            await backend.register(ts, msg)
            await change_queue.get()

    filter = common.Filter(
        **{'entry_timestamp_' + k: tss[v] for k, v in time_filter.items()})
    query_res = await backend.query(filter)
    assert len(query_res) == len(exp_ts_ind) * 5
    assert all(e.timestamp in [tss[i] for i in exp_ts_ind] for e in query_res)

    await backend.async_close()


@pytest.mark.skip("WIP - remove asyncio.sleep")
@pytest.mark.parametrize("enable_archive", [False, True])
async def test_archive(create_backend, create_msg, timestamp, db_path,
                       short_register_delay, enable_archive):
    low_size = 50
    high_size = 100

    change_queue = aio.Queue()
    backend = await create_backend(low_size=low_size,
                                   high_size=high_size,
                                   enable_archive=enable_archive)
    backend.register_change_cb(change_queue.put_nowait)

    entries = []
    for _ in range(high_size):
        await backend.register(timestamp, create_msg())
        entries = await change_queue.get() + entries

    # wait for posible background db cleanup
    await asyncio.sleep(0.1)

    assert backend.last_id == high_size
    assert backend.first_id == 1
    result = await backend.query(common.Filter())
    assert len(result) == high_size
    count = len(list(db_path.parent.glob(f'{db_path.name}.*')))
    assert count == 0

    await backend.register(timestamp, create_msg())
    entries = await change_queue.get() + entries

    # wait for expected background db cleanup
    await asyncio.sleep(0.1)

    assert backend.first_id == backend.last_id - low_size + 1
    assert backend.last_id == high_size + 1
    result = await backend.query(common.Filter())
    assert len(result) == low_size
    count = len(list(db_path.parent.glob(f'{db_path.name}.*')))
    assert count == (1 if enable_archive else 0)

    await backend.async_close()
    assert backend.is_closed

    if enable_archive:
        archive_path = util.first(db_path.parent.glob('*.*'),
                                  lambda i: i.name == f'{db_path.name}.1')
        backend = await create_backend(path=archive_path,
                                       high_size=high_size,
                                       low_size=low_size)
        assert not backend.is_closed

        entries_archived = await backend.query(common.Filter())
        assert len(entries_archived) == (high_size - low_size + 1)
        assert result + entries_archived == entries

        await backend.async_close()
        assert backend.is_closed


async def test_persistence(create_backend, create_msg, timestamp):
    backend = await create_backend()
    size = 100
    for _ in range(size):
        await backend.register(timestamp, create_msg())

    query_res = []
    while len(query_res) != size:
        query_res = await backend.query(common.Filter())

    await backend.async_close()

    backend = await create_backend()
    query_res_after = await backend.query(common.Filter())
    assert query_res_after == query_res

    await backend.async_close()


async def test_entry_id_unique(create_backend, create_msg, timestamp,
                               short_register_delay):
    entry_queue = aio.Queue()
    backend = await create_backend()
    backend.register_change_cb(entry_queue.put_nowait)

    size = 30
    blocks = 1
    entries = []
    for i in range(1, blocks + 1):
        for j in range(1, size + 1):
            await backend.register(timestamp, create_msg())
            entries += await entry_queue.get()

    assert sorted(e.id for e in entries) == list(range(1, blocks * size + 1))

    await backend.async_close()


@pytest.mark.skip("WIP")
@pytest.mark.parametrize("disable_journal", [False, True])
async def test_disable_journal(create_backend, create_msg, timestamp, db_path,
                               short_register_delay, disable_journal):
    backend = await create_backend(disable_journal=disable_journal)
    await backend.register(timestamp, create_msg())

    await asyncio.sleep(0.1)

    exists = db_path.with_suffix('.db-journal').exists()
    assert exists == (not disable_journal)

    await backend.async_close()


async def test_create_unique_archive(create_backend, create_msg, timestamp,
                                     db_path, short_register_delay):
    low_size = 1
    high_size = 2

    backend = await create_backend(low_size=low_size,
                                   high_size=high_size,
                                   enable_archive=True)

    assert db_path.exists()
    assert not db_path.with_suffix('.db.1').exists()

    for i in range(high_size + 1):
        await backend.register(timestamp, create_msg())

    await asyncio.sleep(0.1)

    assert db_path.exists()
    assert db_path.with_suffix('.db.1').exists()
    assert backend.last_id - backend.first_id + 1 == low_size

    for i in range(high_size + 1 - low_size):
        await backend.register(timestamp, create_msg())

    await asyncio.sleep(0.1)

    assert db_path.exists()
    assert db_path.with_suffix('.db.1').exists()
    assert db_path.with_suffix('.db.2').exists()
    assert backend.last_id - backend.first_id + 1 == low_size

    db_path.with_suffix('.db.1').unlink()
    for i in range(high_size + 1 - low_size):
        await backend.register(timestamp, create_msg())

    await asyncio.sleep(0.1)

    assert db_path.exists()
    assert not db_path.with_suffix('.db.1').exists()
    assert db_path.with_suffix('.db.2').exists()
    assert db_path.with_suffix('.db.3').exists()
    assert backend.last_id - backend.first_id + 1 == low_size

    await backend.async_close()
