.. _syslog-server:

Syslog Server
=============

Syslog server is central concentration for syslog messages. Additionally, it
provides web interface for real time monitoring and filtering of log messages.

Syslog listening socket can be configured as TCP, UDP or TCP+SSL socket.
Communication is based on RFC 5425, RFC 5426, RFC 6587. Once message is
received, server stores message in predefined database.

.. warning::

    Current implementation of Syslog server doesn't support UDP communication

.. uml::

    skinparam linetype ortho

    folder Client {
        component SysLogHandler
    }

    folder "Syslog Server" {
        component SysLogServer
        component Backend
        component WebServer

        interface add
        interface query
        interface notify
    }

    folder Browser {
        component JS
        component GUI
    }

    database Sqlite

    interface syslog
    interface http
    interface websocket

    syslog - SysLogServer
    Backend -- Sqlite
    add - Backend
    Backend - query
    Backend - notify
    http - WebServer
    WebServer -- websocket

    SysLogHandler --> syslog
    SysLogServer -> add
    query <- WebServer
    notify -> WebServer

    http <-- Browser
    websocket <-> JS
    JS -> GUI


Running
-------

Syslog Server is implemented as python `hat.syslog.server` package which
can be run with ``hat-syslog`` script with additional command line
arguments:

    .. program-output:: python -m hat.syslog.server --help

This application is part of `hat-syslog` python package.


Configuration
-------------

Syslog Server configuration written in form of single YAML or JSON file with
structure defined by JSON Schema ``hat://syslog/server.yaml#``. Path to
configuration file is provided as command line argument during process startup.
Additionally, configuration parameters provided in configuration file can be
overridden by command line arguments. If configuration file could not be found,
default values of configuration parameters are used.

Example of configuration::

    ---
    log:
        version: 1
    syslog_addr: 'tcp://0.0.0.0:6514'
    ui_addr: 'http://0.0.0.0:23020'
    dp_path: 'syslog.db'
    db_low_size: 1_000_000
    db_high_size: 10_000_000
    db_enable_archive: false
    db_disable_journal: false
    ...


Data backend
------------

All incoming syslog messages are stored in single sqlite database. Maximum
number of syslog messages stored in this database can be configured by
configuration parameter ``db_high_size`` (value ``0`` represents unlimited
number of messages). Once number of messages exceed configured limit,
database cleanup procedure is triggered. During cleanup procedure, oldest
messages are removed from database until number of messages reaches
configuration parameter ``db_low_size`` when cleanup procedure stops. Prior
to message deletion, if configuration parameter ``db_enable_archive``
is set, new database with unique file name is created and all messages
scheduled for removal are inserted into newly created database. Archive
database has got same structure as original database and can be used in place
of original database for accessing archived syslog messages.


Web UI
------

Together with acquiring and storing syslog messages, Syslog Server provides
web-based user interface for querying messages from database and observing
changes in real time. Communication between web server and browser is
based on juggler communication.

Once juggler connection is established, server and client should change
initial `null` local state to theirs current valid value. Server's local state
is defined by ``#/definitions/server`` and client's local state is defined by
``#/definitions/client`` from JSON schema::

    "$schema": "http://json-schema.org/schema#"
    definitions:
        client:
            "$ref": "#/definitions/filter"
        server:
            type: object
            required:
                - filter
                - entries
                - first_id
                - last_id
            properties:
                filter:
                    "$ref": "#/definitions/filter"
                entries:
                    type: array
                    items:
                        "$ref": "#/definitions/entry"
                first_id:
                    type:
                        - 'null'
                        - integer
                last_id:
                    type:
                        - 'null'
                        - integer
        filter:
            type: object
            required:
                - max_results
                - last_id
                - entry_timestamp_from
                - entry_timestamp_to
                - facility
                - severity
                - hostname
                - app_name
                - procid
                - msgid
                - msg
            properties:
                max_results:
                    type:
                        - 'null'
                        - integer
                last_id:
                    type:
                        - 'null'
                        - integer
                entry_timestamp_from:
                    type:
                        - 'null'
                        - number
                entry_timestamp_to:
                    type:
                        - 'null'
                        - number
                facility:
                    oneOf:
                        - type: 'null'
                        - "$ref": "#/definitions/facility"
                severity:
                    oneOf:
                        - type: 'null'
                        - "$ref": "#/definitions/severity"
                hostname:
                    type:
                        - 'null'
                        - string
                app_name:
                    type:
                        - 'null'
                        - string
                procid:
                    type:
                        - 'null'
                        - string
                msgid:
                    type:
                        - 'null'
                        - string
                msg:
                    type:
                        - 'null'
                        - string
        entry:
            type: object
            required:
                - id
                - timestamp
                - msg
            properties:
                id:
                    type: integer
                timestamp:
                    type: number
                msg:
                    "$ref": "#/definitions/msg"
        msg:
            type: object
            required:
                - facility
                - severity
                - version
                - timestamp
                - hostname
                - app_name
                - procid
                - msgid
                - data
                - msg
            properties:
                facility:
                    oneOf:
                        - type: 'null'
                        - "$ref": "#/definitions/facility"
                severity:
                    oneOf:
                        - type: 'null'
                        - "$ref": "#/definitions/severity"
                version:
                    type: integer
                timestamp:
                    type:
                        - 'null'
                        - number
                hostname:
                    type:
                        - 'null'
                        - string
                app_name:
                    type:
                        - 'null'
                        - string
                procid:
                    type:
                        - 'null'
                        - string
                msgid:
                    type:
                        - 'null'
                        - string
                data:
                    type:
                        - 'null'
                        - string
                msg:
                    type:
                        - 'null'
                        - string
        facility:
            enum:
                - KERNEL
                - USER
                - MAIL
                - SYSTEM
                - AUTHORIZATION1
                - INTERNAL
                - PRINTER
                - NETWORK
                - UUCP
                - CLOCK1
                - AUTHORIZATION2
                - FTP
                - NTP
                - AUDIT
                - ALERT
                - CLOCK2
                - LOCAL0
                - LOCAL1
                - LOCAL2
                - LOCAL3
                - LOCAL4
                - LOCAL5
                - LOCAL6
                - LOCAL7
        severity:
            enum:
                - EMERGENCY
                - ALERT
                - CRITICAL
                - ERROR
                - WARNING
                - NOTICE
                - INFORMATIONAL
                - DEBUG

Juggler MESSAGE messages are not used in communication.

When server detected change of client's local data, it should update its
local data to match filter from client's local data.


Implementation
--------------

Documentation is available as part of generated API reference:

    * `Python hat.syslog.server module <py_api/hat/syslog/server.html>`_
