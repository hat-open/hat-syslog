"""Syslog server implementation"""

from pathlib import Path
import asyncio.sslproto
import contextlib
import logging
import ssl
import typing
import urllib.parse

from hat import aio

from hat.syslog.server import common
from hat.syslog.server import encoder


mlog: logging.Logger = logging.getLogger(__name__)
"""Module logger"""

MsgCb = aio.AsyncCallable[[common.Msg], None]

SyslogServer = typing.Union['TcpSyslogServer', 'UdpSyslogServer']


async def create_syslog_server(addr: str,
                               msg_cb: MsgCb,
                               pem_path: Path | None
                               ) -> SyslogServer:
    """Create syslog server"""
    addr = urllib.parse.urlparse(addr)

    if addr.scheme == 'tls':
        ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ssl_ctx.load_cert_chain(pem_path)
        return await _create_tcp_syslog_server(addr.hostname, addr.port,
                                               msg_cb, ssl_ctx)

    if addr.scheme == 'tcp':
        return await _create_tcp_syslog_server(addr.hostname, addr.port,
                                               msg_cb, None)

    if addr.scheme == 'udp':
        return await _create_udp_syslog_server(addr.hostname, addr.port,
                                               msg_cb)

    raise ValueError('unsupported address')


async def _create_tcp_syslog_server(host, port, msg_cb, ssl_ctx):
    server = TcpSyslogServer()
    server._msg_cb = msg_cb
    server._async_group = aio.Group()

    server._srv = await asyncio.start_server(server._on_client, host, port,
                                             ssl=ssl_ctx)
    server.async_group.spawn(aio.call_on_cancel, server._on_close)

    mlog.debug('listening for tcp syslog clients on %s:%s', host, port)
    return server


class TcpSyslogServer(aio.Resource):
    """TCP syslog server"""

    @property
    def async_group(self) -> aio.Group:
        """Async group"""
        return self._async_group

    async def _on_close(self):
        with contextlib.suppress(Exception):
            self._srv.close()

        await self._srv.wait_closed()

    def _on_client(self, reader, writer):
        try:
            self.async_group.spawn(self._client_loop, reader, writer)

        except Exception:
            writer.close()

    async def _client_loop(self, reader, writer):
        try:
            while True:
                size = await reader.readuntil(b' ')
                buff = await reader.readexactly(int(size[:-1]))
                msg = encoder.msg_from_str(buff.decode())
                mlog.debug("received new syslog message")

                await aio.call(self._msg_cb, msg)

        except asyncio.IncompleteReadError:
            pass

        except Exception as e:
            mlog.error('tcp client error: %s', e, exc_info=e)

        finally:
            with contextlib.suppress(Exception):
                writer.close()

            # BUGFIX
            if isinstance(writer.transport,
                          asyncio.sslproto._SSLProtocolTransport):
                # TODO for TLS connection Protocol.connection_lost is never
                #      called
                await aio.uncancellable(asyncio.sleep(0.001))

            else:
                await aio.uncancellable(writer.wait_closed())

            mlog.debug('tcp client connection closed')


async def _create_udp_syslog_server(host, port, msg_cb):
    server = UdpSyslogServer()
    server._msg_cb = msg_cb
    server._receive_queue = aio.Queue()
    server._async_group = aio.Group()

    class Protocol(asyncio.DatagramProtocol):

        def connection_lost(self, exc):
            server.close()

        def datagram_received(self, data, addr):
            if server._receive_queue.is_closed:
                return
            server._receive_queue.put_nowait(data)

    loop = asyncio.get_running_loop()
    server._transport, server._protocol = \
        await loop.create_datagram_endpoint(Protocol, (host, port), None)
    server.async_group.spawn(aio.call_on_cancel, server._on_close)
    server.async_group.spawn(server._receive_loop)

    mlog.debug('listening for udp syslog messages on %s:%s', host, port)
    return server


class UdpSyslogServer(aio.Resource):
    """UDP syslog server"""

    @property
    def async_group(self) -> aio.Group:
        """Async group"""
        return self._async_group

    def _on_close(self):
        with contextlib.suppress(Exception):
            self._transport.close()

    async def _receive_loop(self):
        try:
            while True:
                try:
                    msg_bytes = await self._receive_queue.get()
                    msg = encoder.msg_from_str(msg_bytes.decode())
                    mlog.debug("received new syslog message")

                    await aio.call(self._msg_cb, msg)

                except Exception as e:
                    mlog.error('udp client error: %s', e, exc_info=e)

        except Exception as e:
            mlog.error('receive loop error: %s', e, exc_info=e)

        finally:
            self.close()
            self._receive_queue.close()
