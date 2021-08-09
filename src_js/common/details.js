import r from '@hat-open/renderer';
import * as u from '@hat-open/util';

import * as state from '../state';


const path = ['local', 'details'];
export const changeDefaultLayout = u.change(path, detailsState => u.pipe(
    u.set('collapsed', detailsState.collapsed),
    u.set('selected', detailsState.selected),
)(state.defaultDetails));

const snackbarQueuePath = [path, 'snackbarQueue'];


export function selectEntry(entryId) {
    r.set([path, 'selected'], entryId);
}


export function getSelectedEntry() {
    return r.get('remote', 'entries').find(
        entry => u.equals(entry.id, r.get(path, 'selected'))
    );
}


export function startResize(x) {
    r.set([path, 'resize'], u.pipe(
        u.set('xInitial', x),
        u.set('widthInitial', getWidth())
    )(state.defaultEntryDetailsResize));
}


export function stopResize() {
    r.set([path, 'resize'], state.defaultDetailsResize);
}


export function getResize() {
    return r.get(path, 'resize');
}


export function getWidth() {
    return r.get(path, 'width');
}


export function updateWidth(x) {
    const entryDetailsResize = getResize();
    if (u.equals(entryDetailsResize, state.defaultDetailsResize)) {
        return;
    }
    const dx = entryDetailsResize.xInitial - x;
    r.set([path, 'width'], Math.max(280, entryDetailsResize.widthInitial + dx));
}


export function isCollapsed() {
    return r.get(path, 'collapsed');
}


export function setCollapsed(v) {
    return r.set([path, 'collapsed'], v);
}


export function selectPreviousEntry() {
    r.change([path, 'selected'], oldId => {
        const newId = r.get(
            ['remote', 'entries', r.get('remote', 'entries').findIndex(entry => entry.id == oldId) + 1, 'id'],
        );
        return newId !== undefined ? newId : oldId;
    });
}


export function selectNextEntry() {
    r.change([path, 'selected'], oldId => {
        const newId = r.get(
            ['remote', 'entries', r.get('remote', 'entries').findIndex(entry => entry.id == oldId) - 1, 'id'],
        );
        return newId !== undefined ? newId : oldId;
    });
}


export function isRawDataCollapsed() {
    return r.get(path, 'rawDataCollapsed');
}


export function toggleRawDataCollapsed() {
    r.change([path, 'rawDataCollapsed'], v => !v);
}


export function selectedEntryStringified() {
    let entry = getSelectedEntry();
    u.set(['msg', 'data_raw'], entry.msg.data, entry);
    try {
        entry = u.pipe(
            u.change(['msg', 'data'], JSON.parse),
            u.change(['msg', 'data'], u.map(
                u.change('exc_info', excInfo => excInfo != '' ? excInfo.split('\n') : excInfo)
            ))
        )(entry);
    } catch(_) {
        entry = u.change(['msg', 'data'], data => data.split('\\n'), entry);
    }
    return JSON.stringify(entry, null, 2);
}


export function copy() {
    const navigator = window.navigator;
    const selectedEntry = getSelectedEntry();
    navigator.permissions.query({name: "clipboard-write"}).then(result => {
        if (result.state == "granted" || result.state == "prompt") {
            navigator.clipboard.writeText(selectedEntryStringified()).then(
                () => snackbarCb(`Copied entry ${selectedEntry.id}`),
                () => snackbarCb(`Couldn't copy entry ${selectedEntry.id}`)
            );
        }
    });
}


export function getSnackbars() {
    return r.get(snackbarQueuePath);
}


export function snackbarsExist() {
    return getSnackbars().length != 0;
}


function snackbarCb(text) {
    r.change(
        snackbarQueuePath,
        queue => u.concat([text], queue)
    ).then(() => setTimeout(() => r.change(
        snackbarQueuePath,
        queue => u.omit(queue.length - 1, queue)
    ), 1000));
}
