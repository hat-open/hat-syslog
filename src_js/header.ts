import * as u from '@hat-open/util';
import r from '@hat-open/renderer';

import * as common from './common';


export function headerVt(): u.VNode {
    const state = common.getState();
    const frozen = state.remote != null && state.remote.filter.last_id != null;
    const live = state.local.filter.last_id == null;
    const menuVisible = state.local.menu.visible;
    const detailsVisible = state.local.details.visible;

    return ['div.header', {
        class: {
            frozen: frozen
        }},
        toggleVt('Menu', menuVisible, toggleMenu),
        activeFiltersVt(),
        toggleVt('Live', live, common.toggleLive),
        pageSizeVt(),
        navigationVt(),
        toggleVt('Details', detailsVisible, toggleDetails)
    ];
}


function toggleVt(label: string, value: boolean, changeCb: () => void): u.VNodeChild {
    return [
        ['label', label],
        ['div.toggle', {
            on: {
                click: changeCb
            }},
            ['span.fa', {
                class: {
                    'fa-toggle-on': value,
                    'fa-toggle-off': !value
                }
            }]
        ]
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
                label,
                ['span.fa.fa-times', {
                    on: {
                        click: () => common.setFilterValue(name, null)
                    }
                }]
            ]),
            (activeFilters.length > 0 ?
                ['button.clear', {
                    props: {
                        title: 'Clear filters'
                    },
                    on: {
                        click: common.clearFilter
                    }},
                    ['span.fa.fa-trash'],
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
                ['first', 'fa-angle-double-left'],
                ['previous', 'fa-angle-left'],
                ['next', 'fa-angle-right']
            ] as const).map(([direction, icon]) => ['button', {
                props: {
                    disabled: !common.canNavigate(direction),
                    title: direction
                },
                on: {
                    click: () => common.navigate(direction)
                }},
                [`span.fa.${icon}`]
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


function toggleMenu() {
    r.change(['local', 'menu', 'visible'], u.not);
}


function toggleDetails() {
    r.change(['local', 'details', 'visible'], u.not);
}
