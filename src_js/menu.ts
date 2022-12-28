import r from '@hat-open/renderer';
import * as u from '@hat-open/util';

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
                        disabled: index >= columns.length - 1
                    },
                    on: {
                        click: () => (index >= columns.length - 1 ?
                            table.moveColumn(column.name, 1) :
                            null
                        )
                    }
                }],
                ['span.fa.fa-arrow-up', {
                    class : {
                        disabled: index < 1
                    },
                    on: {
                        click: () => (index < 1 ?
                            table.moveColumn(column.name, -1) :
                            null
                        )
                    }
                }]
            ];
        })],
        ['button', {
            on: {
                click: table.resetLayout
            }},
            ['span.fa.fa-undo'],
            ' Reset layout'
        ]
    ];
}
