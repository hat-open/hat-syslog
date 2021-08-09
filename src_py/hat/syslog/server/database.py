"""Interface to SQLite database"""

from pathlib import Path
import logging
import sqlite3
import typing

from hat import aio
from hat.syslog.server import common


mlog: logging.Logger = logging.getLogger(__name__)
"""Module logger"""


async def create_database(path: Path,
                          disable_journal: bool
                          ) -> 'Database':
    """Create database"""

    async def close():
        await executor(_ext_close, conn)
        mlog.debug('database %s closed', path)

    executor = aio.create_executor(1)
    conn = await executor(_ext_connect, path, disable_journal)
    async_group = aio.Group()
    async_group.spawn(aio.call_on_cancel, close)

    db = Database()
    db._path = path
    db._conn = conn
    db._async_group = async_group
    db._executor = executor

    mlog.debug('opened database %s', path)
    return db


class Database(aio.Resource):

    @property
    def async_group(self) -> aio.Group:
        """Async group"""
        return self._async_group

    async def get_first_id(self) -> typing.Optional[int]:
        """Get first entry id"""
        return await self._async_group.spawn(self._executor, _ext_fist_id,
                                             self._conn)

    async def get_last_id(self) -> typing.Optional[int]:
        """Get last entry id"""
        return await self._async_group.spawn(self._executor, _ext_last_id,
                                             self._conn)

    async def add_msgs(self,
                       msgs: typing.List[typing.Tuple[float, common.Msg]]
                       ) -> typing.List[common.Entry]:
        """Add timestamped messages"""
        columns = ['entry_timestamp', 'facility', 'severity', 'version',
                   'msg_timestamp', 'hostname', 'app_name', 'procid', 'msgid',
                   'data', 'msg']
        values = [(entry_timestamp, msg.facility.value, msg.severity.value,
                   msg.version, msg.timestamp, msg.hostname, msg.app_name,
                   msg.procid, msg.msgid, msg.data, msg.msg)
                  for entry_timestamp, msg in msgs]
        entry_ids = await self._async_group.spawn(
            self._executor, _ext_insert, self._conn, columns, values)

        entries = [
            common.Entry(id=entry_id,
                         timestamp=entry_timestamp,
                         msg=msg)
            for entry_id, (entry_timestamp, msg) in zip(entry_ids, msgs)]

        mlog.debug("messages added to database (message count: %s)",
                   len(entries))
        return entries

    async def add_entries(self, entries: typing.List[common.Entry]):
        """Add entries"""
        columns = ['rowid', 'entry_timestamp', 'facility', 'severity',
                   'version', 'msg_timestamp', 'hostname', 'app_name',
                   'procid', 'msgid', 'data', 'msg']
        values = [(entry.id, entry.timestamp, entry.msg.facility.value,
                   entry.msg.severity.value, entry.msg.version,
                   entry.msg.timestamp, entry.msg.hostname, entry.msg.app_name,
                   entry.msg.procid, entry.msg.msgid, entry.msg.data,
                   entry.msg.msg)
                  for entry in entries]
        entry_ids = await self._async_group.spawn(
            self._executor, _ext_insert, self._conn, columns, values)
        mlog.debug("entries added to database (entry count: %s)",
                   len(entry_ids))

    async def query(self,
                    filter: common.Filter
                    ) -> typing.List[common.Entry]:
        """Query entries that satisfy filter"""
        conditions = []
        args = {}
        if filter.last_id is not None:
            conditions.append('rowid <= :last_id')
            args['last_id'] = filter.last_id
        if filter.entry_timestamp_from is not None:
            conditions.append('entry_timestamp >= :entry_timestamp_from')
            args['entry_timestamp_from'] = filter.entry_timestamp_from
        if filter.entry_timestamp_to is not None:
            conditions.append('entry_timestamp <= :entry_timestamp_to')
            args['entry_timestamp_to'] = filter.entry_timestamp_to
        if filter.facility:
            conditions.append('facility = :facility')
            args['facility'] = filter.facility.value
        if filter.severity:
            conditions.append('severity = :severity')
            args['severity'] = filter.severity.value
        if filter.hostname:
            conditions.append('hostname LIKE :hostname')
            args['hostname'] = f'%{filter.hostname}%'
        if filter.app_name:
            conditions.append('app_name LIKE :app_name')
            args['app_name'] = f'%{filter.app_name}%'
        if filter.procid:
            conditions.append('procid LIKE :procid')
            args['procid'] = f'%{filter.procid}%'
        if filter.msgid:
            conditions.append('msgid LIKE :msgid')
            args['msgid'] = f'%{filter.msgid}%'
        if filter.msg:
            conditions.append('msg LIKE :msg')
            args['msg'] = f'%{filter.msg}%'

        result = await self._async_group.spawn(
            self._executor, _ext_query, self._conn, conditions, args,
            filter.max_results)

        entries = [common.Entry(
                    id=row['rowid'],
                    timestamp=row['entry_timestamp'],
                    msg=common.Msg(facility=common.Facility(row['facility']),
                                   severity=common.Severity(row['severity']),
                                   version=row['version'],
                                   timestamp=row['msg_timestamp'],
                                   hostname=row['hostname'],
                                   app_name=row['app_name'],
                                   procid=row['procid'],
                                   msgid=row['msgid'],
                                   data=row['data'],
                                   msg=row['msg']))
                   for row in result]

        mlog.debug("query resulted with %s entries", len(entries))
        return entries

    async def delete(self, first_id: int):
        """Delete entries prior to first_id"""
        entry_count = await self._async_group.spawn(
            self._executor, _ext_delete, self._conn, first_id)
        mlog.debug("deleted %s entries", entry_count)


_db_columns = [['entry_timestamp', 'REAL'],
               ['facility', 'INTEGER'],
               ['severity', 'INTEGER'],
               ['version', 'INTEGER'],
               ['msg_timestamp', 'REAL'],
               ['hostname', 'TEXT'],
               ['app_name', 'TEXT'],
               ['procid', 'TEXT'],
               ['msgid', 'TEXT'],
               ['data', 'TEXT'],
               ['msg', 'TEXT']]

_db_query_columns = ['rowid'] + [name for name, _ in _db_columns]

_db_structure = f"""
    CREATE TABLE IF NOT EXISTS log (
        {', '.join(col_name + ' ' + col_type
                   for col_name, col_type in _db_columns)}
    );
    CREATE INDEX IF NOT EXISTS log_entry_timestamp_index ON log (
        entry_timestamp DESC)
    """


def _ext_connect(path, disable_journal):
    path.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(f'file:{path}?nolock=1',
                           uri=True,
                           isolation_level=None,
                           detect_types=sqlite3.PARSE_DECLTYPES)
    try:
        conn.executescript(
            ('PRAGMA journal_mode = OFF;\n' if disable_journal else '') +
            _db_structure)
    except Exception:
        conn.close()
        raise
    return conn


def _ext_close(conn):
    conn.close()


def _ext_fist_id(conn):
    c = conn.execute("SELECT MIN(rowid) FROM log")
    result = c.fetchall()
    return result[0][0] if result else None


def _ext_last_id(conn):
    c = conn.execute("SELECT MAX(rowid) FROM log")
    result = c.fetchall()
    return result[0][0] if result else None


def _ext_delete(conn, first_id):
    cmd = "DELETE FROM log"
    if first_id is not None:
        cmd += " WHERE rowid < :first_id"
    c = conn.execute(cmd, {'first_id': first_id})
    return c.rowcount


def _ext_insert(conn, columns, values):
    c = conn.executemany(f"INSERT INTO log ({', '.join(columns)}) "
                         f"VALUES ({', '.join('?' * len(columns))})", values)
    rowcount = c.rowcount
    if rowcount < 1:
        return []
    last_id = _ext_last_id(conn)
    return range(last_id - rowcount + 1, last_id + 1)


def _ext_query(conn, conditions, args, max_results):
    c = conn.execute(
        ' '.join([
            "SELECT rowid, *",
            "FROM log",
            ('WHERE ' + ' AND '.join(conditions) if conditions else ''),
            "ORDER BY rowid DESC",
            ("LIMIT :max_results" if max_results is not None else '')]),
        dict(args, max_results=max_results))
    result = c.fetchall()
    return [{k: v for k, v in zip(_db_query_columns, i)}
            for i in result]
