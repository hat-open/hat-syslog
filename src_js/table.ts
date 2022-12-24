import r from '@hat-open/renderer';
import * as u from '@hat-open/util';


export function tableVt(): u.VNodeChild {
    return [];
}




function _tableVt() {
    const columns = table.columnsVisibleSorted();
    const entries = table.getEntries();
    const tableWidth = (window.innerWidth
        - (menu.isCollapsed() ? 0 : menu.getWidth())
        - (details.getSelectedEntry() && !details.isCollapsed() ? details.getWidth() : 0));
    return ['div.table', {
        props: {
            style: `width: ${tableWidth}px;`,
        }},
        // TABLE APPROACH
        ['table',
            ['thead', ['tr',
                columns.map((column, columnIndex) => [
                    ['th', {
                        props: {
                            style: (columnIndex != columns.length - 1 ?
                                `width: ${column.width}px` :
                                table.lastColumnExpanded() ? null : `width: ${column.minWidth}px`)
                        }},
                        ['div.column-header', {
                            class: {
                                dropzone: (table.getDraggedColumnName()
                                    && !u.equals(table.getDraggedColumnName(), column.name))
                            },
                            on: {
                                dragend: () => table.stopColumnDrag(),
                                dragover: (ev) => ev.preventDefault(),
                                drop: () => table.columnDrop(column.name)
                            }},
                            ['div.label-container', {
                                props: {
                                    draggable: true
                                },
                                on: {
                                    dragstart: ev => {
                                        ev.dataTransfer.setDragImage(ev.target.parentElement, 0, 0);
                                        table.columnDragstart(column.name);
                                    },
                                }},
                                ['label', column.label]
                            ],
                            (column.filterKey ?
                                (column.filterOptions ? ['select', {
                                    on: {
                                        change: ev => filter.setValue(
                                            column.filterKey, JSON.parse(ev.target.value))
                                    }},
                                    u.concat([null], column.filterOptions).map(value => ['option', {
                                        props: {
                                            value: JSON.stringify(value),
                                            label: value || '',
                                            selected: value == `${filter.getValue(column.filterKey)}`
                                        },
                                    }])
                                ] : ['input', {
                                    props: {
                                        value: filter.getValue(column.filterKey) || '',
                                    },
                                    on: {
                                        change: ev => filter.setValue(column.filterKey, ev.target.value),
                                        mousedown: ev => {
                                            ev.stopPropagation();
                                            ev.target.blur();
                                            ev.target.focus();
                                        }
                                    }
                                }]) : []
                            )
                        ]
                    ],
                    tableBorderVt('th', column.name)
                ])
            ]],
            ['tbody', {
                props: {
                    tabIndex: '0',
                },
                on: {
                    keydown: ev => {
                        const currentSelected = details.getSelectedEntry();
                        const tableRows = ev.target.children;
                        const selectedRowIndex = table.getEntries().findIndex(e => e == currentSelected);
                        if (currentSelected !== null) {
                            if (ev.key == 'ArrowDown') {
                                const rowElement = tableRows[selectedRowIndex + 1];
                                if (rowElement)
                                    rowElement.scrollIntoView({block: 'nearest'});
                                details.selectPreviousEntry();
                                ev.preventDefault();
                            } else if (ev.key == 'ArrowUp') {
                                const rowElement = tableRows[selectedRowIndex - 3];
                                if (rowElement)
                                    rowElement.scrollIntoView({block: 'nearest'});

                                // hack for first two rows and sticky table header
                                if (selectedRowIndex < 3)
                                    ev.target.parentElement.parentElement.scroll(0, 0);
                                details.selectNextEntry();
                                ev.preventDefault();
                            } else if (ev.key == 'Enter') {
                                details.setCollapsed(false);
                            } else if (ev.key == 'Escape') {
                                if (!details.isCollapsed())
                                    details.setCollapsed(true);
                            }
                        }
                        if (ev.key == 'ArrowLeft') {
                            filter.navigatePrevious();
                        } else if (ev.key == 'ArrowRight') {
                            filter.navigateNext();
                        }
                    }
                }},
                entries.map((entry, index) => ['tr', {
                    props: {
                        style: `background-color: ${table.getRowColors(entry, index).background};
                                filter: brightness(${table.getRowColors(entry, index).brightness}%);`
                    },
                    on: {
                        click: () => details.selectEntry(entry.id),
                        dblclick: () => details.setCollapsed(false)
                    }},
                    columns.map(column => [cellVt(entry, column), tableBorderVt('td', column.name)])
                ])
            ]
        ],
    ];
}



function tableBorderVt(tag, name) {
    return [`${tag}.border`, {
        class: {
            hover: [table.getBorderHover(), table.getColumnResize().columnName].includes(name)
        },
        on: {
            mousedown: (ev) => table.startColumnResize(name, ev.x),
            mouseenter: () => table.borderHoverStart(name),
            mouseleave: () => table.borderHoverStop(),
        }},
        ['div.line']
    ];
}


function columnResizeOverlay() {
    return (!u.equals(table.getColumnResize(), state.defaultColumnResize) ? ['div.mouseevent-overlay', {
        on: {
            mousemove: ev => table.updateColumnWidth(ev.x),
            mouseup: () => table.stopColumnResize()
        },
        props: {
            style: 'cursor: ew-resize'
        }}] : []);
}


function menuResizeOverlay() {
    return (!u.equals(menu.getResize(), state.defaultMenuResize) ? ['div.mouseevent-overlay', {
        on: {
            mousemove: ev => menu.updateWidth(ev.x),
            mouseup: () => menu.stopResize()
        },
        props: {
            style: 'cursor: ew-resize'
        }}] : []);
}


function entryDetailsResizeOverlay() {
    return (!u.equals(details.getResize(), state.defaultDetailsResize) ? ['div.mouseevent-overlay', {
        on: {
            mousemove: ev => details.updateWidth(ev.x),
            mouseup: () => details.stopResize()
        },
        props: {
            style: 'cursor: ew-resize'
        }}] : []);
}


function cellVt(entry, column) {
    const value = u.get(column.path, entry);

    let vt = [];

    if (column.name == 'timestamp') {
        vt = ['td.timestamp',
            datetime.utcTimestampToLocalString(value),
            ['div.cell-icons',
                ['span.icon', {
                    props: {
                        title: 'Set as timestamp from'
                    },
                    on: {
                        click: ev => {
                            ev.stopPropagation();
                            filter.setTimestampFrom(value);
                        }
                    }},
                    arrowSvg()
                ],
                ['span.icon', {
                    props: {
                        title: 'Set as timestamp to'
                    },
                    on: {
                        click: ev => {
                            ev.stopPropagation();
                            filter.setTimestampTo(value);
                        }
                    }},
                    arrowSvg(180)
                ],
            ]
        ];
    } else if (column.name == 'msg_timestamp') {
        vt = ['td', datetime.utcTimestampToLocalString(value)];
    } else if (column.name == 'data'){
        vt = ['td.json', `${value}`];
    } else if (['msg', 'app_name'].includes(column.name)) {
        vt = ['td.text-noncentered', `${value}`];
    } else {
        vt = ['td', `${value}`];
    }

    return vt;
}


function arrowSvg(angle) {
    return ['svg', {
        attrs: { width: 10, height: 12 }},
        ['g', {
            attrs: {
                transform: `rotate(${angle || 0} 5 6)`
            }},
            ['line', { attrs: { x1: 0, y1: 11, x2: 10, y2: 11, } }],
            ['line', { attrs: { x1: 5, y1: 0, x2: 5, y2: 10, } }],
            ['line', { attrs: { x1: 0, y1: 4, x2: 5, y2: 9, } }],
            ['line', { attrs: { x1: 10, y1: 4, x2: 5, y2: 9, } }],
        ]
    ];
}


function closeSvg(size) {
    return ['svg', { attrs: { width: size, height: size } },
        ['line', { attrs: { x1: 0, y1: 0, x2: size, y2: size, stroke: 'black' } }],
        ['line', { attrs: { x1: size, y1: 0, x2: 0, y2: size, stroke: 'black' } }]
    ];
}



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
