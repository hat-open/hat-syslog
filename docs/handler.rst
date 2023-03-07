SyslogHandler
=============

.. Real time reporting of execution state is mandatory functionality for most of
.. Hat's components implementing continuously running service. Primary way
.. of logging is based on Syslog logging protocol as defined by:

..     * `RFC 5425 <https://tools.ietf.org/html/rfc5425>`_
..     * `RFC 5426 <https://tools.ietf.org/html/rfc5426>`_
..     * `RFC 6587 <https://tools.ietf.org/html/rfc6587>`_

.. Each component which reports log messages should implement Syslog TCP client.
.. In this way, all logging messages can be aggregated in a single Syslog
.. concentrator which can provide archiving, searching and real time monitoring
.. functionalities.

.. Care must be taken for Syslog TCP client logging facility implementation not to
.. interfere with other component's functionalities. Logging should be considered
.. best effort and not critical activity of each component.

SyslogHandler provides implementation of Python's standard library
`logging.Handler` interface. This implementation is part of `hat-syslog`
python package.

Each instance of `hat.syslog.handler.SyslogHandler` starts new
background thread responsible for sending syslog messages over TCP, UDP or
TCP+SSL socket. If connection with remote syslog server could not be
established or current connection is closed, new connect is called after 5
second timeout.

All log messages provided to SyslogHandler by
`hat.syslog.handler.SyslogHandler.emit` are queued in queue with
maximum size limited by configuration parameter. During new log message
registration, if queue is full, oldest messages are discarded and counter
of discarded messages is incremented. Once new log messages can be sent
to server, new log message containing information about number of discarded
messages will be sent.


Implementation
--------------

Documentation is available as part of generated API reference:

    * `Python hat.syslog.handler module <py_api/hat/syslog/handler.html>`_
