Syslog Server
=============

Syslog Server is central concentrator for syslog messages. Additionally, it
provides web interface for real time monitoring and filtering of log messages.

Syslog listening socket can be configured as TCP, UDP or TCP+SSL socket.
Communication is based on `RFC 5425`_, `RFC 5426`_, `RFC 6587`_. Once message
is received, server stores message in predefined database.

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
can be run with ``hat-syslog-server`` script with additional command line
arguments:

    .. program-output:: python -m hat.syslog.server --help

This application is part of `hat-syslog` python package.


Configuration
-------------

Syslog Server configuration written in form of single YAML, JSON or TOML file
with structure defined by JSON Schema ``hat-syslog://server.yaml#`` (see
`JSON Schemas`_). Path to configuration file is provided as command line
argument during process startup. Additionally, configuration parameters
provided in configuration file can be overridden by command line arguments.
If configuration file could not be found, default values of configuration
parameters are used.

Example of configuration::

    ---
    type: syslog
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
based on `Juggler communication`_.

.. image:: img/syslog_server.png


Server state
''''''''''''

Server state is used for providing continuously updated list of log entries
to clients, based on applied filters.

State structure is defined by JSON schema
``hat-syslog://juggler.yaml#/definitions/state`` (see `JSON Schemas`_).


Request/response
''''''''''''''''

Juggler request/response communication is used for changing filter parameters.

Request data structures are defined by JSON schema
``hat-syslog://juggler.yaml#/definitions/request`` (see `JSON Schemas`_).

In case of successful request execution, response data is ``null``.



JSON Schemas
------------

Configuration
'''''''''''''

.. literalinclude:: ../schemas_json/server.yaml
    :language: yaml


Juggler
'''''''

.. literalinclude:: ../schemas_json/juggler.yaml
    :language: yaml


.. _RFC 5425: https://tools.ietf.org/html/rfc5425
.. _RFC 5426: https://tools.ietf.org/html/rfc5426
.. _RFC 6587: https://tools.ietf.org/html/rfc6587

.. _Juggler communication: https://hat-juggler.hat-open.com
