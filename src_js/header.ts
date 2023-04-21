import * as u from '@hat-open/util';

import * as app from './app';
import * as common from './common';
import * as details from './details';
import * as menu from './menu';


export function headerVt(): u.VNode {
    const remoteFilter = app.getRemoteFilter();
    const isMenuVisible = menu.isVisible();
    const isDetailsVisible = details.isVisible()

    return ['div.header', {
        class: {
            frozen: isFrozen(remoteFilter)
        }},
        ['div.toggle', {
            on: {
                click: () => menu.setVisible(!isMenuVisible)
            }},
            ['label', 'Menu'],
            ['span.fa', {
                class: {
                    'fa-toggle-on': isMenuVisible,
                    'fa-toggle-off': !isMenuVisible
                },
                props: {
                    title: (isMenuVisible ? 'Hide menu' : 'Show menu')
                }
            }]
        ],
        activeFiltersVt(),
        ['div.spacer'],
        navigationVt(),
        ['div.toggle', {
            on: {
                click: () => details.setVisible(!isDetailsVisible)
            }},
            ['label', 'Details'],
            ['span.fa', {
                class: {
                    'fa-toggle-on': isDetailsVisible,
                    'fa-toggle-off': !isDetailsVisible
                },
                props: {
                    title: (isDetailsVisible ? 'Hide details' : 'Show details')
                }
            }]
        ]
    ];
}



function activeFiltersVt(): u.VNodeChild {
    const activeFilters = Array.from(getActiveFilters());
    if (activeFilters.length < 1)
        return [];

    return ['div.filters',
        ['label.title', 'Active filters'],
        ['div',
            activeFilters.map(({name, label, value}) => ['label.chip', {
                props: {
                    title: `${label}: ${value}`,
                }},
                label,
                ['span.fa.fa-times', {
                    on: {
                        click: () => app.setFilterValue(name, null)
                    }
                }]
            ]),
            ['button.clear', {
                props: {
                    title: 'Clear filters'
                },
                on: {
                    click: () => app.clearFilter()
                }},
                ['span.fa.fa-trash'],
                ' Clear all'
            ]
        ]
    ];
}


function navigationVt(): u.VNode {
    const filter = app.getLocalFilter();

    return ['div.navigation',
        ['label',
            ['input', {
                props: {
                    type: 'checkbox',
                    checked: !isFrozen(filter)
                },
                on: {
                    change: (evt: Event) => app.setFrozen(
                        !(evt.target as HTMLInputElement).checked
                    )
                }
            }],
            'Live',
        ],
        ['div.group',
            ['label', 'Page size'],
            ['select', {
                on: {
                    change: (evt: Event) => app.setFilterValue(
                        'max_results',
                        u.strictParseInt((evt.target as HTMLInputElement).value)
                    )
                }},
                ['20', '50', '100', '200'].map(value => ['option', {
                    props: {
                        value: value,
                        label: value,
                        selected: value == String(filter.max_results)
                    }
                }])
            ]
        ],
        ['div.group',
            ['label', `Page ${app.getCurrentPage()}`],
            ['div.buttons',
                ([
                    ['first', 'fa-angle-double-left'],
                    ['previous', 'fa-angle-left'],
                    ['next', 'fa-angle-right']
                ] as const).map(([direction, icon]) => ['button', {
                    props: {
                        disabled: !app.canNavigate(direction),
                        title: direction
                    },
                    on: {
                        click: () => app.navigate(direction)
                    }},
                    [`span.fa.${icon}`]
                ])
            ]
        ]
    ];
}


function* getActiveFilters(): Generator<{
    name: keyof common.Filter,
    label: string,
    value: string
}> {
    const filter = app.getRemoteFilter();

    for (const [name, label] of [
        ['entry_timestamp_from', 'From'],
        ['entry_timestamp_to', 'To']
    ] as const) {
        const value = filter[name];
        if (value)
            yield {
                name,
                label,
                value: u.timestampToLocalString(value)
            };
    }

    for (const [name, label] of [
        ['facility', 'Facility'],
        ['severity', 'Severity'],
        ['hostname', 'Hostname'],
        ['app_name', 'App name'],
        ['procid', 'Proc ID'],
        ['msgid', 'Msg ID'],
        ['msg', 'Msg']
    ] as const) {
        const value = filter[name];
        if (value)
            yield {name, label, value};
    }
}


function isFrozen(filter: common.Filter): boolean {
    return filter.last_id != null;
}
