import r from '@hat-open/renderer';
import * as u from '@hat-open/util';

import * as datetime from './datetime';
import * as state from './state';
import * as table from './common/table';
import * as menu from './common/menu';
import * as details from './common/details';
import * as filter from './common/filter';


export function main() {
    if (!r.get('remote')) {
        return ['div#main'];
    }
    return ['div#main',
        columnResizeOverlay(),
        menuResizeOverlay(),
        entryDetailsResizeOverlay(),
        menu.isCollapsed() ? [] : menuVt(),
        tableVt(),
        header(),
        details.getSelectedEntry() ? detailsVt() : [],
        details.snackbarsExist() ? snackbarVt() : []
    ];
}


function header() {
    return ['div.header', {
        class: {
            frozen: filter.frozen()
        }},
        menu.isCollapsed() ? ['div.control-button', {
            class: {
                frozen: filter.frozen()
            },
            on: {
                click: () => menu.setCollapsed(false)
            }},
            ['span.fa.fa-cog']
        ] : [],
        ['div.datetime-pickers',
            ['div.title', 'Timestamp filters'],
            ['div.timestamps',
                ['label', 'From: '],
                datetime.pickerVt(
                    ['local', 'misc', 'datetimePickers', 'from'],
                    ['local', 'filter', 'entry_timestamp_from'],
                    timestamp => filter.setTimestampFrom(timestamp),
                    ''
                ),
                ['label', 'To: '],
                datetime.pickerVt(
                    ['local', 'misc', 'datetimePickers', 'to'],
                    ['local', 'filter', 'entry_timestamp_to'],
                    timestamp => filter.setTimestampTo(timestamp),
                    ''
                ),
            ]
        ],
        (filter.getActive().length > 0 ? ['div.filters',
            ['div.title', 'Active filters:'],
            filter.getActive().map(({key, label, value}) => ['div.chip.filter-item',
                ['label.value', {
                    props: {
                        title: `${label}: ${value}`,
                    }},
                    `${label}`],
                ['div.icon', {
                    on: {
                        click: () => filter.setValue(key, null)
                    }},
                    closeSvg(8)
                ]
            ]),
            (filter.getActive().length > 1 ? ['div.chip.clear-all', {
                on: {
                    click: () => filter.clearAllActive(),
                }},
                'Clear all'
            ] : [])
        ] : []),
        ['div.stretch'],
        (['div.navigation',
            ['div.labeled-controls',
                ['div.freeze-toggle',
                    ['input', {
                        props: {
                            type: 'checkbox',
                            checked: !filter.frozen()
                        },
                        on: {
                            change: ev => filter.setFreeze(!ev.target.checked)
                        }
                    }],
                    ['label', {
                        on: {
                            click: () => filter.setFreeze(!filter.frozen())
                        }},
                        'Live update'],
                ],
                ['div.size-select',
                    ['label', 'Page size'],
                    ['select', {
                        on: {
                            change: ev => filter.setPageSize(ev.target.value)
                        }},
                        ['20', '50', '100', '200'].map(value => ['option', {
                            props: {
                                value: value,
                                label: value,
                                selected: value == `${filter.getPageSize()}`
                            },
                        }])
                    ]
                ],
                ['div.page-counter', {
                    class: {
                        frozen: filter.frozen()
                    }},
                    ['label', `Page ${filter.getPageIndex() + 1}`]
                ],
            ],
            ((filter.getGlobalLast() === null && filter.getGlobalFirst() === null) ?  [] : ['div.buttons',
                ['div.navigation-button', {
                    class: {
                        disabled: filter.navigatePreviousDisabled(),
                    },
                    on: {
                        click: filter.navigatePreviousDisabled() ? ev => ev : () => filter.navigateFirst()
                    }},
                    ['span.fa.fa-angle-double-left']
                ],
                ['div.navigation-button', {
                    class: {
                        disabled: filter.navigatePreviousDisabled()
                    },
                    on: {
                        click: filter.navigatePreviousDisabled() ? ev => ev : () => filter.navigatePrevious()
                    }},
                    ['span.fa.fa-angle-left'],
                ],
                ['div.navigation-button', {
                    class: {
                        disabled: filter.navigateNextDisabled()
                    },
                    on: {
                        click: filter.navigateNextDisabled() ? ev => ev : () => filter.navigateNext()
                    }},
                    ['span.fa.fa-angle-right'],
                ],
            ])
        ]),
    ];
}


function menuVt() {
    return [
        ['div.menu-header',
            ['div.title',
                'Settings'
            ],
            ['div.control-button', {
                on: {
                    click: () => menu.setCollapsed(true)
                }},
                closeSvg(15)
            ],
        ],
        ['div.menu', {
            props: {
                style: `width: ${menu.getWidth()}px;`
            }},
            ['div.group',
                ['div.title', 'Columns'],
                ['div.column-options',
                    table.columnsSorted().map(({name, label, filterKey}) => ['div.item', {
                        props: {
                            draggable: true,
                            title: (menu.invisibleColumnHasFilter(name, filterKey) ?
                                'Column not visible but is used as filter' : '')
                        },
                        class: {
                            dropzone: table.getDraggedColumnName() && !u.equals(table.getDraggedColumnName(), name),
                            'not-visible-has-filter': menu.invisibleColumnHasFilter(name, filterKey)
                        },
                        on: {
                            click: () => table.setColumnVisible(name, !table.isColumnVisible(name)),
                            dragstart: () => table.columnDragstart(name),
                            dragend: () => table.stopColumnDrag(),
                            dragover: (ev) => ev.preventDefault(),
                            drop: () => table.columnDrop(name)
                        }},
                        ['input', {
                            props: {
                                type: 'checkbox',
                                checked: table.isColumnVisible(name)
                            },
                        }],
                        ['label', label]
                    ])
                ],
                ['button.reset-button', {
                    on: {
                        click: () => r.change(u.pipe(
                            menu.changeDefaultLayout,
                            table.changeDefaultLayout,
                            details.changeDefaultLayout
                        ))
                    }},
                    ['span.fa.fa-undo'],
                    ['label', ' Reset layout']
                ],
            ],
        ]
    ];
}


function tableVt() {
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


function detailsVt() {
    const selectedEntry = details.getSelectedEntry();
    let exception = null;
    let callLocation = null;
    let parsedData = null;
    if (selectedEntry) {
        try {
            parsedData = JSON.parse(selectedEntry.msg.data);
            const entryData = parsedData[Object.keys(parsedData)[0]];
            exception = entryData.exc_info;
            callLocation = {
                name: entryData.name,
                funcName: entryData.funcName,
                lineno: entryData.lineno
            };
        } catch(_) {
            // Don't set exception and call location
        }
    }
    return (details.isCollapsed() ? [] : ['div.details', {
        props: {
            style: `width: ${details.getWidth()}px;`
        }},
        ['div.border', {
            on: {
                mousedown: ev => details.startResize(ev.x)
            }
        }],
        ['div.entry-data',
            ['div.header',
                ['div.title',
                    `Entry ${selectedEntry.id}`
                ],
                ['div.stretch'],
                ['div.control-button', {
                    on: {
                        click: details.copy
                    },
                    props: {
                        title: 'Copy JSON entry',
                    }},
                    ['span.fa.fa-copy']
                ],
                ['div.control-button', {
                    props: {
                        title: 'Download JSON entry',
                    }},
                    ['a.fa.fa-download', {
                        props: {
                            href: `data:text/json;charset=utf-8,${details.selectedEntryStringified()}`,
                            download: `syslogEntry${selectedEntry.id}.json`
                        }
                    }]
                ],
                ['div.control-button', {
                    props: {
                        title: 'Close',
                    },
                    on: {
                        click: () => details.setCollapsed(true)
                    }},
                    closeSvg(15)
                ],
            ],
            ['div.content',
                ['div.label-row', 'Message:'],
                ['div.text', selectedEntry.msg.msg],
                (exception  ? [
                    ['div.label-row', 'Exception:'],
                    ['pre.text', exception],
                ] : []),
                ['div.key-value-pairs',
                    [
                        ['Timestamp:', datetime.utcTimestampToLocalString(selectedEntry.timestamp)],
                        ['Severity:', selectedEntry.msg.severity],
                        ['Location:', (callLocation ?
                            `${callLocation.name}.${callLocation.funcName}:${callLocation.lineno}` : null)],
                        ['Message timestamp:', datetime.utcTimestampToLocalString(selectedEntry.msg.timestamp)],
                        ['Hostname:', selectedEntry.msg.hostname],
                        ['App name:', selectedEntry.msg.app_name],
                        ['Proc ID:', selectedEntry.msg.procid],
                        ['Message ID:', selectedEntry.msg.msgid],
                        ['Facility:', selectedEntry.msg.facility],
                        ['Version:', selectedEntry.msg.version],
                    ].map(([label, value]) => (value !== null ? [
                        ['div.key', label],
                        ['div.value', {
                            props: {
                                title: value
                            }},
                            `${value}`
                        ]
                    ] : []))
                ],

                ['div.collapsible', {
                    on: {
                        click: () => details.toggleRawDataCollapsed()
                    }},
                    ['span.icon',
                        (details.isRawDataCollapsed() ? ['span.fa.fa-angle-right'] : ['span.fa.fa-angle-down'])
                    ],
                    ['span.title', 'Raw data']
                ],
                (details.isRawDataCollapsed() ? [] : ['pre.text',
                    JSON.stringify(parsedData, null, 2).replace(/\\n/g, '\n')
                ])
            ]
        ]
    ]);
}


function snackbarVt() {
    return ['div.snackbars',
        details.getSnackbars().map(text => ['div.snackbar', ['label', text]])
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
