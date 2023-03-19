Developer documentation
=======================

.. uml::

    skinparam linetype ortho

    folder Client {
        component SyslogHandler
    }

    folder "Syslog Server" {
        component SyslogServer
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

    syslog - SyslogServer
    Backend -- Sqlite
    add - Backend
    Backend - query
    Backend - notify
    http - WebServer
    WebServer -- websocket

    SyslogHandler --> syslog
    SyslogServer -> add
    query <- WebServer
    notify -> WebServer

    http <-- Browser
    websocket <-> JS
    JS -> GUI


Web UI backend/frontend communication
-------------------------------------

Communication between web server and browser is based on
`Juggler communication`_.


Server state
''''''''''''

Server state is used for providing continuously updated list of log entries
to clients, based on applied filters.

State structure is defined by JSON schema
``hat-syslog://juggler.yaml#/definitions/state`` (see `Juggler JSON Schemas`_).


Request/response
''''''''''''''''

Juggler request/response communication is used for changing filter parameters.

Request data structures are defined by JSON schema
``hat-syslog://juggler.yaml#/definitions/request`` (see
`Juggler JSON Schemas`_).

In case of successful request execution, response data is ``null``.


Juggler JSON Schemas
''''''''''''''''''''

.. literalinclude:: ../schemas_json/juggler.yaml
    :language: yaml


.. _Juggler communication: https://hat-juggler.hat-open.com
