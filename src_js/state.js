import * as u from '@hat-open/util';

import * as datetime from './datetime';


export const defaultFilter = {
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


const facilityOptions = [
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
    'LOCAL7',
];


const severityOptions = [
    'EMERGENCY',
    'ALERT',
    'CRITICAL',
    'ERROR',
    'WARNING',
    'NOTICE',
    'INFORMATIONAL',
    'DEBUG',
];


export const defaultMenuResize = {
    xInitial: null,
    widthInitial: null
};


export const defaultMenu = {
    resize: defaultMenuResize,
    collapsed: true,
    width: 200
};


export const defaultColumnResize = {
    columnName: null,
    xInitial: null,
    widthInitial: null
};


export const defaultColumnDrag = {
    columnName: null
};


const column = {
    label: null,
    path: null,
    visible: false,
    width: 150,
    minWidth: 90,
    position: null,
    filterKey: null,
    filterOptions: null,
};


export const defaultTable = {
    columnResize: defaultColumnResize,
    columnDrag: defaultColumnDrag,
    borderHover: null,
    columns: {
        id: u.merge(column, {
            label: 'ID',
            path: 'id',
            visible: true,
            position: 0,
            minWidth: 10,
            width: 40,
        }),
        timestamp: u.merge(column, {
            label: 'Timestamp',
            path: 'timestamp',
            visible: true,
            position: 1,
            minWidth: 65,
            width: 200
        }),
        facility: u.merge(column, {
            label: 'Facility',
            path: ['msg', 'facility'],
            filterKey: 'facility',
            filterOptions: facilityOptions,
            position: 2
        }),
        severity: u.merge(column, {
            label: 'Severity',
            path: ['msg', 'severity'],
            filterKey: 'severity',
            filterOptions: severityOptions,
            visible: true,
            position: 3,
            minWidth: 45
        }),
        version: u.merge(column, {
            label: 'Version',
            path: ['msg', 'version'],
            position: 4,
            minWidth: 40,
            width: 50
        }),
        msg_timestamp: u.merge(column, {
            label: 'Message timestamp',
            path: ['msg', 'timestamp'],
            position: 5,
            minWidth: 65
        }),
        hostname: u.merge(column, {
            label: 'Hostname',
            path: ['msg', 'hostname'],
            filterKey: 'hostname',
            position: 6,
            minWidth: 60,
            width: 70
        }),
        app_name: u.merge(column, {
            label: 'App name',
            path: ['msg', 'app_name'],
            filterKey: 'app_name',
            position: 7,
            minWidth: 30
        }),
        procid: u.merge(column, {
            label: 'Proc ID',
            path: ['msg', 'procid'],
            filterKey: 'procid',
            position: 8,
            minWidth: 30
        }),
        msgid: u.merge(column, {
            label: 'Message ID',
            path: ['msg', 'msgid'],
            filterKey: 'msgid',
            visible: true,
            position: 9,
            minWidth: 50,
        }),
        data: u.merge(column, {
            label: 'Data',
            path: ['msg', 'data'],
            position: 10,
            width: 390
        }),
        msg: u.merge(column, {
            label: 'Message',
            path: ['msg', 'msg'],
            filterKey: 'msg',
            visible: true,
            position: 11,
            width: 120
        }),
    }
};


export const defaultDetailsResize = {
    xInitial: null,
    widthInitial: null
};


export const defaultDetails = {
    selected: null,
    resize: defaultDetailsResize,
    width: 400,
    collapsed: true,
    rawDataCollapsed: true,
    snackbarQueue: []
};


export const main = {
    local: {
        menu: defaultMenu,
        table: defaultTable,
        details: defaultDetails,
        datetimePickers: {
            from: datetime.pickerState,
            to: datetime.pickerState
        },
        pageLastIds: null,
        filter: defaultFilter,
    },
    remote: null
};
