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

    const tableWidth = columns.reduce<number>(
        (acc, i) => acc + (i.visible ? i.width : 0),
        0
    );

    return ['div.table',
        ['table',
            ['thead',
                ['tr',
                    columns.map((column, index) =>
                        headerCellVt(tableWidth, column, index)
                    )
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


function headerCellVt(tableWidth: number, column: common.Column, index: number): u.VNodeChild {
    if (!column.visible)
        return [];

    const width = Math.max(100 * column.width / tableWidth, 1);

    return [`th.col-${column.name}`, {
        props: {
            style: `width: ${width}%;`
        },
        on: {
            dragover: (evt: DragEvent) => {
                evt.preventDefault();
                if (evt.dataTransfer == null)
                    return;
                evt.dataTransfer.dropEffect = 'move';
            },
            drop: (evt: DragEvent) => {
                evt.preventDefault();
                if (evt.dataTransfer == null)
                    return;
                const name = evt.dataTransfer.getData('text/plain');
                if (!common.isColumnName(name))
                    return;
                moveColumn(name, index);
            }
        }},
        ['div',
            ['div.content',
                ['label', {
                    props: {
                        draggable: true
                    },
                    on: {
                        dragstart: (evt: DragEvent) => {
                            if (evt.dataTransfer == null)
                                return;
                            evt.dataTransfer.setData('text/plain', column.name);
                            evt.dataTransfer.dropEffect = 'move';
                        }
                    }},
                    column.label
                ],
                filterVt(column)
            ],
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


function resizerVt(column: common.Column): u.VNodeChild {
    const nextColumn = getNextVisibleColumn(column);

    if (!nextColumn)
        return [];

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
                const initNextColWidth = nextColumn.width;

                return (_, dx) => {
                    const newElWidth = initElWidth + dx;

                    let newColWidth = Math.max(
                        initColWidth * newElWidth / initElWidth,
                        1
                    );
                    let newNextColWidth = initNextColWidth + initColWidth - newColWidth;
                    if (newNextColWidth <= 1) {
                        newNextColWidth = 1;
                        newColWidth = initColWidth + initNextColWidth - newNextColWidth;
                    }

                    setColumnWidth(column.name, newColWidth);
                    setColumnWidth(nextColumn.name, newNextColWidth);
                };
            })
        }
    }];
}


function filterVt(column: common.Column): u.VNodeChild {
    if (column.filter == null)
        return [];

    const localFilter = app.getLocalFilter();
    const value = localFilter[column.filter] || '';

    let options: string[] | null = null;
    if (column.name == 'facility') {
        options = ['', ...common.facilities];
    } else if (column.name == 'severity') {
        options = ['', ...common.severities];
    }

    const changeCb = (evt: Event) => {
        if (column.filter == null)
            return;
        const value = (evt.target as HTMLInputElement | HTMLSelectElement).value;
        app.setFilterValue(column.filter, (value.length > 0 ? value : null));
    };

    if (options == null)
        return ['input', {
            props: {
                type: 'text',
                value: value
            },
            on: {
                change: changeCb
            }
        }];

    return ['select', {
        on: {
            change: changeCb
        }},
        options.map(option => ['option', {
            props: {
                value: option,
                selected: option == value
            }},
            option
        ])
    ];
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


function getNextVisibleColumn(column: common.Column): common.Column | null {
    const columns = getColumns();
    let index = 0;

    while (index < columns.length && columns[index].name != column.name)
        index += 1;
    index += 1;

    while (index < columns.length && !columns[index].visible)
        index += 1;

    return (index < columns.length ? columns[index] : null);
}
