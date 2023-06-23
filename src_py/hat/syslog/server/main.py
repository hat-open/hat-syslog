"""Syslog Server main module"""

from pathlib import Path
import argparse
import asyncio
import contextlib
import logging.config
import sys
import time

import appdirs

from hat import aio

from hat.syslog.server.backend import create_backend
from hat.syslog.server.syslog import create_syslog_server
from hat.syslog.server.ui import create_web_server


mlog: logging.Logger = logging.getLogger('hat.syslog.server.main')
"""Module logger"""

user_data_dir: Path = Path(appdirs.user_data_dir('hat'))
"""User data directory path"""

default_log_level: str = 'INFO'
"""Default console log level"""

default_ui_addr: str = 'http://0.0.0.0:23020'
"""Default UI listening address"""

default_db_path: Path = user_data_dir / 'syslog.db'
"""Default DB file path"""

default_db_low_size: int = int(1e6)
"""Default DB low size count"""

default_db_high_size: int = int(1e7)
"""Default DB high size count"""

default_syslog_addrs: list[str] = ['tcp://0.0.0.0:6514',
                                   'udp://0.0.0.0:6514']
"""Default syslog listening addresses"""


def create_argument_parser() -> argparse.ArgumentParser:
    """Create argument parser"""
    parser = argparse.ArgumentParser(
        description="Syslog Server listening for TCP and/or UDP messages. "
                    "If listening addresses are not provided, Syslog Server "
                    "listens on 'tcp://0.0.0.0:6514' and "
                    "'udp://0.0.0.0:6514'.")
    parser.add_argument(
        '--log-level', metavar='LEVEL', default=default_log_level,
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
        help=f"console log level (default {default_log_level})")
    parser.add_argument(
        '--ui-addr', metavar='ADDR', default=default_ui_addr,
        help=f"UI listening address (default {default_ui_addr})")
    parser.add_argument(
        '--db-path', metavar='PATH', type=Path, default=default_db_path,
        help="sqlite database file path "
             "(default $XDG_DATA_HOME/hat/syslog.db)")
    parser.add_argument(
        '--db-low-size', metavar='N', type=int, default=default_db_low_size,
        help=f"number of messages kept in database after database "
             f"cleanup (default {default_db_low_size})")
    parser.add_argument(
        '--db-high-size', metavar='N', type=int, default=default_db_high_size,
        help=f"number of messages that will trigger database cleanup "
             f"(default {default_db_high_size})")
    parser.add_argument(
        '--db-enable-archive', action='store_true',
        help="should messages, deleted during database cleanup, be kept "
             "in archive files")
    parser.add_argument(
        '--db-disable-journal', action='store_true',
        help="disable sqlite journaling")
    parser.add_argument(
        '--syslog-pem-path', metavar='PATH', type=Path, default=None,
        help="certificate PEM path used in case of tls syslog")
    parser.add_argument(
        'syslog_addrs', metavar='ADDR', nargs='*',
        default=default_syslog_addrs,
        help="syslog listening address formated as <prot>://<host>:<port> "
             "(<prot> is 'tcp', 'udp' or 'tls'; <host> is host name or IP "
             "address; <port> is UDP/TCP port)")
    return parser


def main():
    """Syslog Server"""
    parser = create_argument_parser()
    args = parser.parse_args()

    logging.config.dictConfig({
        'version': 1,
        'formatters': {
            'console_formater': {
                'format': '[%(asctime)s %(levelname)s %(name)s] %(message)s'}},
        'handlers': {
            'console_handler': {
                'class': 'logging.StreamHandler',
                'formatter': 'console_formater',
                'level': args.log_level}},
        'root': {
            'level': args.log_level,
            'handlers': ['console_handler']},
        'disable_existing_loggers': False})

    aio.init_asyncio()
    with contextlib.suppress(asyncio.CancelledError):
        aio.run_asyncio(async_main(ui_addr=args.ui_addr,
                                   db_path=args.db_path,
                                   db_low_size=args.db_low_size,
                                   db_high_size=args.db_high_size,
                                   db_enable_archive=args.db_enable_archive,
                                   db_disable_journal=args.db_disable_journal,
                                   syslog_pem_path=args.syslog_pem_path,
                                   syslog_addrs=args.syslog_addrs))


async def async_main(ui_addr: str,
                     db_path: Path,
                     db_low_size: int,
                     db_high_size: int,
                     db_enable_archive: bool,
                     db_disable_journal: bool,
                     syslog_pem_path: Path | None,
                     syslog_addrs: list[str]):
    """Syslog Server async main"""
    async_group = aio.Group()

    async def on_msg(msg):
        await backend.register(time.time(), msg)

    async def async_close():
        await async_group.async_close()
        await asyncio.sleep(0.1)

    try:
        mlog.debug("creating backend...")
        backend = await _create_resource(async_group, create_backend,
                                         db_path, db_low_size, db_high_size,
                                         db_enable_archive, db_disable_journal)

        mlog.debug("creating web server...")
        await _create_resource(async_group, create_web_server, ui_addr,
                               backend)

        mlog.debug("creating syslog servers...")
        for syslog_addr in syslog_addrs:
            await _create_resource(async_group, create_syslog_server,
                                   syslog_addr, on_msg, syslog_pem_path)

        mlog.debug("initialization done")
        await async_group.wait_closing()

    finally:
        mlog.debug("closing...")
        await aio.uncancellable(async_close())


async def _create_resource(async_group, fn, *args):
    resource = await async_group.spawn(fn, *args)
    async_group.spawn(aio.call_on_cancel, resource.async_close)
    async_group.spawn(aio.call_on_done, resource.wait_closing(),
                      async_group.close)
    return resource


if __name__ == '__main__':
    sys.argv[0] = 'hat-syslog-server'
    sys.exit(main())
