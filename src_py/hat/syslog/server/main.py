"""Syslog Server main module"""

from pathlib import Path
import asyncio
import contextlib
import logging.config
import sys
import typing

import appdirs
import click

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


@click.command()
@click.option('--conf', metavar='PATH', type=Path,
              help="configuration defined by hat-syslog://syslog.yaml# "
                   "(default $XDG_CONFIG_HOME/hat/syslog.{yaml|yml|json})")
@click.option('--log', metavar='LEVEL',
              type=click.Choice(['DEBUG', 'INFO', 'WARNING', 'ERROR']),
              help="console log level")
@click.option('--syslog-addr', metavar='ADDR',
              help=f"syslog listening address (default {default_syslog_addr})")
@click.option('--syslog-pem', metavar='PATH', type=Path,
              help="pem file path - mandatory for ssl communication")
@click.option('--ui-addr', metavar='ADDR',
              help=f"UI listening address (default {default_ui_addr})")
@click.option('--ui-pem', metavar='PATH', type=Path,
              help="pem file path - mandatory for https communication")
@click.option('--db-path', metavar='PATH', type=Path,
              help="sqlite database file path "
                   "(default $XDG_DATA_HOME/hat/syslog.db)")
@click.option('--db-low-size', metavar='N', type=int,
              help=f"number of messages kept in database after database "
                   f"cleanup (default {default_db_low_size})")
@click.option('--db-high-size', metavar='N', type=int,
              help=f"number of messages that will trigger database cleanup "
                   f"(default {default_db_high_size})")
@click.option('--db-enable-archive', default=False, is_flag=True,
              help="should messages, deleted during database cleanup, be kept "
                   "in archive files")
@click.option('--db-disable-journal', default=False, is_flag=True,
              help="disable sqlite jurnaling")
def main(conf: typing.Optional[Path],
         log: typing.Optional[str],
         syslog_addr: typing.Optional[str],
         syslog_pem: typing.Optional[Path],
         ui_addr: typing.Optional[str],
         ui_pem: typing.Optional[Path],
         db_path: typing.Optional[Path],
         db_low_size: typing.Optional[int],
         db_high_size: typing.Optional[int],
         db_enable_archive: bool,
         db_disable_journal: bool):
    """Syslog Server"""
    if not conf:
        for suffix in ('.yaml', '.yml', '.json'):
            conf = (user_conf_dir / 'syslog').with_suffix(suffix)
            if conf.exists():
                break
        else:
            conf = None

    if conf == Path('-'):
        conf = json.decode_stream(sys.stdin)
    elif conf:
        conf = json.decode_file(conf)

    sync_main(conf=conf,
              log=log,
              syslog_addr=syslog_addr,
              syslog_pem=syslog_pem,
              ui_addr=ui_addr,
              ui_pem=ui_pem,
              db_path=db_path,
              db_low_size=db_low_size,
              db_high_size=db_high_size,
              db_enable_archive=db_enable_archive,
              db_disable_journal=db_disable_journal)


def sync_main(conf: typing.Optional[json.Data],
              log: typing.Optional[str],
              syslog_addr: typing.Optional[str],
              syslog_pem: typing.Optional[Path],
              ui_addr: typing.Optional[str],
              ui_pem: typing.Optional[Path],
              db_path: typing.Optional[Path],
              db_low_size: typing.Optional[int],
              db_high_size: typing.Optional[int],
              db_enable_archive: bool,
              db_disable_journal: bool):
    """Syslog Server sync main"""
    aio.init_asyncio()

    if conf:
        common.json_schema_repo.validate('hat-syslog://syslog.yaml#', conf)

    if log:
        log_conf = _get_console_log_conf(log)
    elif conf:
        log_conf = conf['log']
    else:
        log_conf = {'version': 1}

    if not syslog_addr:
        syslog_addr = conf['syslog_addr'] if conf else default_syslog_addr

    if not syslog_pem and conf and 'syslog_pem' in conf:
        syslog_pem = Path(conf['syslog_pem'])

    if not ui_addr:
        ui_addr = conf['ui_addr'] if conf else default_ui_addr

    if not ui_pem and conf and 'ui_pem' in conf:
        ui_pem = Path(conf['ui_pem'])

    if not db_path:
        db_path = Path(conf['db_path']) if conf else default_db_path

    if db_low_size is None:
        db_low_size = conf['db_low_size'] if conf else default_db_low_size

    if db_high_size is None:
        db_high_size = conf['db_high_size'] if conf else default_db_high_size

    if not db_enable_archive and conf:
        db_enable_archive = conf['db_enable_archive']

    if not db_disable_journal and conf:
        db_disable_journal = conf['db_disable_journal']

    logging.config.dictConfig(log_conf)
    with contextlib.suppress(asyncio.CancelledError):
        aio.run_asyncio(async_main(syslog_addr=syslog_addr,
                                   syslog_pem=syslog_pem,
                                   ui_addr=ui_addr,
                                   ui_pem=ui_pem,
                                   db_path=db_path,
                                   db_low_size=db_low_size,
                                   db_high_size=db_high_size,
                                   db_enable_archive=db_enable_archive,
                                   db_disable_journal=db_disable_journal))


async def async_main(syslog_addr: str,
                     syslog_pem: typing.Optional[Path],
                     ui_addr: str,
                     ui_pem: typing.Optional[Path],
                     db_path: Path,
                     db_low_size: int,
                     db_high_size: int,
                     db_enable_archive: bool,
                     db_disable_journal: bool):
    """Syslog Server async main"""
    async_group = aio.Group()
    async_group.spawn(aio.call_on_cancel, asyncio.sleep, 0.1)

    try:
        mlog.debug("creating backend...")
        backend = await _create_resource(async_group, create_backend,
                                         db_path, db_low_size, db_high_size,
                                         db_enable_archive, db_disable_journal)

        mlog.debug("creating web server...")
        await _create_resource(async_group, create_web_server, ui_addr, ui_pem,
                               backend)

        mlog.debug("creating syslog server...")
        await _create_resource(async_group, create_syslog_server, syslog_addr,
                               syslog_pem, backend)

        mlog.debug("initialization done")
        await async_group.wait_closing()

    finally:
        mlog.debug("closing...")
        await aio.uncancellable(async_group.async_close())


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
