"""Syslog hadler

Implementation of `logging.Handler` for syslog logging protocol.

"""

import collections
import contextlib
import datetime
import logging
import os
import socket
import ssl
import sys
import threading
import time
import traceback
import typing

from hat import json
from hat.syslog import common
from hat.syslog import encoder


class SysLogHandler(logging.Handler):
    """Syslog handler

    Args:
        host: remote host name
        port: remote TCP/UDP port
        comm_type: communication type
        queue_size: message queue size
        reconnect_delay: delay in seconds before retrying connection with
            remote syslog server

    """

    def __init__(self,
                 host: str,
                 port: int,
                 comm_type: typing.Union[common.CommType, str],
                 queue_size: int = 1024,
                 reconnect_delay: float = 5):
        super().__init__()
        self.__state = _ThreadState(
            host=host,
            port=port,
            comm_type=(common.CommType[comm_type]
                       if not isinstance(comm_type, common.CommType)
                       else comm_type),
            queue=collections.deque(),
            queue_size=queue_size,
            reconnect_delay=reconnect_delay,
            cv=threading.Condition(),
            closed=threading.Event(),
            dropped=[0])
        self.__thread = threading.Thread(
            target=_logging_handler_thread,
            args=(self.__state, ),
            daemon=True)
        self.__thread.start()

    def close(self):
        """"See `logging.Handler.close`"""
        state = self.__state
        with state.cv:
            if state.closed.is_set():
                return
            state.closed.set()
            with contextlib.suppress(Exception):
                # workaround for errors/0001.txt
                state.cv.notify_all()

    def emit(self, record):
        """"See `logging.Handler.emit`"""
        msg = _record_to_msg(record)
        state = self.__state
        with state.cv:
            if state.closed.is_set():
                return
            state.queue.append(msg)
            while len(state.queue) > state.queue_size:
                state.queue.popleft()
                state.dropped[0] += 1
            with contextlib.suppress(Exception):
                # workaround for errors/0001.txt
                state.cv.notify_all()


class _ThreadState(typing.NamedTuple):
    """Handler thread state"""
    host: str
    """Hostname"""
    port: int
    """TCP port"""
    comm_type: typing.Union[common.CommType, str]
    """Communication type"""
    queue: collections.deque
    """Message queue"""
    queue_size: int
    """Message queue size"""
    reconnect_delay: float
    """Reconnect delay"""
    cv: threading.Condition
    """Conditional variable"""
    closed: threading.Event
    """Closed flag"""
    dropped: typing.List[int]
    """Dropped message counter"""


def _logging_handler_thread(state):
    msg = None
    while not state.closed.is_set():
        try:
            if state.comm_type == common.CommType.UDP:
                s = socket.socket(type=socket.SOCK_DGRAM)
                s.connect((state.host, state.port))
            elif state.comm_type == common.CommType.TCP:
                s = socket.create_connection((state.host, state.port))
                s.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
            elif state.comm_type == common.CommType.SSL:
                s = ssl.wrap_socket(socket.create_connection(
                    (state.host, state.port)))
                s.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
            else:
                raise NotImplementedError()
        except Exception:
            time.sleep(state.reconnect_delay)
            continue
        try:
            while True:
                if not msg:
                    with state.cv:
                        state.cv.wait_for(lambda: (state.closed.is_set() or
                                                   len(state.queue) or
                                                   state.dropped[0]))
                        if state.closed.is_set():
                            return
                        if state.dropped[0]:
                            msg = _create_dropped_msg(
                                state.dropped[0], '_logging_handler_thread', 0)
                            state.dropped[0] = 0
                        else:
                            msg = state.queue.popleft()
                msg_bytes = encoder.msg_to_str(msg).encode()
                s.send(f'{len(msg_bytes)} '.encode() + msg_bytes)
                msg = None
        except Exception:
            pass
        finally:
            with contextlib.suppress(Exception):
                s.close()


def _record_to_msg(record):
    exc_info = ''
    with contextlib.suppress(Exception):
        if record.exc_info:
            exc_info = ''.join(
                traceback.TracebackException(*record.exc_info).format())
    return common.Msg(
        facility=common.Facility.USER,
        severity={
            logging.NOTSET: common.Severity.INFORMATIONAL,
            logging.DEBUG: common.Severity.DEBUG,
            logging.INFO: common.Severity.INFORMATIONAL,
            logging.WARNING: common.Severity.WARNING,
            logging.ERROR: common.Severity.ERROR,
            logging.CRITICAL: common.Severity.CRITICAL}[record.levelno],
        version=1,
        timestamp=record.created,
        hostname=socket.gethostname(),
        app_name=sys.argv[0],  # record.processName
        procid=str(record.process) if record.process else None,
        msgid=record.name[:32],
        data=json.encode({
            'hat@1': {
                'name': str(record.name),
                'thread': str(record.thread),
                'funcName': str(record.funcName),
                'lineno': str(record.lineno),
                'exc_info': exc_info}}),
        msg=record.getMessage())


def _create_dropped_msg(dropped, func_name, lineno):
    return common.Msg(
        facility=common.Facility.USER,
        severity=common.Severity.ERROR,
        version=1,
        timestamp=datetime.datetime.now(datetime.timezone.utc).timestamp(),
        hostname=socket.gethostname(),
        app_name=sys.argv[0],  # record.processName
        procid=str(os.getpid()),
        msgid=__name__,
        data=json.encode({
            'hat@1': {
                'name': __name__,
                'thread': str(threading.get_ident()),
                'funcName': str(func_name),
                'lineno': str(lineno),
                'exc_info': ''}}),
        msg=f'dropped {dropped} log messages')
