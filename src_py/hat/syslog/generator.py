"""Syslog test message generator"""

import argparse
import asyncio
import contextlib
import logging.config
import sys

from hat import aio
from hat.syslog import common


mlog: logging.Logger = logging.getLogger('hat.syslog.generator')
"""Module logger"""


def create_argument_parser() -> argparse.ArgumentParser:
    """Create argument parser"""
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '--comm-type', choices=[i.name for i in common.CommType],
        default='TCP', help="syslog server host name (default TCP)")
    parser.add_argument(
        '--host', metavar='HOST', default='127.0.0.1',
        help="syslog server host name (default 127.0.0.1)")
    parser.add_argument(
        '--port', metavar='PORT', type=int, default=6514,
        help="syslog server port (default 6514)")
    parser.add_argument(
        '--count', metavar='N', type=int, default=1,
        help="number of log messages (default 1)")
    parser.add_argument(
        '--text', metavar='TEXT', default='syslog generator test',
        help="log message text")
    parser.add_argument(
        '--level', metavar='LEVEL', default='INFO',
        choices=('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'),
        help="log level")
    parser.add_argument(
        '--with-exc', action='store_true',
        help="include exception")
    parser.add_argument(
        '--queue-size', metavar='N', type=int, default=1024,
        help="client's log message queue size (default 1024)")
    parser.add_argument(
        '--msg-delay', metavar='T', type=float, default=0.01,
        help="time delay between message generation in seconds "
             "(default 0.01)")
    parser.add_argument(
        '--end-delay', metavar='T', type=float, default=0.5,
        help="time delay affter all messages have been generated in seconds "
             "(default 0.5)")
    return parser


def main():
    """Syslog test message generator"""
    parser = create_argument_parser()
    args = parser.parse_args()

    aio.init_asyncio()

    logging.config.dictConfig({
        'version': 1,
        'formatters': {
            'default': {}},
        'handlers': {
            'syslog': {
                'class': 'hat.syslog.handler.SyslogHandler',
                'host': args.host,
                'port': args.port,
                'comm_type': 'TCP',
                'level': args.level,
                'formatter': 'default',
                'queue_size': args.queue_size}},
        'loggers': {
            'asyncio': {
                'level': 'INFO'}},
        'root': {
            'level': args.level,
            'handlers': ['syslog']},
        'disable_existing_loggers': False})

    with contextlib.suppress(asyncio.CancelledError):
        aio.run_asyncio(async_main(count=args.count,
                                   text=args.text,
                                   level=getattr(logging, args.level),
                                   with_exc=args.with_exc,
                                   msg_delay=args.msg_delay,
                                   end_delay=args.end_delay))


async def async_main(count: int,
                     text: str,
                     level: int,
                     with_exc: bool,
                     msg_delay: float,
                     end_delay: float):
    """Async main"""
    digits_count = _number_of_digits(count)

    for i in range(count):
        msg = f'{{}} {{:0{digits_count}}}'.format(text, i)
        exc_info = Exception(msg) if with_exc else None
        mlog.log(level, msg, exc_info=exc_info)

        await asyncio.sleep(msg_delay)

    await asyncio.sleep(end_delay)


def _number_of_digits(x):
    if x < 10:
        return 1
    return 1 + _number_of_digits(x // 10)


if __name__ == '__main__':
    sys.argv[0] = 'hat-syslog-generator'
    sys.exit(main())
