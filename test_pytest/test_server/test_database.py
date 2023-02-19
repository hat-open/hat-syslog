import datetime
import os
import socket

import pytest

from hat.syslog.server import common
import hat.syslog.server.database


@pytest.fixture
def db_path(tmp_path):
    return tmp_path / 'syslog.db'


@pytest.fixture
def timestamp():
    dt = datetime.datetime.now(tz=datetime.timezone.utc)
    return dt.timestamp()


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
                          msgid='test_syslog.backend',
                          data="",
                          msg=f'message no {counter}')

    return create_msg


async def test_create(db_path):
    assert not db_path.exists()
    db = await hat.syslog.server.database.create_database(db_path, False)
    assert db_path.exists()
    await db.async_close()
    assert db_path.exists()


async def test_add_msgs(db_path, timestamp, create_msg):
    db = await hat.syslog.server.database.create_database(db_path, False)

    first_id = await db.get_first_id()
    last_id = await db.get_last_id()
    assert first_id is None
    assert last_id is None

    msgs = []
    entries = await db.add_msgs(msgs)
    assert entries == []

    msgs = [create_msg() for i in range(10)]
    entries = await db.add_msgs([(timestamp, msg) for msg in msgs])

    assert len(entries) == len(msgs)
    assert [entry.msg for entry in entries] == msgs

    first_id = await db.get_first_id()
    last_id = await db.get_last_id()
    assert first_id == entries[0].id
    assert last_id == entries[-1].id

    await db.async_close()

    db = await hat.syslog.server.database.create_database(db_path, False)

    first_id = await db.get_first_id()
    last_id = await db.get_last_id()
    assert first_id == entries[0].id
    assert last_id == entries[-1].id

    await db.async_close()


async def test_delete(db_path, timestamp, create_msg):
    db = await hat.syslog.server.database.create_database(db_path, False)

    msgs = [create_msg() for i in range(10)]
    entries = await db.add_msgs([(timestamp, msg) for msg in msgs])

    await db.delete(entries[0].id)

    first_id = await db.get_first_id()
    last_id = await db.get_last_id()
    assert first_id == entries[0].id
    assert last_id == entries[-1].id

    await db.delete(entries[-1].id)

    first_id = await db.get_first_id()
    last_id = await db.get_last_id()
    assert first_id == entries[-1].id
    assert last_id == entries[-1].id

    msgs = [create_msg() for i in range(10)]
    new_entries = await db.add_msgs([(timestamp, msg) for msg in msgs])
    entries = [entries[-1], *new_entries]

    first_id = await db.get_first_id()
    last_id = await db.get_last_id()
    assert first_id == entries[0].id
    assert last_id == entries[-1].id

    await db.delete(entries[-1].id + 1)

    first_id = await db.get_first_id()
    last_id = await db.get_last_id()
    assert first_id is None
    assert last_id is None

    msgs = [create_msg() for i in range(10)]
    entries = await db.add_msgs([(timestamp, msg) for msg in msgs])

    first_id = await db.get_first_id()
    last_id = await db.get_last_id()
    assert first_id == entries[0].id
    assert last_id == entries[-1].id

    await db.async_close()
