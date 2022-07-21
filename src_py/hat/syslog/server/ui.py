"""Web server implementation"""

from pathlib import Path
import functools
import logging
import typing
import urllib

from hat import aio
from hat import juggler

from hat.syslog.server import common
from hat.syslog.server import encoder
import hat.syslog.server.backend


mlog: logging.Logger = logging.getLogger(__name__)
"""Module logger"""

package_path: Path = Path(__file__).parent
"""Python package path"""

ui_path: Path = package_path / 'ui'
"""UI directory path"""

max_results_limit: int = 200
"""Max results limit"""

autoflush_delay: float = 0.2
"""Juggler autoflush delay"""


async def create_web_server(addr: str,
                            pem: typing.Optional[Path],
                            backend: hat.syslog.server.backend.Backend
                            ) -> 'WebServer':
    """Create web server"""
    addr = urllib.parse.urlparse(addr)
    host = addr.hostname
    port = addr.port

    server = WebServer()
    server._backend = backend
    server._srv = await juggler.listen(host, port, server._on_connection,
                                       static_dir=ui_path,
                                       pem_file=pem,
                                       autoflush_delay=autoflush_delay)
    return server


class WebServer(aio.Resource):

    @property
    def async_group(self) -> aio.Group:
        """Async group"""
        return self._srv.async_group

    def _on_connection(self, conn):
        self.async_group.spawn(self._connection_loop, conn)

    async def _connection_loop(self, conn):
        change_queue = aio.Queue()
        conn.async_group.spawn(_change_loop, self._backend, conn, change_queue)

        try:
            with self._backend.register_change_cb(change_queue.put_nowait):
                with conn.register_change_cb(
                        functools.partial(change_queue.put_nowait, [])):
                    await conn.wait_closing()

        finally:
            conn.close()


async def _change_loop(backend, conn, change_queue):
    try:
        filter_json = _sanitize_filter(conn.remote_data)
        first_id = backend.first_id
        last_id = backend.last_id
        filter_changed = True
        new_entries_json = []

        while True:
            if filter_changed:
                filter = encoder.filter_from_json(filter_json)
                while not change_queue.empty():
                    change_queue.get_nowait()
                entries = await backend.query(filter)
                entries_json = [encoder.entry_to_json(entry)
                                for entry in entries]
            elif new_entries_json:
                previous_id = entries_json[0]['id'] if entries_json else 0
                entries_json = [*_filter_entries(filter_json, previous_id,
                                                 new_entries_json),
                                *entries_json]
                entries_json = entries_json[:filter.max_results]

            conn.set_local_data({'filter': filter_json,
                                 'entries': entries_json,
                                 'first_id': first_id,
                                 'last_id': last_id})

            new_entries = await change_queue.get()
            new_entries_json = [encoder.entry_to_json(entry)
                                for entry in new_entries]

            first_id = backend.first_id
            last_id = backend.last_id
            new_filter_json = _sanitize_filter(conn.remote_data)
            filter_changed = new_filter_json != filter_json
            filter_json = new_filter_json

    finally:
        conn.close()


def _sanitize_filter(filter_json):
    if not filter_json:
        filter_json = encoder.filter_to_json(
            common.Filter(max_results=max_results_limit))
    if (filter_json['max_results'] is None or
            filter_json['max_results'] > max_results_limit):
        filter_json = dict(filter_json, max_results=max_results_limit)
    return filter_json


def _filter_entries(filter_json, previous_id, entries_json):
    for i in entries_json:
        if i['id'] <= previous_id:
            continue
        if (filter_json['last_id'] is not None
                and i['id'] > filter_json['last_id']):
            continue
        if (filter_json['entry_timestamp_from'] is not None
                and i['timestamp'] < filter_json['entry_timestamp_from']):
            continue
        if (filter_json['entry_timestamp_to'] is not None
                and i['timestamp'] > filter_json['entry_timestamp_to']):
            continue
        if (filter_json['facility'] is not None and
                i['msg']['facility'] != filter_json['facility']):
            continue
        if (filter_json['severity'] is not None and
                i['msg']['severity'] != filter_json['severity']):
            continue
        if not _match_str_filter(filter_json['hostname'],
                                 i['msg']['hostname']):
            continue
        if not _match_str_filter(filter_json['app_name'],
                                 i['msg']['app_name']):
            continue
        if not _match_str_filter(filter_json['procid'],
                                 i['msg']['procid']):
            continue
        if not _match_str_filter(filter_json['msgid'],
                                 i['msg']['msgid']):
            continue
        if not _match_str_filter(filter_json['msg'],
                                 i['msg']['msg']):
            continue
        yield i


def _match_str_filter(filter, value):
    return not filter or filter in value
