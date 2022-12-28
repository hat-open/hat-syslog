import * as u from '@hat-open/util';

import * as app from './app';
import * as common from './common';
import * as menu from './menu';


export function headerVt(): u.VNode {
    return ['div.header', {
        class: {
            frozen: isFrozen(app.getRemoteFilter())
        }},
        menuButtonVt(),
        datetimePickersVt(),
        activeFiltersVt(),
        ['div.stretch'],
        navigationVt()
    ];
}


function menuButtonVt(): u.VNodeChild {
    if (menu.isVisible())
        return [];

    return ['button', {
        on: {
            click: () => menu.setVisible(true)
        }},
        ['span.fa.fa-cog']
    ];
}


function datetimePickersVt(): u.VNode {
    const filter = app.getLocalFilter();

    return ['div.datetime-pickers',
        ['label', 'Timestamp filters'],
        datetimePickerVt(
            'From',
            filter.entry_timestamp_from,
            app.setFilterValue('entry_timestamp_from')
        ),
        datetimePickerVt(
            'To',
            filter.entry_timestamp_to,
            app.setFilterValue('entry_timestamp_to')
        )
    ];
}


function datetimePickerVt(
    label: string, timestamp: number | null, cb: (timestamp: number | null) => void
): u.VNode {
    return ['div.datetime-picker',
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


function activeFiltersVt(): u.VNodeChild {
    const activeFilters = Array.from(getActiveFilters());
    if (activeFilters.length < 1)
        return [];

    return ['div.filters',
        ['label', 'Active filters:'],
        activeFilters.map(({name, label, value}) => ['div.chip.filter-item',
            ['label', {
                props: {
                    title: `${label}: ${value}`,
                }},
                label
            ],
            ['div.icon', {
                on: {
                    click: () => app.setFilterValue(name, null)
                }},
                ['span.fa-fa-times']
            ]
        ]),
        ['div.chip.clear-all', {
            on: {
                click: () => app.clearFilter()
            }},
            'Clear all'
        ]
    ];
}


function navigationVt(): u.VNode {
    const filter = app.getLocalFilter();

    return ['div.navigation',
        ['label.freeze',
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
            ' Live update',
        ],
        ['div.size',
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
        ['div.current', `Page ${app.getCurrentPage()}`],
        ([
            ['first', 'fa-angle-double-left'],
            ['previous', 'fa-angle-left'],
            ['next', 'fa-angle-right']
        ] as const).map(([direction, icon]) => ['button', {
            props: {
                disabled: !app.canNavigate(direction),
            },
            on: {
                click: () => app.navigate(direction)
            }},
            [`span.fa.${icon}`]
        ])
    ];
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
