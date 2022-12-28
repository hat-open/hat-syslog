import * as u from '@hat-open/util';


export const facilities = [
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
] as const;

export const severities = [
    'EMERGENCY',
    'ALERT',
    'CRITICAL',
    'ERROR',
    'WARNING',
    'NOTICE',
    'INFORMATIONAL',
    'DEBUG'
] as const;

export const columnNames = [
    'id',
    'timestamp',
    'facility',
    'severity',
    'version',
    'msg_timestamp',
    'hostname',
    'app_name',
    'procid',
    'msgid',
    'data',
    'msg',
] as const;


export type Facility = (typeof facilities)[number];

export type Severity = (typeof severities)[number];

export type ColumnName = (typeof columnNames)[number];

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
    visible: boolean;
};

export type Column = {
    name: ColumnName;
    label: string;
    path: u.JPath;
    filter: (keyof Filter) | null;
    visible: boolean;
    minWidth: number;
    width: number;
};

export type Table = {
    columns: Column[];
};

export type Details = {
    visible: boolean;
    selected: Entry | null;
    rawDataVisible: boolean;
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
    visible: false
};

export const defaultTable: Table = {
    columns: [
        {
            name: 'id',
            label: 'ID',
            path: 'id',
            filter: null,
            visible: true,
            minWidth: 10,
            width: 40
        },
        {
            name: 'timestamp',
            label: 'Timestamp',
            path: 'timestamp',
            filter: null,
            visible: true,
            minWidth: 65,
            width: 200
        },
        {
            name: 'facility',
            label: 'Facility',
            path: ['msg', 'facility'],
            filter: 'facility',
            visible: false,
            minWidth: 50,
            width: 100
        },
        {
            name: 'severity',
            label: 'Severity',
            path: ['msg', 'severity'],
            filter: 'severity',
            visible: true,
            minWidth: 50,
            width: 100
        },
        {
            name: 'version',
            label: 'Version',
            path: ['msg', 'version'],
            filter: null,
            visible: false,
            minWidth: 40,
            width: 50
        },
        {
            name: 'msg_timestamp',
            label: 'Msg timestamp',
            path: ['msg', 'timestamp'],
            filter: null,
            visible: false,
            minWidth: 65,
            width: 200
        },
        {
            name: 'hostname',
            label: 'Hostname',
            path: ['msg', 'hostname'],
            filter: 'hostname',
            visible: false,
            minWidth: 60,
            width: 70
        },
        {
            name: 'app_name',
            label: 'App name',
            path: ['msg', 'app_name'],
            filter: 'app_name',
            visible: false,
            minWidth: 30,
            width: 70
        },
        {
            name: 'procid',
            label: 'Proc ID',
            path: ['msg', 'procid'],
            filter: 'procid',
            visible: false,
            minWidth: 30,
            width: 70
        },
        {
            name: 'msgid',
            label: 'Message ID',
            path: ['msg', 'msgid'],
            filter: 'msgid',
            visible: true,
            minWidth: 50,
            width: 100
        },
        {
            name: 'data',
            label: 'Data',
            path: ['msg', 'data'],
            filter: null,
            visible: false,
            minWidth: 50,
            width: 390
        },
        {
            name: 'msg',
            label: 'Message',
            path: ['msg', 'msg'],
            filter: 'msg',
            visible: true,
            minWidth: 50,
            width: 120
        }
    ]
};

export const defaultDetails: Details = {
    visible: false,
    selected: null,
    rawDataVisible: false
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
