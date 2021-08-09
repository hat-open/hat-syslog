import r from '@hat-open/renderer';
import * as u from '@hat-open/util';

import * as state from '../state';
import * as table from './table';
import * as filter from './filter';


const path = ['local', 'menu'];
export const changeDefaultLayout = u.identity;


export function isCollapsed() {
    return r.get(path, 'collapsed');
}


export function setCollapsed(value) {
    r.set([path, 'collapsed'], value);
}


export function getWidth() {
    return r.get(path, 'width');
}


export function startResize(x) {
    r.set([path, 'resize'], u.pipe(
        u.set('xInitial', x),
        u.set('widthInitial', r.get(path, 'width')),
    )(state.defaultMenuResize));
}


export function stopResize() {
    r.set([path, 'resize'], state.defaultMenuResize);
}


export function getResize() {
    return r.get(path, 'resize');
}


export function updateWidth(x) {
    const menuResize = getResize();
    if (u.equals(menuResize, state.defaultMenuResize)) {
        return;
    }
    const dx = menuResize.xInitial - x;
    r.set([path, 'width'], Math.max(menuResize.widthInitial + dx, 120));
}


export function invisibleColumnHasFilter(columnName, filterKey) {
    let filterValue = null;
    if (columnName == 'timestamp') {
        filterValue = filter.getValue('entry_timestamp_from') || filter.getValue('entry_timestamp_to');
    } else {
        filterValue = filter.getValue(filterKey);
    }
    return !table.isColumnVisible(columnName) && filterValue !== null && filterValue !== undefined;
}
