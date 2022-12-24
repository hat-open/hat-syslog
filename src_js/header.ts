import r from '@hat-open/renderer';
import * as u from '@hat-open/util';


export function headerVt(): u.VNodeChild {
    return [];
}






function _header() {
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
