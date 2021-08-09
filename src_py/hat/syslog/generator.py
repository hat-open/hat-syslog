"""Syslog test message generator"""

import asyncio
import contextlib
import logging.config
import sys

import click

from hat import aio


mlog: logging.Logger = logging.getLogger('hat.syslog.generator')
"""Module logger"""


@click.command()
@click.option('--host',
              default='127.0.0.1',
              metavar='HOST',
              show_default=True,
              help="syslog server host name")
@click.option('--port',
              default=6514,
              metavar='PORT',
              show_default=True,
              help="syslog server port")
@click.option('--count',
              default=1,
              metavar='N',
              type=int,
              show_default=True,
              help="number of log messages")
@click.option('--text',
              default='syslog generator test',
              metavar='TEXT',
              show_default=True,
              help="log message text")
@click.option('--queue-size',
              default=1024,
              metavar='N',
              type=int,
              show_default=True,
              help="client's log message queue size")
@click.option('--msg-delay',
              default=0.01,
              metavar='T',
              type=float,
              show_default=True,
              help="time delay between message generation in seconds")
@click.option('--end-delay',
              default=0.5,
              metavar='T',
              type=float,
              show_default=True,
              help="time delay affter all messages have been generated in "
                   "seconds")
def main(host: str,
         port: int,
         count: int,
         text: str,
         queue_size: int,
         msg_delay: float,
         end_delay: float):
    """Syslog test message generator"""
    aio.init_asyncio()

    logging.config.dictConfig({
        'version': 1,
        'formatters': {
            'default': {}},
        'handlers': {
            'syslog': {
                'class': 'hat.syslog.handler.SysLogHandler',
                'host': host,
                'port': port,
                'comm_type': 'TCP',
                'level': 'DEBUG',
                'formatter': 'default',
                'queue_size': queue_size}},
        'root': {
            'level': 'INFO',
            'handlers': ['syslog']},
        'disable_existing_loggers': False})

    with contextlib.suppress(asyncio.CancelledError):
        aio.run_asyncio(async_main(count, text, msg_delay, end_delay))


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
    sys.exit(main())
