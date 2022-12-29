import * as juggler from '@hat-open/juggler';
import * as u from '@hat-open/util';
import r from '@hat-open/renderer';

import * as common from './common';


let app: juggler.Application;


export function init() {
    app = new juggler.Application('remote');
    (window as any).app = app;
}


export function setFrozen(frozen: boolean) {
    r.change([], state => {
        const last_id = (frozen ?
            (u.get(['remote', 'last_id'], state) || 0) :
            null
        );
        const pageLastIds = (last_id == null ? [] : [last_id]);
        state = u.change('local', u.pipe(
            u.set(['filter', 'last_id'], last_id),
            u.set('pageLastIds', pageLastIds)
        ), state);
        const filter = u.get(['local', 'filter'], state) as common.Filter;
        setRemoteFilter(filter);
        return state;
    });
}


export function clearFilter() {
    r.change(['local', 'filter'], filter => {
        filter = u.pipe(
            u.set('max_results', u.get('max_results', filter)),
            u.set('last_id', u.get('last_id', filter)),
        )(common.defaultFilter);
        setRemoteFilter(filter as common.Filter);
        return filter;
    });
}


function _setFilterValue<Key extends keyof common.Filter>(
    name: Key,
    value: common.Filter[Key]
) {
    if (name == 'last_id')
        return;

    r.change(['local', 'filter'], filter => {
        filter = u.set(name, value as u.JData, filter);
        setRemoteFilter(filter as common.Filter);
        return filter;
    });
}


export const setFilterValue = u.curry(_setFilterValue) as {
    <Key extends keyof common.Filter>(): u.Curried2<Key, common.Filter[Key], void>;
    <Key extends keyof common.Filter>(name: Key): u.Curried1<common.Filter[Key], void>;
    <Key extends keyof common.Filter>(name: Key, value: common.Filter[Key]): void;
};


export function getLocalFilter(): common.Filter {
    return r.get('local', 'filter') as common.Filter;
}


export function getRemoteFilter(): common.Filter {
    return r.get('remote', 'filter') as common.Filter;
}


export function getEntries(): common.Entry[] {
    return r.get('remote', 'entries') as common.Entry[];
}


export function getNextEntry(entry: common.Entry): common.Entry | null {
    const entries = r.get('remote', 'entries');
    if (!u.isArray(entries))
        return null;

    const index = entries.findIndex(u.pipe(
        u.get('id'),
        u.equals(entry.id)
    ));
    if (index < 0)
        return null;

    return r.get('remote', 'entries', index + 1) as common.Entry | null;
}


export function getPreviousEntry(entry: common.Entry): common.Entry | null {
    const entries = r.get('remote', 'entries');
    if (!u.isArray(entries))
        return null;

    const index = entries.findIndex(u.pipe(
        u.get('id'),
        u.equals(entry.id)
    ));
    if (index < 1)
        return null;

    return r.get('remote', 'entries', index - 1) as common.Entry | null;
}


export function getCurrentPage(): number {
    const pageLastIds = r.get('local', 'pageLastIds') as number[];
    return (pageLastIds.length > 0 ? pageLastIds.length : 1);
}


export type Direction = 'first' | 'previous' | 'next';


export function canNavigate(direction: Direction): boolean {
    const localState = r.get('local') as common.LocalState;
    const remoteState = r.get('remote') as common.RemoteState;

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


export function navigate(direction: Direction) {
    r.change([], state => {
        let pageLastIds = u.get(['local', 'pageLastIds'], state) as number[];

        if (direction == 'first' && pageLastIds.length > 1) {
            pageLastIds = [pageLastIds[0]];

        } else if (direction == 'previous' && pageLastIds.length > 1) {
            pageLastIds = pageLastIds.slice(0, -1);

        } else if (direction == 'next') {
            if (pageLastIds.length < 1) {
                const first_id = u.get(['remote', 'first_id'], state) as number | null;
                pageLastIds = [first_id || 0];
            }
            const entries = u.get(['remote', 'entries'], state) as common.Entry[];
            if (entries.length > 0) {
                pageLastIds = [...pageLastIds, (entries.at(-1) as common.Entry).id];
            }
        }

        state = u.set(['local', 'pageLastIds'], pageLastIds, state);

        const last_id = pageLastIds.at(-1) as number;
        if (u.get(['local', 'filter', 'last_id'], state) != last_id) {
            state = u.set(['local', 'filter', 'last_id'], last_id, state);

            const filter = u.get(['local', 'filter'], state) as common.Filter;
            setRemoteFilter(filter);
        }

        return state;
    });
}


async function setRemoteFilter(filter: common.Filter) {
    await app.send('filter', filter);
}
