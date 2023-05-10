import * as juggler from '@hat-open/juggler';
import * as u from '@hat-open/util';
import r from '@hat-open/renderer';


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

export type ColumnType = 'string' | 'number' | 'timestamp';

export type Column = {
    name: ColumnName;
    type: ColumnType;
    label: string;
    path: u.JPath;
    filter: (keyof Filter) | null;
    visible: boolean;
    width: number;
};

export type Table = {
    columns: Column[];
};

export type Details = {
    visible: boolean;
    width: number;
};

export type LocalState = {
    menu: Menu;
    table: Table;
    details: Details;
    snackbars: string[];
    pageLastIds: number[];
    filter: Filter;
    selectedEntries: Entry[];
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

export type NavigateDirection = 'first' | 'previous' | 'next';


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
            type: 'number',
            label: 'ID',
            path: 'id',
            filter: null,
            visible: true,
            width: 4
        },
        {
            name: 'timestamp',
            type: 'timestamp',
            label: 'Timestamp',
            path: 'timestamp',
            filter: null,
            visible: true,
            width: 12
        },
        {
            name: 'facility',
            type: 'string',
            label: 'Facility',
            path: ['msg', 'facility'],
            filter: 'facility',
            visible: false,
            width: 5
        },
        {
            name: 'severity',
            type: 'string',
            label: 'Severity',
            path: ['msg', 'severity'],
            filter: 'severity',
            visible: true,
            width: 5
        },
        {
            name: 'version',
            type: 'number',
            label: 'Version',
            path: ['msg', 'version'],
            filter: null,
            visible: false,
            width: 5
        },
        {
            name: 'msg_timestamp',
            type: 'timestamp',
            label: 'Msg timestamp',
            path: ['msg', 'timestamp'],
            filter: null,
            visible: false,
            width: 15
        },
        {
            name: 'hostname',
            type: 'string',
            label: 'Hostname',
            path: ['msg', 'hostname'],
            filter: 'hostname',
            visible: false,
            width: 10
        },
        {
            name: 'app_name',
            type: 'string',
            label: 'App name',
            path: ['msg', 'app_name'],
            filter: 'app_name',
            visible: false,
            width: 10
        },
        {
            name: 'procid',
            type: 'string',
            label: 'Proc ID',
            path: ['msg', 'procid'],
            filter: 'procid',
            visible: false,
            width: 6
        },
        {
            name: 'msgid',
            type: 'string',
            label: 'Message ID',
            path: ['msg', 'msgid'],
            filter: 'msgid',
            visible: true,
            width: 10
        },
        {
            name: 'data',
            type: 'string',
            label: 'Data',
            path: ['msg', 'data'],
            filter: null,
            visible: false,
            width: 15
        },
        {
            name: 'msg',
            type: 'string',
            label: 'Message',
            path: ['msg', 'msg'],
            filter: 'msg',
            visible: true,
            width: 50
        }
    ]
};

export const defaultDetails: Details = {
    visible: true,
    width: 400
};

export const defaultLocalState: LocalState = {
    menu: defaultMenu,
    table: defaultTable,
    details: defaultDetails,
    snackbars: [],
    pageLastIds: [],
    filter: defaultFilter,
    selectedEntries: []
};

export const defaultState: State = {
    local: defaultLocalState,
    remote: null
};


export function isColumnName(name: unknown): name is ColumnName {
    return u.isString(name) && u.contains(name, columnNames as any);
}


export function getState(): State {
    return r.get() as State;
}


let app: juggler.Application;


export function init() {
    app = new juggler.Application('remote');
    (window as any).app = app;
}


export function toggleLive() {
    r.change([], state => {
        const live = u.get(['local', 'filter', 'last_id'], state) == null;
        const last_id = (live ?
            (u.get(['remote', 'last_id'], state) || 0) :
            null
        );
        const pageLastIds = (last_id == null ? [] : [last_id]);
        state = u.change('local', u.pipe(
            u.set(['filter', 'last_id'], last_id),
            u.set('pageLastIds', pageLastIds)
        ), state);
        const filter = u.get(['local', 'filter'], state) as Filter;
        setRemoteFilter(filter);
        return state;
    });
}


export function clearFilter() {
    r.change(['local', 'filter'], filter => {
        filter = u.pipe(
            u.set('max_results', u.get('max_results', filter)),
            u.set('last_id', u.get('last_id', filter)),
        )(defaultFilter);
        setRemoteFilter(filter as Filter);
        return filter;
    });
}


function _setFilterValue<Key extends keyof Filter>(
    name: Key,
    value: Filter[Key]
) {
    if (name == 'last_id')
        return;

    r.change(['local', 'filter'], filter => {
        filter = u.set(name, value as u.JData, filter);
        setRemoteFilter(filter as Filter);
        return filter;
    });
}


export const setFilterValue = u.curry(_setFilterValue) as {
    <Key extends keyof Filter>(): u.Curried2<Key, Filter[Key], void>;
    <Key extends keyof Filter>(name: Key): u.Curried1<Filter[Key], void>;
    <Key extends keyof Filter>(name: Key, value: Filter[Key]): void;
};


export function moveColumn(name: ColumnName, index: number) {
    return r.change(['local', 'table', 'columns'], columns => {
        if (!u.isArray(columns))
            return columns;

        if (index < 0 || index > columns.length - 1)
            return columns;

        const oldIndex = columns.findIndex(u.pipe(
            u.get('name'),
            u.equals(name)
        ));
        if (oldIndex == null || oldIndex == index)
            return columns;

        const column = u.get(oldIndex, columns);
        return u.pipe(
            u.omit(oldIndex) as any,
            u.insert<u.JData>(index, column)
        )(columns);
    });
}


export function canNavigate(direction: NavigateDirection): boolean {
    const localState = r.get('local') as LocalState;
    const remoteState = r.get('remote') as RemoteState;

    if (direction == 'next') {
        const max_results = remoteState.filter.max_results;
        if (max_results != null && remoteState.entries.length < max_results)
            return false;

        if (remoteState.first_id == null || remoteState.last_id == null)
            return false;

        const last_id = localState.filter.last_id;
        if (last_id != null && last_id <= remoteState.first_id)
            return false;

    } else if (localState.pageLastIds.length < 2) {
        return false;
    }

    return true;
}


export function navigate(direction: NavigateDirection) {
    if (!canNavigate(direction))
        return;

    r.change([], state => {
        let pageLastIds = u.get(['local', 'pageLastIds'], state) as number[];

        if (direction == 'first' && pageLastIds.length > 1) {
            pageLastIds = [pageLastIds[0]];

        } else if (direction == 'previous' && pageLastIds.length > 1) {
            pageLastIds = pageLastIds.slice(0, -1);

        } else if (direction == 'next') {
            if (pageLastIds.length < 1) {
                const last_id = u.get(['remote', 'last_id'], state) as number | null;
                pageLastIds = [last_id || 0];
            }
            const entries = u.get(['remote', 'entries'], state) as Entry[];
            if (entries.length > 0) {
                pageLastIds = [...pageLastIds, (entries.at(-1) as Entry).id];
            }
        }

        state = u.set(['local', 'pageLastIds'], pageLastIds, state);

        const last_id = pageLastIds.at(-1) as number;
        if (u.get(['local', 'filter', 'last_id'], state) != last_id) {
            state = u.set(['local', 'filter', 'last_id'], last_id, state);

            const filter = u.get(['local', 'filter'], state) as Filter;
            setRemoteFilter(filter);
        }

        return state;
    });
}


export function notify(text: string) {
    let root = document.querySelector('body > .notifications');
    if (!root) {
        root = document.createElement('div');
        root.className = 'notifications';
        document.body.appendChild(root);
    }

    const el = document.createElement('div');
    el.innerText = text;
    root.appendChild(el);

    setTimeout(() => {
        if (!root)
            return;
        root.removeChild(el);
    }, 1000);
}


async function setRemoteFilter(filter: Filter) {
    await app.send('filter', filter);
}
