"""Web server implementation"""

import asyncio
import contextlib
import importlib
import itertools
import logging
import urllib

from hat import aio
from hat import juggler

from hat.syslog.server import common
from hat.syslog.server import encoder
import hat.syslog.server.backend


mlog: logging.Logger = logging.getLogger(__name__)
"""Module logger"""

max_results_limit: int = 200
"""Max results limit"""

autoflush_delay: float = 0.2
"""Juggler autoflush delay"""

default_filter = common.Filter(max_results=max_results_limit)
"""Default filter"""


async def create_web_server(addr: str,
                            backend: hat.syslog.server.backend.Backend
                            ) -> 'WebServer':
    """Create web server"""
    srv = WebServer()
    srv._backend = backend
    srv._locks = {}
    srv._filters = {}

    exit_stack = contextlib.ExitStack()
    try:
        ui_path = exit_stack.enter_context(
            importlib.resources.as_file(
                importlib.resources.files(__package__) / 'ui'))

        url = urllib.parse.urlparse(addr)
        srv._srv = await juggler.listen(host=url.hostname,
                                        port=url.port,
                                        connection_cb=srv._on_connection,
                                        request_cb=srv._on_request,
                                        static_dir=ui_path,
                                        autoflush_delay=autoflush_delay)

        try:
            srv.async_group.spawn(aio.call_on_cancel, exit_stack.close)

        except BaseException:
            await aio.uncancellable(srv.async_close())
            raise

    except BaseException:
        exit_stack.close()
        raise

    mlog.debug("web server listening on %s", addr)
    return srv


class WebServer(aio.Resource):

    @property
    def async_group(self) -> aio.Group:
        """Async group"""
        return self._srv.async_group

    async def _on_connection(self, conn):
        try:
            mlog.debug("new connection")

            self._locks[conn] = asyncio.Lock()
            self._filters[conn] = default_filter

            change_queue = aio.Queue()
            with self._backend.register_change_cb(change_queue.put_nowait):
                async with self._locks[conn]:
                    prev_filter = self._filters[conn]
                    prev_filter_json = encoder.filter_to_json(prev_filter)

                    entries = await self._backend.query(prev_filter)
                    entries_json = [encoder.entry_to_json(entry)
                                    for entry in entries]

                    conn.state.set([], {'filter': prev_filter_json,
                                        'entries': entries_json,
                                        'first_id': self._backend.first_id,
                                        'last_id': self._backend.last_id})

                while True:
                    entries = await change_queue.get()

                    async with self._locks[conn]:
                        prev_filter = self._filters[conn]
                        prev_filter_json = conn.state.get('filter')
                        prev_entries_json = conn.state.get('entries')

                        previous_id = (prev_entries_json[0]['id']
                                       if prev_entries_json else 0)
                        entries = (entry for entry in entries
                                   if entry.id > previous_id)
                        entries = _filter_entries(prev_filter, entries)
                        entries_json = [encoder.entry_to_json(entry)
                                        for entry in entries]

                        if entries_json:
                            new_entries_json = itertools.chain(
                                entries_json, prev_entries_json)
                            new_entries_json = itertools.islice(
                                new_entries_json, prev_filter.max_results)
                            new_entries_json = list(new_entries_json)

                        else:
                            new_entries_json = prev_entries_json

                        conn.state.set([], {'filter': prev_filter_json,
                                            'entries': new_entries_json,
                                            'first_id': self._backend.first_id,
                                            'last_id': self._backend.last_id})

        except Exception as e:
            mlog.error("connection error: %s", e, exc_info=e)

        finally:
            mlog.debug("closing connection")
            conn.close()
            self._locks.pop(conn)
            self._filters.pop(conn)

    async def _on_request(self, conn, name, data):
        if name != 'filter':
            raise Exception('invalid request name')

        new_filter = encoder.filter_from_json(data)
        new_filter = _sanitize_filter(new_filter)

        async with self._locks[conn]:
            prev_filter = self._filters[conn]
            if new_filter == prev_filter:
                return

            mlog.debug('setting new filter: %s', new_filter)
            new_filter_json = encoder.filter_to_json(new_filter)

            entries = await self._backend.query(new_filter)
            entries_json = [encoder.entry_to_json(entry) for entry in entries]

            self._filters[conn] = new_filter
            conn.state.set([], {'filter': new_filter_json,
                                'entries': entries_json,
                                'first_id': self._backend.first_id,
                                'last_id': self._backend.last_id})


def _sanitize_filter(f):
    if f.max_results is None or f.max_results > max_results_limit:
        f = f._replace(max_results=max_results_limit)

    return f


def _filter_entries(f, entries):
    for i in entries:
        if f.last_id is not None and i.id > f.last_id:
            continue

        if (f.entry_timestamp_from is not None
                and i.timestamp < f.entry_timestamp_from):
            continue

        if (f.entry_timestamp_to is not None
                and i.timestamp > f.entry_timestamp_to):
            continue

        if f.facility is not None and i.msg.facility != f.facility:
            continue

        if f.severity is not None and i.msg.severity != f.severity:
            continue

        if not _match_str_filter(f.hostname, i.msg.hostname):
            continue

        if not _match_str_filter(f.app_name, i.msg.app_name):
            continue

        if not _match_str_filter(f.procid, i.msg.procid):
            continue

        if not _match_str_filter(f.msgid, i.msg.msgid):
            continue

        if not _match_str_filter(f.msg, i.msg.msg):
            continue

        yield i


def _match_str_filter(f, value):
    return not f or f in value
