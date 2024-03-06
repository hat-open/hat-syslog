import * as u from '@hat-open/util';

import * as common from './common';


export function headerVt(): u.VNode {
    const state = common.getState();
    const frozen = state.remote != null && state.remote.filter.last_id != null;
    const live = state.local.filter.last_id == null;

    return ['div.header', {
        class: {
            frozen: frozen
        }},
        activeFiltersVt(),
        ['label.toggle',
            ['input', {
                props: {
                    type: 'checkbox',
                    checked: live
                },
                on: {
                    change: common.toggleLive
                }
            }],
            'Live'
        ],
        pageSizeVt(),
        navigationVt()
    ];
}


function activeFiltersVt(): u.VNodeChild {
    const activeFilters = Array.from(getActiveFilters());

    return [
        ['label.filters', (activeFilters.length > 0 ?
            'Active filters' :
            ''
        )],
        ['div.filters',
            activeFilters.map(({name, label, value}) => ['label.chip', {
                props: {
                    title: `${label}: ${value}`,
                }},
                `${label} `,
                ['button', {
                    on: {
                        click: () => common.setFilterValue(name, null)
                    }},
                    common.icon('window-close')
                ]
            ]),
            (activeFilters.length > 0 ?
                ['button.clear', {
                    props: {
                        title: 'Clear filters'
                    },
                    on: {
                        click: common.clearFilter
                    }},
                    common.icon('user-trash'),
                    ' Clear all'
                ] :
                []
            )
        ]
    ];
}


function pageSizeVt(): u.VNodeChild {
    const state = common.getState();
    const pageSize = String(state.local.filter.max_results);

    return [
        ['label', 'Page size'],
        ['select', {
            on: {
                change: (evt: Event) => common.setFilterValue(
                    'max_results',
                    u.strictParseInt((evt.target as HTMLInputElement).value)
                )
            }},
            ['20', '50', '100', '200'].map(value => ['option', {
                props: {
                    value: value,
                    label: value,
                    selected: value == pageSize
                }
            }])
        ]
    ];
}


function navigationVt(): u.VNodeChild {
    const state = common.getState();
    const pageLastIds = state.local.pageLastIds;
    const currentPage = (pageLastIds.length > 0 ? pageLastIds.length : 1);

    return [
        ['label', `Page ${currentPage}`],
        ['div.navigation',
            ([
                ['first', 'go-first'],
                ['previous', 'go-previous'],
                ['next', 'go-next']
            ] as const).map(([direction, icon]) => ['button', {
                props: {
                    disabled: !common.canNavigate(direction),
                    title: direction
                },
                on: {
                    click: () => common.navigate(direction)
                }},
                common.icon(icon)
            ])
        ]
    ];
}


function* getActiveFilters(): Generator<{
    name: keyof common.Filter,
    label: string,
    value: string
}> {
    const state = common.getState();
    if (!state.remote)
        return;

    const filter = state.remote.filter;

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
