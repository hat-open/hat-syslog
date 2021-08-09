import r from '@hat-open/renderer';
import * as u from '@hat-open/util';

import * as state from '../state';
import * as menu from './menu';
import * as details from './details';


const path = ['local', 'table'];
export const changeDefaultLayout = u.set(path, state.defaultTable);


export function getEntries() {
    return r.get('remote', 'entries');
}


export function columnsSorted() {
    return u.pipe(
        u.toPairs,
        u.sortBy(([_, column]) => column.position),
        u.map(([name, column]) => u.set('name', name, column)),
    )(r.get(path, 'columns'));
}


export function columnsVisibleSorted() {
    return u.filter(column => column.visible, columnsSorted());
}


export function isColumnVisible(name) {
    return r.get(path, 'columns', name, 'visible');
}


export function setColumnVisible(name, value) {
    r.set([path, 'columns', name, 'visible'], value);
}


export function startColumnResize(columnName, x) {
    r.set([path, 'columnResize'], u.pipe(
        u.set('columnName', columnName),
        u.set('xInitial', x),
        u.set('widthInitial', r.get([path, 'columns'], columnName, 'width'))
    )(state.defaultColumnResize));
}


export function stopColumnResize() {
    r.set([path, 'columnResize'], state.defaultColumnResize);
}


export function getColumnResize() {
    return r.get(path, 'columnResize');
}


function fixedColumnsWidth() {
    return columnsVisibleSorted().slice(0, -1).reduce((sum, column) => sum + column.width + 4, 0);
}


export function lastColumnExpanded() {
    const windowWidth = window.innerWidth;
    const menuWidth = menu.isCollapsed() ? 0 : menu.getWidth();
    const detailsWidth = details.getSelectedEntry() && !details.isCollapsed() ? details.getWidth() : 0;
    const tableWidth = fixedColumnsWidth();
    const relevantColumns = columnsVisibleSorted();
    const columnMinWidth = relevantColumns.slice(-1)[0].minWidth;
    return (tableWidth + columnMinWidth) < (windowWidth - menuWidth - detailsWidth);
}


export function updateColumnWidth(x) {
    const columnResize = getColumnResize();
    if (u.equals(columnResize, state.defaultColumnResize)) {
        return;
    }
    const dx = columnResize.xInitial - x;
    const columnPath = [[path, 'columns'], columnResize.columnName];
    r.set([columnPath, 'width'], Math.max(columnResize.widthInitial - dx, r.get(columnPath, 'minWidth')));
}


export function columnDragstart(columnName) {
    r.set([path, 'columnDrag'], u.pipe(
        u.set('columnName', columnName)
    )(state.defaultColumnDrag));
}


export function getDraggedColumnName() {
    return r.get(path, 'columnDrag', 'columnName');
}


export function columnDrop(dropColumnName) {
    if (u.equals(r.get(path, 'columnDrag'), state.defaultColumnDrag)) {
        return;
    }
    r.change(u.pipe(
        u.change([path, 'columns'], columns => {
            let movedColumn = u.pipe(
                u.toPairs,
                u.find(([name, _]) => u.equals(name, r.get(path, 'columnDrag', 'columnName')))
            )(columns);
            if (u.equals(dropColumnName, movedColumn[0])) {
                return columns;
            }
            columns = u.omit(movedColumn[0], columns);

            if (movedColumn[0] == columnsVisibleSorted().slice(-1)[0].name) {
                movedColumn = u.set(
                    [1, 'width'],
                    lastColumnExpanded() ?
                        (window.innerWidth
                            - (menu.isCollapsed() ? 0 : menu.getWidth())
                            - (details.getSelectedEntry() && !details.isCollapsed() ? details.getWidth() : 0)
                            - fixedColumnsWidth()) :
                        movedColumn[1].minWidth,
                    movedColumn);
            } else if (dropColumnName == columnsVisibleSorted().slice(-1)[0].name) {
                columns = u.change(dropColumnName, dropColumn => u.set(
                    'width',
                    lastColumnExpanded() ?
                        (window.innerWidth
                            - (menu.isCollapsed() ? 0 : menu.getWidth())
                            - (details.getSelectedEntry() && !details.isCollapsed() ? details.getWidth() : 0)
                            - fixedColumnsWidth()) :
                        dropColumn.minWidth,
                    dropColumn
                ), columns);
            }

            let newIndex = u.toPairs(columns).findIndex(([name, _]) => u.equals(name, dropColumnName));
            newIndex = newIndex + (newIndex >= movedColumn[1].position ? 1 : 0);
            return u.pipe(
                u.toPairs,
                u.sortBy(([_, column]) => column.position),
                u.insert(newIndex, movedColumn),
                u.map(([name, column], index) => [name, u.set('position', index, column)]),
                u.fromPairs
            )(columns);
        }),
    ));
}


export function stopColumnDrag() {
    r.set([path, 'columnDrag'], state.defaultColumnDrag);
}


export function getRowColors(entry) {
    const maxBrightness = 100;
    const brightness = entry == details.getSelectedEntry() ? 85 : maxBrightness;
    switch (entry.msg.severity) {
        case 'ERROR':
            return {
                background: '#FFCCCC',
                brightness: brightness
            };
        case 'WARNING':
            return {
                background: '#FFE6CC',
                brightness: brightness
            };
        default:
            return {
                background: 'white',
                brightness: brightness
            };
    }
}


export function getBorderHover() {
    return r.get(path, 'borderHover');
}


export function borderHoverStart(columnName) {
    r.set([path, 'borderHover'], columnName);
}


export function borderHoverStop() {
    r.set([path, 'borderHover'], null);
}
