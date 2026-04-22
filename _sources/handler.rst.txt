Syslog Handler
==============

Syslog Handler provides implementation of Python's standard library
`logging.Handler`_ interface. This implementation is part of `hat-syslog`
python package.

Care must be taken for syslog client logging facility implementation not to
interfere with other component's functionalities. Logging should be considered
best effort and not critical activity of each component. Syslog Handler
implementation is developed with taking into account this important constraint.

Each instance of `hat.syslog.handler.SyslogHandler` starts new
background thread responsible for sending syslog messages over TCP, UDP or
TCP+SSL socket. If connection with remote syslog server could not be
established or current connection is closed, new connect is called after 5
second timeout.

All log messages provided to Syslog Handler by
`hat.syslog.handler.SyslogHandler.emit` are queued in queue with
maximum size limited by configuration parameter. During new log message
registration, if queue is full, oldest messages are discarded and counter
of discarded messages is incremented. Once new log messages can be sent
to server, new log message containing information about number of discarded
messages will be sent.

For more information about Python logging, see `Python standard library`_.


API
---

Documentation is available as part of generated API reference:

    * `Python hat.syslog.handler module <py_api/hat/syslog/handler.html>`_


.. _logging.Handler: https://docs.python.org/3/library/logging.html#handler-objects
.. _Python standard library: https://docs.python.org/3/library/logging.html
