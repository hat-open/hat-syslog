import * as u from '@hat-open/util';
import r from '@hat-open/renderer';

import * as common from './common';


export function menuVt(): u.VNodeChild {
    const state = common.getState();
    if (!state.local.menu.visible)
        return [];

    const filter = state.local.filter;
    const columns = state.local.table.columns;

    return ['div.menu',
        ['div.header',
            ['label', 'Settings'],
            ['button', {
                on: {
                    click: closeMenu
                }},
                common.icon('window-close')
            ]
        ],
        ['div.content',
            ['label.title', 'Columns'],
            ['div.columns', columns.map((column, index) => {
                const activeFilter = (column.filter ?
                    filter[column.filter] != null :
                    false
                );
                const title = (activeFilter && !column.visible ?
                    'Column not visible but is used as filter' :
                    ''
                );
                const canMoveDown = index < columns.length - 1;
                const canMoveUp = index > 0;

                return ['div',
                    ['label', {
                        class: {
                            warning: activeFilter && !column.visible
                        },
                        props: {
                            title: title
                        }},
                        ['input', {
                            props: {
                                type: 'checkbox',
                                checked: column.visible
                            },
                            on: {
                                change: (evt: Event) => r.set(
                                    ['local', 'table', 'columns', index, 'visible'],
                                    (evt.target as HTMLInputElement).checked
                                )
                            }
                        }],
                        column.label
                    ],
                    ['button.move', {
                        props: {
                            title: 'Move down',
                            disabled: !canMoveDown
                        },
                        on: {
                            click: () => (canMoveDown ?
                                common.moveColumn(column.name, index + 1) :
                                null
                            )
                        }},
                        common.icon('go-down')
                    ],
                    ['button.move', {
                        props: {
                            title: 'Move up',
                            disabled: !canMoveUp
                        },
                        on: {
                            click: () => (canMoveUp ?
                                common.moveColumn(column.name, index - 1) :
                                null
                            )
                        }},
                        common.icon('go-up')
                    ]
                ];
            })],
            ['button', {
                props: {
                    title: 'Clear layout'
                },
                on: {
                    click: resetLayout
                }},
                common.icon('view-refresh'),
                ' Reset layout'
            ]
        ]
    ];
}


function closeMenu() {
    r.set(['local', 'menu', 'visible'], false);
}


function resetLayout() {
    r.set(['local', 'table'], common.defaultTable);
}
