hat-syslog - Syslog server and logging handler
==============================================

This component is part of Hat Open project - open-source framework of tools and
libraries for developing applications used for remote monitoring, control and
management of intelligent electronic devices such as IoT devices, PLCs,
industrial automation or home automation systems.

Development of Hat Open and associated repositories is sponsored by
`Končar Digital <https://www.koncar.hr>`_.

For more information see:

    * hat-syslog documentation - `<https://hat-syslog.hat-open.com>`_
    * hat-syslog git repository - `<https://github.com/hat-open/hat-syslog.git>`_
    * Hat Open homepage - `<https://hat-open.com>`_

.. warning::

    This project is currently in state of active development. Features,
    functionality and API are unstable.


About
-----

Real time reporting of execution state is mandatory functionality for most of
Hat's components implementing continuously running service. Primary way
of logging is based on Syslog logging protocol as defined by:

    * `RFC 5425 <https://tools.ietf.org/html/rfc5425>`_
    * `RFC 5426 <https://tools.ietf.org/html/rfc5426>`_
    * `RFC 6587 <https://tools.ietf.org/html/rfc6587>`_

Each component which reports log messages should implement Syslog TCP client.
In this way, all logging messages can be aggregated in a single Syslog
concentrator which can provide archiving, searching and real time monitoring
functionalities.

Care must be taken for Syslog TCP client logging facility implementation not to
interfere with other component's functionalities. Logging should be considered
best effort and not critical activity of each component.


Install
-------

::

    $ pip install hat-syslog


License
-------

Copyright 2020-2022 Hat Open AUTHORS

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
