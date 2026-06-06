Syslog Server
=============

Syslog Server is central concentrator for syslog messages. Additionally, it
provides web user interface for real time monitoring and filtering of log
messages.

Server supportes multiple syslog listening TCP and/or UDP sockets.
Communication is based on `RFC 5425`_, `RFC 5426`_, `RFC 6587`_. Once message
is received, server stores message in predefined database.

.. image:: img/syslog_server.png


Running
-------

Syslog Server is implemented as python `hat.syslog.server` package which
can be run with ``hat-syslog-server`` script with additional command line
arguments:

    .. program-output:: python -m hat.syslog.server --help

This application is part of `hat-syslog` python package.


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


.. _RFC 5425: https://tools.ietf.org/html/rfc5425
.. _RFC 5426: https://tools.ietf.org/html/rfc5426
.. _RFC 6587: https://tools.ietf.org/html/rfc6587
