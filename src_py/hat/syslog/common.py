"""Common syslog functionality and data structures"""

from pathlib import Path
import datetime
import enum
import re
import typing

from hat import json


package_path: Path = Path(__file__).parent
"""Package file system path"""

json_schema_repo: json.SchemaRepository = json.SchemaRepository(
    json.json_schema_repo,
    json.SchemaRepository.from_json(package_path / 'json_schema_repo.json'))
"""JSON schema repository"""


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
    timestamp: typing.Optional[float]
    hostname: typing.Optional[str]
    app_name: typing.Optional[str]
    procid: typing.Optional[str]
    msgid: typing.Optional[str]
    data: typing.Optional[str]
    msg: typing.Optional[str]


def msg_to_str(msg: Msg) -> str:
    """Create string representation of message according to RFC 5424"""
    buff = [
        f'<{msg.facility.value * 8 + msg.severity.value}>{msg.version}',
        _timestamp_to_str(msg.timestamp),
        msg.hostname if msg.hostname else '-',
        msg.app_name if msg.app_name else '-',
        msg.procid if msg.procid else '-',
        msg.msgid if msg.msgid else '-',
        _data_to_str(msg.data)]
    if msg.msg:
        buff.append('BOM' + msg.msg)
    return ' '.join(buff)


def msg_from_str(msg_str: str) -> Msg:
    """Parse message string formatted according to RFC 5424"""
    match = _msg_pattern.fullmatch(msg_str).groupdict()
    prival = int(match['prival'])
    return Msg(
        facility=Facility(prival // 8),
        severity=Severity(prival % 8),
        version=int(match['version']),
        timestamp=_parse_timestamp(match['timestamp']),
        hostname=None if match['hostname'] == '-' else match['hostname'],
        app_name=None if match['app_name'] == '-' else match['app_name'],
        procid=None if match['procid'] == '-' else match['procid'],
        msgid=None if match['msgid'] == '-' else match['msgid'],
        data=_parse_data(match['data']),
        msg=(match['msg'][3:] if match['msg'] and match['msg'][:3] == 'BOM'
             else match['msg']))


def msg_to_json(msg: Msg) -> json.Data:
    """Convert message to json serializable data"""
    return {'facility': msg.facility.name,
            'severity': msg.severity.name,
            'version': msg.version,
            'timestamp': msg.timestamp,
            'hostname': msg.hostname,
            'app_name': msg.app_name,
            'procid': msg.procid,
            'msgid': msg.msgid,
            'data': msg.data,
            'msg': msg.msg}


def msg_from_json(data: json.Data) -> Msg:
    """Convert json serializable data to message"""
    return Msg(facility=Facility[data['facility']],
               severity=Severity[data['severity']],
               version=data['version'],
               timestamp=data['timestamp'],
               hostname=data['hostname'],
               app_name=data['app_name'],
               procid=data['procid'],
               msgid=data['msgid'],
               data=data['data'],
               msg=data['msg'])


_msg_pattern = re.compile(r'''
    < (?P<prival> \d+) >
    (?P<version> \d+)
    \ (?P<timestamp> - |
                     [^ ]+)
    \ (?P<hostname> - |
                    [^ ]+)
    \ (?P<app_name> - |
                    [^ ]+)
    \ (?P<procid> - |
                  [^ ]+)
    \ (?P<msgid> - |
                 [^ ]+)
    \ (?P<data> - |
                (\[
                    ((\\(\\\\)*\]) |
                     [^\]])*
                \])+)
    (\ (?P<msg> .*))?
''', re.X | re.DOTALL)

_timestamp_pattern = re.compile(r'''
    (?P<year> \d{4})
    -
    (?P<month> \d{2})
    -
    (?P<day> \d{2})
    T
    (?P<hour> \d{2})
    :
    (?P<minute> \d{2})
    :
    (?P<second> \d{2})
    (\. (?P<fraction> \d+))?
    ((?P<tz_utc> Z) |
     ((?P<tz_sign> \+ |
                   -)
      (?P<tz_hour> \d{2})
      :
      (?P<tz_minute> \d{2})))
''', re.X | re.DOTALL)

_data_pattern = re.compile(r'''
    \[
        (?P<id> [^ \]]+)
        (?P<param> ((\\(\\\\)*\]) |
                   [^\]])*)
    \]
    (?P<rest> .*)
''', re.X | re.DOTALL)

_param_pattern = re.compile(r'''
    \ (?P<name> [^=\]]+)
    ="
    (?P<value> ((\\\\) |
                (\\") |
                (\\\]) |
                [^"\]\\])*)
    "
    (?P<rest> .*)
''', re.X | re.DOTALL)

_escape_pattern = re.compile(r'''((\\\\)|(\\")|(\\]))''')


def _timestamp_to_str(timestamp):
    if not timestamp:
        return '-'
    return datetime.datetime.fromtimestamp(
        timestamp, datetime.timezone.utc).replace(
        tzinfo=None).isoformat() + 'Z'


def _data_to_str(data_json):
    data = json.decode(data_json) if data_json else None
    if not data:
        return '-'
    return ''.join(f'[{sd_id}{_param_to_str(param)}]'
                   for sd_id, param in data.items())


def _param_to_str(param):
    if not param:
        return ''
    return ' ' + ' '.join(f'{k}="{_escape_value(v)}"'
                          for k, v in param.items())


def _parse_timestamp(timestamp_str):
    if timestamp_str == '-':
        return
    match = _timestamp_pattern.fullmatch(timestamp_str).groupdict()
    return datetime.datetime(
        year=int(match['year']),
        month=int(match['month']),
        day=int(match['day']),
        hour=int(match['hour']),
        minute=int(match['minute']),
        second=int(match['second']),
        microsecond=(int(int(match['fraction']) *
                         pow(10, 6 - len(match['fraction'])))
                     if match['fraction'] else None),
        tzinfo=(datetime.timezone.utc if match['tz_utc'] else
                datetime.timezone(datetime.timedelta(
                    hours=((1 if match['tz_sign'] == '+' else -1) *
                           int(match['tz_hour'])),
                    minutes=int(match['tz_hour']))))).timestamp()


def _parse_data(data_str):
    if data_str == '-':
        return
    data = {}
    while data_str:
        match = _data_pattern.fullmatch(data_str).groupdict()
        data[match['id']] = _parse_param(match['param'])
        data_str = match['rest']
    data_json = json.encode(data)
    return data_json


def _parse_param(param_str):
    param = {}
    while param_str:
        match = _param_pattern.fullmatch(param_str).groupdict()
        param[match['name']] = _unescape_value(match['value'])
        param_str = match['rest']
    return param


def _escape_value(value):
    return value.replace('\\', '\\\\').replace('"', '\\"').replace(']', '\\]')


def _unescape_value(value):
    return re.sub(_escape_pattern, _unescape_value_char, value)


def _unescape_value_char(match):
    return {r'\\': '\\',
            r'\"': r'"',
            r'\]': r']'}[match.group(0)]
