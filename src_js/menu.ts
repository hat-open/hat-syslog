import r from '@hat-open/renderer';
import * as u from '@hat-open/util';


export function menuVt(): u.VNodeChild {
    if (r.get('local', 'menu', 'collapsed'))
        return [];


    return [];
}





function _menuVt() {
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



const path = ['local', 'menu'];
export const changeDefaultLayout = u.identity;


export function isCollapsed() {
    return r.get(path, 'collapsed');
}


export function setCollapsed(value) {
    r.set([path, 'collapsed'], value);
}


export function getWidth() {
    return r.get(path, 'width');
}


export function startResize(x) {
    r.set([path, 'resize'], u.pipe(
        u.set('xInitial', x),
        u.set('widthInitial', r.get(path, 'width')),
    )(state.defaultMenuResize));
}


export function stopResize() {
    r.set([path, 'resize'], state.defaultMenuResize);
}


export function getResize() {
    return r.get(path, 'resize');
}


export function updateWidth(x) {
    const menuResize = getResize();
    if (u.equals(menuResize, state.defaultMenuResize)) {
        return;
    }
    const dx = menuResize.xInitial - x;
    r.set([path, 'width'], Math.max(menuResize.widthInitial + dx, 120));
}


export function invisibleColumnHasFilter(columnName, filterKey) {
    let filterValue = null;
    if (columnName == 'timestamp') {
        filterValue = filter.getValue('entry_timestamp_from') || filter.getValue('entry_timestamp_to');
    } else {
        filterValue = filter.getValue(filterKey);
    }
    return !table.isColumnVisible(columnName) && filterValue !== null && filterValue !== undefined;
}
