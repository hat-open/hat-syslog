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
                'class': 'hat.syslog.handler.SysLogHandler',
                'host': args.host,
                'port': args.port,
                'comm_type': 'TCP',
                'level': 'DEBUG',
                'formatter': 'default',
                'queue_size': args.queue_size}},
        'root': {
            'level': 'INFO',
            'handlers': ['syslog']},
        'disable_existing_loggers': False})

    with contextlib.suppress(asyncio.CancelledError):
        aio.run_asyncio(async_main(count=args.count,
                                   text=args.text,
                                   msg_delay=args.msg_delay,
                                   end_delay=args.end_delay))


async def async_main(count: int,
                     text: str,
                     msg_delay: float,
                     end_delay: float):
    """Async main"""
    for i in range(count):
        mlog.info(
            ('{} {:0' + str(_number_of_digits(count)) + '}').format(
                text, i))
        await asyncio.sleep(msg_delay)
    await asyncio.sleep(end_delay)


def _number_of_digits(x):
    if x < 10:
        return 1
    return 1 + _number_of_digits(x // 10)


if __name__ == '__main__':
    sys.argv[0] = 'hat-syslog-generator'
    sys.exit(main())
