import * as u from '@hat-open/util';
import r from '@hat-open/renderer';

import * as app from './app';
import * as table from './table';


export function isVisible(): boolean {
    return Boolean(r.get('local', 'menu', 'visible'));
}


export function setVisible(visible: boolean) {
    r.set(['local', 'menu', 'visible'], visible);
}


export function menuVt(): u.VNodeChild {
    if (!isVisible())
        return [];

    const filter = app.getLocalFilter();
    const columns = table.getColumns();

    return ['div.menu',
        ['div.header',
            ['label', 'Columns'],
            ['button', {
                on: {
                    click: () => setVisible(false)
                }},
                ['span.fa.fa-times']
            ]
        ],
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
                            change: (evt: Event) => table.setColumnVisible(
                                column.name, (evt.target as HTMLInputElement).checked
                            )
                        }
                    }],
                    column.label
                ],
                ['span.fa.fa-arrow-down', {
                    class : {
                        disabled: !canMoveDown
                    },
                    props: {
                        title: 'Move down'
                    },
                    on: {
                        click: () => (canMoveDown ?
                            table.moveColumn(column.name, index + 1) :
                            null
                        )
                    }
                }],
                ['span.fa.fa-arrow-up', {
                    class : {
                        disabled: !canMoveUp
                    },
                    props: {
                        title: 'Move up'
                    },
                    on: {
                        click: () => (canMoveUp ?
                            table.moveColumn(column.name, index - 1) :
                            null
                        )
                    }
                }]
            ];
        })],
        ['button', {
            props: {
                title: 'Clear layout'
            },
            on: {
                click: table.resetLayout
            }},
            ['span.fa.fa-undo'],
            ' Reset layout'
        ]
    ];
}
