"""Syslog Server main module"""

from pathlib import Path
import argparse
import asyncio
import contextlib
import logging.config
import sys
import time
import typing

import appdirs

from hat import aio
from hat import json

from hat.syslog.server import common
from hat.syslog.server.backend import create_backend
from hat.syslog.server.syslog import create_syslog_server
from hat.syslog.server.ui import create_web_server


mlog: logging.Logger = logging.getLogger('hat.syslog.server.main')
"""Module logger"""

package_path: Path = Path(__file__).parent
"""Python package path"""

user_data_dir: Path = Path(appdirs.user_data_dir('hat'))
"""User data directory path"""

user_conf_dir: Path = Path(appdirs.user_config_dir('hat'))
"""User configuration directory path"""

default_syslog_addr: str = 'tcp://0.0.0.0:6514'
"""Default syslog listening address"""

default_ui_addr: str = 'http://0.0.0.0:23020'
"""Default UI listening address"""

default_db_path: Path = user_data_dir / 'syslog.db'
"""Default DB file path"""

default_db_low_size: int = int(1e6)
"""Default DB low size count"""

default_db_high_size: int = int(1e7)
"""Default DB high size count"""


def create_argument_parser() -> argparse.ArgumentParser:
    """Create argument parser"""
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '--conf', metavar='PATH', type=Path,
        help="configuration defined by hat-syslog://server.yaml# "
             "(default $XDG_CONFIG_HOME/hat/syslog.{yaml|yml|json})")
    parser.add_argument(
        '--log', metavar='LEVEL', type=str,
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
        help="console log level")
    parser.add_argument(
        '--syslog-addr', metavar='ADDR', type=str,
        help=f"syslog listening address (default {default_syslog_addr})")
    parser.add_argument(
        '--syslog-pem', metavar='PATH', type=Path,
        help="pem file path - mandatory for ssl communication")
    parser.add_argument(
        '--ui-addr', metavar='ADDR', type=str,
        help=f"UI listening address (default {default_ui_addr})")
    parser.add_argument(
        '--db-path', metavar='PATH', type=Path,
        help="sqlite database file path "
             "(default $XDG_DATA_HOME/hat/syslog.db)")
    parser.add_argument(
        '--db-low-size', metavar='N', type=int,
        help=f"number of messages kept in database after database "
             f"cleanup (default {default_db_low_size})")
    parser.add_argument(
        '--db-high-size', metavar='N', type=int,
        help=f"number of messages that will trigger database cleanup "
             f"(default {default_db_high_size})")
    parser.add_argument(
        '--db-enable-archive', action='store_true',
        help="should messages, deleted during database cleanup, be kept "
             "in archive files")
    parser.add_argument(
        '--db-disable-journal', action='store_true',
        help="disable sqlite jurnaling")
    return parser


def main():
    """Syslog Server"""
    parser = create_argument_parser()
    args = parser.parse_args()

    conf_path = args.conf
    if not conf_path:
        for suffix in ('.yaml', '.yml', '.json'):
            conf_path = (user_conf_dir / 'syslog').with_suffix(suffix)
            if conf_path.exists():
                break
        else:
            conf_path = None

    if conf_path == Path('-'):
        conf = json.decode_stream(sys.stdin)
    elif conf_path:
        conf = json.decode_file(conf_path)
    else:
        conf = None

    if conf:
        common.json_schema_repo.validate('hat-syslog://server.yaml#', conf)

    if args.log:
        log_conf = _get_console_log_conf(args.log)
    elif conf:
        log_conf = conf['log']
    else:
        log_conf = {'version': 1}

    logging.config.dictConfig(log_conf)

    syslog_addr = (args.syslog_addr if args.syslog_addr else
                   conf['syslog_addr'] if conf else
                   default_syslog_addr)

    syslog_pem = (
        args.syslog_pem if args.syslog_pem else
        Path(conf['syslog_pem']) if conf and 'syslog_pem' in conf else
        None)

    ui_addr = (args.ui_addr if args.ui_addr else
               conf['ui_addr'] if conf else
               default_ui_addr)

    db_path = (args.db_path if args.db_path else
               Path(conf['db_path']) if conf else
               default_db_path)

    db_low_size = (args.db_low_size if args.db_low_size is not None else
                   conf['db_low_size'] if conf else
                   default_db_low_size)

    db_high_size = (args.db_high_size if args.db_high_size is not None else
                    conf['db_high_size'] if conf else
                    default_db_high_size)

    db_enable_archive = (True if args.db_enable_archive else
                         conf['db_enable_archive'] if conf else
                         False)

    db_disable_journal = (True if args.db_disable_journal else
                          conf['db_disable_journal'] if conf else
                          False)

    aio.init_asyncio()
    with contextlib.suppress(asyncio.CancelledError):
        aio.run_asyncio(async_main(syslog_addr=syslog_addr,
                                   syslog_pem=syslog_pem,
                                   ui_addr=ui_addr,
                                   db_path=db_path,
                                   db_low_size=db_low_size,
                                   db_high_size=db_high_size,
                                   db_enable_archive=db_enable_archive,
                                   db_disable_journal=db_disable_journal))


async def async_main(syslog_addr: str,
                     syslog_pem: typing.Optional[Path],
                     ui_addr: str,
                     db_path: Path,
                     db_low_size: int,
                     db_high_size: int,
                     db_enable_archive: bool,
                     db_disable_journal: bool):
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

        mlog.debug("creating syslog server...")
        await _create_resource(async_group, create_syslog_server, syslog_addr,
                               on_msg, syslog_pem)

        mlog.debug("initialization done")
        await async_group.wait_closing()

    finally:
        mlog.debug("closing...")
        await aio.uncancellable(async_close())


def _get_console_log_conf(level):
    return {
        'version': 1,
        'formatters': {
            'syslog_server_console': {
                'format': '[%(asctime)s %(levelname)s %(name)s] %(message)s'}},
        'handlers': {
            'syslog_server_console': {
                'class': 'logging.StreamHandler',
                'formatter': 'syslog_server_console',
                'level': level}},
        'loggers': {
            'hat.syslog': {
                'level': level}},
        'root': {
            'level': 'INFO' if level == 'DEBUG' else level,
            'handlers': ['syslog_server_console']},
        'disable_existing_loggers': False}


async def _create_resource(async_group, fn, *args):
    resource = await async_group.spawn(fn, *args)
    async_group.spawn(aio.call_on_cancel, resource.async_close)
    async_group.spawn(aio.call_on_done, resource.wait_closing(),
                      async_group.close)
    return resource


if __name__ == '__main__':
    sys.argv[0] = 'hat-syslog'
    sys.exit(main())
