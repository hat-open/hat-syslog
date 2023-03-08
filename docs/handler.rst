Syslog Handler
==============

Syslog Handler provides implementation of Python's standard library
`logging.Handler` interface. This implementation is part of `hat-syslog`
python package.

Care must be taken for syslog client logging facility implementation not to
interfere with other component's functionalities. Logging should be considered
best effort and not critical activity of each component.

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


Parameters
----------

During initialization, instance of Syslog Handler can be configured with
parameters:

    * `host`

        Remote host name or IP address.

    * `port`

        Remote TCP/UDP port.

    * `comm_type`

        Communication type (UDP, TCP, SSL).

    * `queue_size`

        Message queue size (default 1024).

    * `reconnect_delay`

        Delay in seconds before retrying connection with remote syslog server
        (default 5).


Implementation
--------------

Documentation is available as part of generated API reference:

    * `Python hat.syslog.handler module <py_api/hat/syslog/handler.html>`_
