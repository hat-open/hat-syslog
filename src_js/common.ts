import * as u from '@hat-open/util';


export type Facility = 'KERNEL' |
                       'USER' |
                       'MAIL' |
                       'SYSTEM' |
                       'AUTHORIZATION1' |
                       'INTERNAL' |
                       'PRINTER' |
                       'NETWORK' |
                       'UUCP' |
                       'CLOCK1' |
                       'AUTHORIZATION2' |
                       'FTP' |
                       'NTP' |
                       'AUDIT' |
                       'ALERT' |
                       'CLOCK2' |
                       'LOCAL0' |
                       'LOCAL1' |
                       'LOCAL2' |
                       'LOCAL3' |
                       'LOCAL4' |
                       'LOCAL5' |
                       'LOCAL6' |
                       'LOCAL7';

export type Severity = 'EMERGENCY' |
                       'ALERT' |
                       'CRITICAL' |
                       'ERROR' |
                       'WARNING' |
                       'NOTICE' |
                       'INFORMATIONAL' |
                       'DEBUG';

export type Filter = {
    max_results: number | null;
    last_id: number | null;
    entry_timestamp_from: number | null;
    entry_timestamp_to: number | null;
    facility: Facility | null;
    severity: Severity | null;
    hostname: string | null;
    app_name: string | null;
    procid: string | null;
    msgid: string | null;
    msg: string | null;
};

export type Msg = {
    facility: Facility | null;
    severity: Severity | null;
    version: number;
    timestamp: number | null;
    hostname: string | null;
    app_name: string | null;
    procid: string | null;
    msgid: string | null;
    data: string | null;
    msg: string | null;
};

export type Entry = {
    id: number;
    timestamp: number;
    msg: Msg;
};

export type Menu = {
    collapsed: boolean;
};

export type Column = {
    label: string;
    path: u.JPath;
    visible: boolean;
    position: number;
    minWidth: number;
    width: number;
};

export type Table = {
    columns: Record<string, Column>;
};

export type Details = {
    selected: Entry | null;
    collapsed: boolean;
    rawDataCollapsed: boolean;
};

export type LocalState = {
    menu: Menu;
    table: Table;
    details: Details;
    snackbars: string[];
    pageLastIds: number[];
    filter: Filter;
};

export type RemoteState = {
    filter: Filter;
    entries: Entry[];
    first_id: number | null;
    last_id: number | null;
};

export type State = {
    local: LocalState;
    remote: RemoteState | null;
}


export const facilities: Facility[] = [
    'KERNEL',
    'USER',
    'MAIL',
    'SYSTEM',
    'AUTHORIZATION1',
    'INTERNAL',
    'PRINTER',
    'NETWORK',
    'UUCP',
    'CLOCK1',
    'AUTHORIZATION2',
    'FTP',
    'NTP',
    'AUDIT',
    'ALERT',
    'CLOCK2',
    'LOCAL0',
    'LOCAL1',
    'LOCAL2',
    'LOCAL3',
    'LOCAL4',
    'LOCAL5',
    'LOCAL6',
    'LOCAL7'
];

export const severities: Severity[] = [
    'EMERGENCY',
    'ALERT',
    'CRITICAL',
    'ERROR',
    'WARNING',
    'NOTICE',
    'INFORMATIONAL',
    'DEBUG'
];

export const defaultFilter: Filter = {
    max_results: 50,
    last_id: null,
    entry_timestamp_from: null,
    entry_timestamp_to: null,
    facility: null,
    severity: null,
    hostname: null,
    app_name: null,
    procid: null,
    msgid: null,
    msg: null,
};

export const defaultMenu: Menu = {
    collapsed: true
};

export const defaultTable: Table = {
    columns: {
        id: {
            label: 'ID',
            path: 'id',
            visible: true,
            position: 0,
            minWidth: 10,
            width: 40
        },
        timestamp: {
            label: 'Timestamp',
            path: 'timestamp',
            visible: true,
            position: 1,
            minWidth: 65,
            width: 200
        },
        facility: {
            label: 'Facility',
            path: ['msg', 'facility'],
            visible: false,
            position: 2,
            minWidth: 50,
            width: 100
        },
        severity: {
            label: 'Severity',
            path: ['msg', 'severity'],
            visible: true,
            position: 3,
            minWidth: 50,
            width: 100
        },
        version: {
            label: 'Version',
            path: ['msg', 'version'],
            visible: false,
            position: 4,
            minWidth: 40,
            width: 50
        },
        msg_timestamp: {
            label: 'Message timestamp',
            path: ['msg', 'timestamp'],
            visible: false,
            position: 5,
            minWidth: 65,
            width: 200
        },
        hostname: {
            label: 'Hostname',
            path: ['msg', 'hostname'],
            visible: false,
            position: 6,
            minWidth: 60,
            width: 70
        },
        app_name: {
            label: 'App name',
            path: ['msg', 'app_name'],
            visible: false,
            position: 7,
            minWidth: 30,
            width: 70
        },
        procid: {
            label: 'Proc ID',
            path: ['msg', 'procid'],
            visible: false,
            position: 8,
            minWidth: 30,
            width: 70
        },
        msgid: {
            label: 'Message ID',
            path: ['msg', 'msgid'],
            visible: true,
            position: 9,
            minWidth: 50,
            width: 100
        },
        data: {
            label: 'Data',
            path: ['msg', 'data'],
            visible: false,
            position: 10,
            minWidth: 50,
            width: 390
        },
        msg: {
            label: 'Message',
            path: ['msg', 'msg'],
            visible: true,
            position: 11,
            minWidth: 50,
            width: 120
        }
    }
};

export const defaultDetails: Details = {
    selected: null,
    collapsed: true,
    rawDataCollapsed: true
};

export const defaultLocalState: LocalState = {
    menu: defaultMenu,
    table: defaultTable,
    details: defaultDetails,
    snackbars: [],
    pageLastIds: [],
    filter: defaultFilter,
};

export const defaultState: State = {
    local: defaultLocalState,
    remote: null
};
