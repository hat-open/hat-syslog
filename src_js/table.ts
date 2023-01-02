import * as u from '@hat-open/util';
import r from '@hat-open/renderer';

import * as app from './app';
import * as common from './common';
import * as details from './details';
import * as dragger from './dragger';


export function getColumns(): common.Column[] {
    return r.get('local', 'table', 'columns') as common.Column[];
}


export function setColumnVisible(name: common.ColumnName, visible: boolean) {
    r.change(['local', 'table', 'columns'], u.map((column: common.Column) =>
        (column.name == name ?
            u.set('visible', visible, column) :
            column
        )
    ) as any);
}


export function moveColumn(name: common.ColumnName, index: number) {
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


export function resetLayout() {
    r.set(['local', 'table'], common.defaultTable);
}


export function tableVt(): u.VNode {
    const columns = getColumns();
    const entries = app.getEntries();
    const selectEntry = details.getSelectedEntry();

    return ['div.table',
        ['table',
            ['thead',
                ['tr',
                    columns.map(headerCellVt)
                ]
            ],
            ['tbody', {
                props: {
                    tabIndex: '0',
                },
                on: {
                    keydown: (evt: KeyboardEvent) => {
                        if (evt.key == 'ArrowDown') {
                            selectRelativeEntry(1);

                        } else if (evt.key == 'ArrowUp') {
                            selectRelativeEntry(-1);

                        } else if (evt.key == 'ArrowLeft') {
                            navigate('previous');

                        } else if (evt.key == 'ArrowRight') {
                            navigate('next');

                        } else if (evt.key == 'Enter') {
                            details.setVisible(true);

                        } else if (evt.key == 'Escape') {
                            details.setVisible(false);
                        }
                    }
                }},
                entries.map(entry => ['tr', {
                    class: {
                        error: entry.msg.severity == 'ERROR',
                        warning: entry.msg.severity == 'WARNING',
                        selected: (selectEntry != null && selectEntry.id == entry.id)
                    },
                    on: {
                        click: () => details.selectEntry(entry),
                        dblclick: () => details.setVisible(true)
                    }},
                    columns.map(column => bodyCellVt(entry, column))
                ])
            ]
        ]
    ];
}


function headerCellVt(column: common.Column): u.VNodeChild {
    if (!column.visible)
        return [];

    // TODO width in %

    return [`th.col-${column.name}`, {
        props: {
            style: `width: ${column.width}rem;`
        }},
        ['div',
            ['div.content', column.label],
            resizerVt(column)
        ]
    ];
}


function bodyCellVt(entry: common.Entry, column: common.Column): u.VNodeChild {
    if (!column.visible)
        return [];

    const value = u.get(column.path, entry);

    return [`td.col-${column.name}`,
        ['div',
            ['div.content', valueToString(column.type, value)],
            (column.name == 'timestamp' ? [
                ['span.filter.fa.fa-chevron-up', {
                    props: {
                        title: 'Set as timestamp from'
                    },
                    on: {
                        click: (evt: Event) => {
                            evt.stopPropagation();
                            app.setFilterValue('entry_timestamp_from', entry.timestamp);
                        }
                    }
                }],
                ['span.filter.fa.fa-chevron-down', {
                    props: {
                        title: 'Set as timestamp to'
                    },
                    on: {
                        click: (evt: Event) => {
                            evt.stopPropagation();
                            app.setFilterValue('entry_timestamp_to', entry.timestamp);
                        }
                    }
                }]
            ] : []),
            resizerVt(column)
        ]
    ];
}


function resizerVt(column: common.Column): u.VNode {
    return ['div.resizer', {
        on: {
            mousedown: dragger.mouseDownHandler(evt => {
                let el = evt.target as HTMLElement | null;
                while (el && el.tagName != 'TH' && el.tagName != 'TD')
                    el = el.parentNode as HTMLElement | null;
                if (!el)
                    return null;

                const initElWidth = el.clientWidth;
                const initColWidth = column.width;

                return (_, dx) => {
                    const newElWidth = initElWidth + dx;
                    const newColWidth = Math.max(
                        initColWidth * newElWidth / initElWidth,
                        column.minWidth
                    );

                    setColumnWidth(column.name, newColWidth);
                };
            })
        }
    }];
}


function valueToString(type: common.ColumnType, value: u.JData): string {
    if (type == 'string' && u.isString(value)) {
        return value;

    } else if (type == 'number' && u.isNumber(value)) {
        return String(value);

    } else if (type == 'timestamp' && u.isNumber(value)) {
        return u.timestampToLocalString(value);
    }

    return '';
}


function selectRelativeEntry(offset: number) {
    const selectEntry = details.getSelectedEntry();
    if (selectEntry == null)
        return;

    const entries = app.getEntries();
    const index = entries.findIndex(i => i.id == selectEntry.id);
    if (index == null)
        return;

    const newIndex = index + offset;
    if (newIndex < 0 || newIndex > entries.length - 1)
        return;

    details.selectEntry(entries[newIndex]);
}


function navigate(direction: app.Direction) {
    if (!app.canNavigate(direction))
        return;

    app.navigate(direction);
}


export function setColumnWidth(name: common.ColumnName, width: number) {
    r.change(['local', 'table', 'columns'], u.map((column: common.Column) =>
        (column.name == name ?
            u.set('width', width, column) :
            column
        )
    ) as any);
}



// function _tableVt() {
//     return ['div.table', {
//         ['table',
//             ['thead', ['tr',
//                 columns.map((column, columnIndex) => [
//                     ['th', {
//                         ['div.column-header', {
//                             class: {
//                                 dropzone: (table.getDraggedColumnName()
//                                     && !u.equals(table.getDraggedColumnName(), column.name))
//                             },
//                             on: {
//                                 dragend: () => table.stopColumnDrag(),
//                                 dragover: (ev) => ev.preventDefault(),
//                                 drop: () => table.columnDrop(column.name)
//                             }},
//                             ['div.label-container', {
//                                 props: {
//                                     draggable: true
//                                 },
//                                 on: {
//                                     dragstart: ev => {
//                                         ev.dataTransfer.setDragImage(ev.target.parentElement, 0, 0);
//                                         table.columnDragstart(column.name);
//                                     },
//                                 }},
//                                 ['label', column.label]
//                             ],
//                             (column.filterKey ?
//                                 (column.filterOptions ? ['select', {
//                                     on: {
//                                         change: ev => filter.setValue(
//                                             column.filterKey, JSON.parse(ev.target.value))
//                                     }},
//                                     u.concat([null], column.filterOptions).map(value => ['option', {
//                                         props: {
//                                             value: JSON.stringify(value),
//                                             label: value || '',
//                                             selected: value == `${filter.getValue(column.filterKey)}`
//                                         },
//                                     }])
//                                 ] : ['input', {
//                                     props: {
//                                         value: filter.getValue(column.filterKey) || '',
//                                     },
//                                     on: {
//                                         change: ev => filter.setValue(column.filterKey, ev.target.value),
//                                         mousedown: ev => {
//                                             ev.stopPropagation();
//                                             ev.target.blur();
//                                             ev.target.focus();
//                                         }
//                                     }
//                                 }]) : []
//                             )
//                         ]
//                     ],
//                 ])
//             ]],
//         ],
//     ];
// }




// export function columnDragstart(columnName) {
//     r.set([path, 'columnDrag'], u.pipe(
//         u.set('columnName', columnName)
//     )(state.defaultColumnDrag));
// }


// export function getDraggedColumnName() {
//     return r.get(path, 'columnDrag', 'columnName');
// }


// export function columnDrop(dropColumnName) {
//     if (u.equals(r.get(path, 'columnDrag'), state.defaultColumnDrag)) {
//         return;
//     }
//     r.change(u.pipe(
//         u.change([path, 'columns'], columns => {
//             let movedColumn = u.pipe(
//                 u.toPairs,
//                 u.find(([name, _]) => u.equals(name, r.get(path, 'columnDrag', 'columnName')))
//             )(columns);
//             if (u.equals(dropColumnName, movedColumn[0])) {
//                 return columns;
//             }
//             columns = u.omit(movedColumn[0], columns);

//             if (movedColumn[0] == columnsVisibleSorted().slice(-1)[0].name) {
//                 movedColumn = u.set(
//                     [1, 'width'],
//                     lastColumnExpanded() ?
//                         (window.innerWidth
//                             - (menu.isCollapsed() ? 0 : menu.getWidth())
//                             - (details.getSelectedEntry() && !details.isCollapsed() ? details.getWidth() : 0)
//                             - fixedColumnsWidth()) :
//                         movedColumn[1].minWidth,
//                     movedColumn);
//             } else if (dropColumnName == columnsVisibleSorted().slice(-1)[0].name) {
//                 columns = u.change(dropColumnName, dropColumn => u.set(
//                     'width',
//                     lastColumnExpanded() ?
//                         (window.innerWidth
//                             - (menu.isCollapsed() ? 0 : menu.getWidth())
//                             - (details.getSelectedEntry() && !details.isCollapsed() ? details.getWidth() : 0)
//                             - fixedColumnsWidth()) :
//                         dropColumn.minWidth,
//                     dropColumn
//                 ), columns);
//             }

//             let newIndex = u.toPairs(columns).findIndex(([name, _]) => u.equals(name, dropColumnName));
//             newIndex = newIndex + (newIndex >= movedColumn[1].position ? 1 : 0);
//             return u.pipe(
//                 u.toPairs,
//                 u.sortBy(([_, column]) => column.position),
//                 u.insert(newIndex, movedColumn),
//                 u.map(([name, column], index) => [name, u.set('position', index, column)]),
//                 u.fromPairs
//             )(columns);
//         }),
//     ));
// }
