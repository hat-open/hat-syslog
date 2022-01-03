"""Backend implementation"""

from pathlib import Path
import asyncio
import contextlib
import itertools
import logging
import typing

from hat import aio
from hat import util
from hat.syslog.server import common
from hat.syslog.server import database


mlog: logging.Logger = logging.getLogger(__name__)
"""Module logger"""

register_delay: float = 0.1
"""Registration delay in seconds"""

register_queue_size: int = 50
"""Registration queue size"""

register_queue_treshold: int = 10
"""Registration queue threshold"""


async def create_backend(path: Path,
                         low_size: int,
                         high_size: int,
                         enable_archive: bool,
                         disable_journal: bool
                         ) -> 'Backend':
    """Create backend"""
    db = await database.create_database(path, disable_journal)
    try:
        first_id = await db.get_first_id()
        last_id = await db.get_last_id()
    except BaseException:
        await aio.uncancellable(db.async_close())
        raise

    backend = Backend()
    backend._path = path
    backend._low_size = low_size
    backend._high_size = high_size
    backend._enable_archive = enable_archive
    backend._disable_journal = disable_journal
    backend._db = db
    backend._first_id = first_id
    backend._last_id = last_id
    backend._async_group = aio.Group()
    backend._change_cbs = util.CallbackRegistry()
    backend._msg_queue = aio.Queue(register_queue_size)
    backend._executor = aio.create_executor()

    backend._async_group.spawn(aio.call_on_cancel, db.async_close)
    backend._async_group.spawn(backend._loop)

    mlog.debug('created backend with database %s', path)
    return backend


class Backend(aio.Resource):

    @property
    def async_group(self) -> aio.Group:
        """Async group"""
        return self._async_group

    @property
    def first_id(self) -> typing.Optional[int]:
        """First entry id"""
        return self._first_id

    @property
    def last_id(self) -> typing.Optional[int]:
        """Last entry id"""
        return self._last_id

    def register_change_cb(self,
                           cb: typing.Callable[[typing.List[common.Entry]],
                                               None]
                           ) -> util.RegisterCallbackHandle:
        """Register change callback

        Callback is called if `first_id` changes and/or `last_id` changes
        and/or new entries are available (passed as argument to registered
        callback).

        """
        return self._change_cbs.register(cb)

    async def register(self,
                       timestamp: float,
                       msg: common.Msg):
        """Register message

        Registration adds msg to registration queue. If queue is full, wait
        until message can be successfully added.

        When message is added to empty queue, registration delay timer is
        started. Once delay timer expires or if number of messages in queue
        is greater than threshold, all messages are removed from queue and
        inserted into sqlite database.

        """
        await self._msg_queue.put((timestamp, msg))

    async def query(self,
                    filter: common.Filter
                    ) -> typing.List[common.Entry]:
        """Query entries"""
        return await self._db.query(filter)

    async def _loop(self):
        try:
            while True:
                msgs = await self._get_msgs()
                await self._process_msgs(msgs)

        except Exception as e:
            mlog.warn("backend loop error: %s", e, exc_info=e)

        finally:
            self.close()
            self._msg_queue.close()
            mlog.debug('backend loop closed')

    async def _get_msgs(self):
        loop = asyncio.get_running_loop()
        msgs = []

        msg = await self._msg_queue.get()
        msgs.append(msg)

        start = loop.time()
        while True:
            while not self._msg_queue.empty():
                msgs.append(self._msg_queue.get_nowait())
            timeout = register_delay - (loop.time() - start)
            if timeout <= 0:
                break
            if len(msgs) >= register_queue_treshold:
                break
            async_group = aio.Group()
            try:
                f = async_group.spawn(self._msg_queue.get)
                await aio.wait_for(asyncio.shield(f), timeout)
            except asyncio.TimeoutError:
                break
            finally:
                await aio.uncancellable(async_group.async_close())
                if not f.cancelled():
                    msgs.append(f.result())

        while not self._msg_queue.empty():
            msgs.append(self._msg_queue.get_nowait())
        return msgs

    async def _process_msgs(self, msgs):
        mlog.debug("registering new messages (message count: %s)...",
                   len(msgs))
        entries = await self._db.add_msgs(msgs)
        if not entries:
            return
        entries = list(reversed(entries))

        self._last_id = entries[0].id
        if self._first_id is None:
            self._first_id = entries[-1].id

        mlog.debug("backend state changed (first_id: %s; last_id: %s)",
                   self._first_id, self._last_id)
        self._change_cbs.notify(entries)

        if self._high_size <= 0:
            return
        if self._last_id - self._first_id + 1 <= self._high_size:
            return

        mlog.debug("database cleanup starting...")
        await self._db_cleanup()

    async def _db_cleanup(self):
        first_id = self._last_id - self._low_size + 1
        if first_id > self._last_id:
            first_id = None
        if first_id <= self._first_id:
            return

        if self._enable_archive:
            mlog.debug("archiving database entries...")
            await self._archive_db(first_id)

        await self._db.delete(first_id)
        self._first_id = first_id
        if self._first_id is None:
            self._last_id = None

        mlog.debug("backend state changed (first_id: %s; last_id: %s)",
                   self._first_id, self._last_id)
        self._change_cbs.notify([])

    async def _archive_db(self, first_id):
        archive_path = await self._async_group.spawn(
            self._executor, _ext_get_new_archive_path, self._path)
        archive = await database.create_database(
            archive_path, self._disable_journal)
        try:
            entries = await self._db.query(common.Filter(
                last_id=first_id - 1 if first_id is not None else None))
            await archive.add_entries(entries)
        finally:
            await aio.uncancellable(archive.async_close())


def _ext_get_new_archive_path(db_path):
    last_index = 0

    for i in db_path.parent.glob(db_path.name + '.*'):
        with contextlib.suppress(ValueError):
            index = int(i.name.split('.')[-1])
            if index > last_index:
                last_index = index

    for i in itertools.count(last_index + 1):
        new_path = db_path.parent / f"{db_path.name}.{i}"
        if new_path.exists():
            continue
        return new_path
