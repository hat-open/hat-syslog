"""Common syslog data structures"""

import enum
import typing


class CommType(enum.Enum):
    """Syslog communication type"""
    UDP = 0
    TCP = 1
    TLS = 2


class Facility(enum.Enum):
    KERNEL = 0
    USER = 1
    MAIL = 2
    SYSTEM = 3
    AUTHORIZATION1 = 4
    INTERNAL = 5
    PRINTER = 6
    NETWORK = 7
    UUCP = 8
    CLOCK1 = 9
    AUTHORIZATION2 = 10
    FTP = 11
    NTP = 12
    AUDIT = 13
    ALERT = 14
    CLOCK2 = 15
    LOCAL0 = 16
    LOCAL1 = 17
    LOCAL2 = 18
    LOCAL3 = 19
    LOCAL4 = 20
    LOCAL5 = 21
    LOCAL6 = 22
    LOCAL7 = 23


class Severity(enum.Enum):
    EMERGENCY = 0
    ALERT = 1
    CRITICAL = 2
    ERROR = 3
    WARNING = 4
    NOTICE = 5
    INFORMATIONAL = 6
    DEBUG = 7


class Msg(typing.NamedTuple):
    """Message

    `data` containes JSON serialized Dict[str, Dict[str, str]]

    """
    facility: Facility
    severity: Severity
    version: int
    timestamp: float | None
    hostname: str | None
    app_name: str | None
    procid: str | None
    msgid: str | None
    data: str | None
    msg: str | None
