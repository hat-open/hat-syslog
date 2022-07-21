.. _syslog-handler:

SysLogHandler
=============

SysLogHandler provides implementation of Python's standard library
`logging.Handler` interface. This implementation is part of `hat-syslog`
python package.

Each instance of `hat.syslog.handler.SysLogHandler` starts new
background thread responsible for sending syslog messages over TCP, UDP or
TCP+SSL socket. If connection with remote syslog server could not be
established or current connection is closed, new connect is called after 5
second timeout.

All log messages provided to SysLogHandler by
`hat.syslog.handler.SysLogHandler.emit` are queued in queue with
maximum size limited by configuration parameter. During new log message
registration, if queue is full, oldest messages are discarded and counter
of discarded messages is incremented. Once new log messages can be sent
to server, new log message containing information about number of discarded
messages will be sent.


Implementation
--------------

Documentation is available as part of generated API reference:

    * `Python hat.syslog.handler module <py_api/hat/syslog/handler.html>`_
