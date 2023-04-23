import * as u from '@hat-open/util';
import r from '@hat-open/renderer';

import * as common from './common';


export function tableVt(): u.VNode {
    const state = common.getState();

    const columns = state.local.table.columns;
    const entries = (state.remote ? state.remote.entries : [] as const);
    const selectedEntries = state.local.selectedEntries;
    const selectedEntryIds = selectedEntries.map(entry => entry.id);

    const tableWidth = columns.reduce<number>(
        (acc, i) => acc + (i.visible ? i.width : 0),
        0
    );

    return ['div.table',
        ['table',
            ['thead', {
                props: {
                    tabIndex: 1
                }},
                ['tr',
                    columns.map((column, index) =>
                        headerCellVt(tableWidth, column, index)
                    )
                ]
            ],
            ['tbody', {
                props: {
                    tabIndex: 1
                },
                on: {
                    keydown: (evt: KeyboardEvent) => {
                        if (evt.key == 'ArrowDown') {
                            selectRelativeEntries(1, evt.ctrlKey || evt.shiftKey);
                            evt.preventDefault();

                        } else if (evt.key == 'ArrowUp') {
                            selectRelativeEntries(-1, evt.ctrlKey || evt.shiftKey);
                            evt.preventDefault();

                        } else if (evt.key == 'PageDown') {
                            selectRelativeEntries(20, evt.ctrlKey || evt.shiftKey);
                            evt.preventDefault();

                        } else if (evt.key == 'PageUp') {
                            selectRelativeEntries(-20, evt.ctrlKey || evt.shiftKey);
                            evt.preventDefault();

                        } else if (evt.key == 'ArrowLeft') {
                            common.navigate('previous');
                            focusTableBody();

                        } else if (evt.key == 'ArrowRight') {
                            common.navigate('next');
                            focusTableBody();

                        } else if (evt.key == 'Enter') {
                            r.set(['local', 'details', 'visible'], true);

                        } else if (evt.key == 'Escape') {
                            r.set(['local', 'selectedEntries'], []);
                        }
                    }
                },
                hook: {
                    insert: (vnode: any) =>
                        vnode.elm.focus({preventScroll: true})
                }},
                entries.map(entry => [`tr#entry-${entry.id}`, {
                    class: {
                        error: entry.msg.severity == 'ERROR',
                        warning: entry.msg.severity == 'WARNING',
                        selected: u.contains(entry.id, selectedEntryIds)
                    },
                    props: {
                        tabIndex: 1
                    },
                    on: {
                        click: (evt: MouseEvent) => selectEntry(
                            entry,
                            evt.ctrlKey || evt.shiftKey
                        ),
                        dblclick: () => r.set(['local', 'details', 'visible'], true)
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
                common.moveColumn(name, index);
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
                            common.setFilterValue('entry_timestamp_from', entry.timestamp);
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
                            common.setFilterValue('entry_timestamp_to', entry.timestamp);
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
            mousedown: u.draggerMouseDownHandler(evt => {
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
    if (column.name == 'timestamp')
        return filterTimestampVt();

    if (column.filter == null)
        return [];

    if (column.filter == 'facility' || column.filter == 'severity')
        return filterSelectVt(column.filter);

    return filterTextVt(column.filter);
}


function filterTimestampVt(): u.VNode {
    const state = common.getState();
    const filter = state.local.filter;

    return ['div.timestamps',
        datetimePickerVt(
            'From',
            filter.entry_timestamp_from,
            common.setFilterValue('entry_timestamp_from')
        ),
        datetimePickerVt(
            'To',
            filter.entry_timestamp_to,
            common.setFilterValue('entry_timestamp_to')
        )
    ];
}


function filterSelectVt(key: 'facility' | 'severity'): u.VNode {
    const state = common.getState();
    const filter = state.local.filter;
    const value = filter[key] || '';

    let options: string[] = [];
    if (key == 'facility') {
        options = ['', ...common.facilities];
    } else if (key == 'severity') {
        options = ['', ...common.severities];
    }

    const changeCb = (evt: Event) => {
        const value = (evt.target as HTMLSelectElement).value;
        common.setFilterValue(key, (value.length > 0 ? value : null) as any);
    };

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


function filterTextVt(key: keyof common.Filter): u.VNode {
    const state = common.getState();
    const filter = state.local.filter;
    const value = filter[key] || '';

    const changeCb = (evt: Event) => {
        const value = (evt.target as HTMLInputElement).value;
        common.setFilterValue(key, (value.length > 0 ? value : null));
    };

    return ['input', {
        props: {
            type: 'text',
            value: value
        },
        on: {
            change: changeCb
        }
    }];
}


function datetimePickerVt(
    label: string, timestamp: number | null, cb: (timestamp: number | null) => void
): u.VNodeChild {
    return [
        ['label', label],
        ['input', {
            props: {
                type: 'datetime-local',
                value: timestampToValue(timestamp)
            },
            on: {
                change: (evt: Event) => cb(
                    timestampFromValue((evt.target as HTMLInputElement).value)
                )
            }
        }]
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


export function setColumnWidth(name: common.ColumnName, width: number) {
    r.change(['local', 'table', 'columns'], u.map((column: common.Column) =>
        (column.name == name ?
            u.set('width', width, column) :
            column
        )
    ) as any);
}


function getNextVisibleColumn(column: common.Column): common.Column | null {
    const state = common.getState();
    const columns = state.local.table.columns;
    let index = 0;

    while (index < columns.length && columns[index].name != column.name)
        index += 1;
    index += 1;

    while (index < columns.length && !columns[index].visible)
        index += 1;

    return (index < columns.length ? columns[index] : null);
}


function selectEntry(entry: common.Entry, multiple: boolean) {
    r.change(['local', 'selectedEntries'], ((entries: common.Entry[]) => {
        if (!multiple)
            return [entry];

        const index = entries.findIndex(i => i.id == entry.id);
        if (index < 0)
            return u.append(entry, entries);

        return u.omit(index, entries);
    }) as any);

    focusEntry(entry);
}


function selectRelativeEntries(offset: number, multiple: boolean) {
    if (offset == 0)
        return;

    r.change([], ((state: common.State) => {
        if (!state.remote)
            return u.set(['local', 'selectedEntries'], [], state);

        const entries = state.remote.entries;
        if (entries.length < 1)
            return u.set(['local', 'selectedEntries'], [], state);

        let lastIndex: number | null = null;
        for (const entry of state.local.selectedEntries) {
            const index = entries.findIndex(i => i.id == entry.id);
            if (index >= 0) {
                if (lastIndex == null ||
                        (offset > 0 && index > lastIndex) ||
                        (offset < 0 && index < lastIndex))
                    lastIndex = index;
            }
        }

        if (!multiple) {
            let index = (offset > 0 ? 0 : entries.length - 1);
            if (lastIndex != null)
                index = lastIndex + offset;
            if (index < 0)
                index = 0;
            if (index > entries.length - 1)
                index = entries.length - 1;
            const entry = entries[index];
            focusEntry(entry);
            return u.set(['local', 'selectedEntries'], [entry], state);
        }

        const indexes = [];
        if (lastIndex == null) {
            indexes.push(offset > 0 ? 0 : entries.length - 1);

        } else if (offset > 0) {
            for (let i = lastIndex + 1; i < entries.length && i <= lastIndex + offset; ++i) {
                indexes.push(i);
            }

        } else {
            for (let i = lastIndex - 1; i >= 0 && i >= lastIndex + offset; --i) {
                indexes.push(i);
            }
        }

        if (indexes.length < 1) {
            focusEntry(entries[lastIndex as number]);
            return state;
        }

        focusEntry(entries[indexes.at(-1) as number]);
        return u.set(
            ['local', 'selectedEntries'],
            state.local.selectedEntries.concat(
                indexes.map(index => entries[index])
            ),
            state
        );
    }) as any);
}


function focusEntry(entry: common.Entry) {
    const elm = document.getElementById(`entry-${entry.id}`);
    if (!elm)
        return;

    elm.focus();
}


function focusTableBody() {
    const theadElm = document.querySelector(
        'body > div.main > div.table > table > thead'
    ) as HTMLElement | null;
    if (theadElm)
        theadElm.focus();

    const tbodyElm = document.querySelector(
        'body > div.main > div.table > table > tbody'
    ) as HTMLElement | null;
    if (tbodyElm)
        tbodyElm.focus({preventScroll: true});
}


function timestampToValue(timestamp: number | null): string {
    if (timestamp == null)
        return '';

    const date = new Date(timestamp * 1000);
    const YYYY = String(date.getFullYear()).padStart(4, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const HH = String(date.getHours()).padStart(2, '0');
    const MM = String(date.getMinutes()).padStart(2, '0');
    return `${YYYY}-${mm}-${dd} ${HH}:${MM}`;
}


function timestampFromValue(value: string): number | null {
    if (value.length < 1)
        return null;

    const date = new Date(value);
    return date.getTime() / 1000;
}
