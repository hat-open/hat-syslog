import r from '@hat-open/renderer';
import * as u from '@hat-open/util';


export function detailsVt(): u.VNodeChild {
    if (r.get('local', 'details', 'collapsed'))
        return [];


    return [];
}




function _detailsVt() {
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






const path = ['local', 'details'];
export const changeDefaultLayout = u.change(path, detailsState => u.pipe(
    u.set('collapsed', detailsState.collapsed),
    u.set('selected', detailsState.selected),
)(state.defaultDetails));

const snackbarQueuePath = [path, 'snackbarQueue'];


export function selectEntry(entryId) {
    r.set([path, 'selected'], entryId);
}


export function getSelectedEntry() {
    return r.get('remote', 'entries').find(
        entry => u.equals(entry.id, r.get(path, 'selected'))
    );
}


export function startResize(x) {
    r.set([path, 'resize'], u.pipe(
        u.set('xInitial', x),
        u.set('widthInitial', getWidth())
    )(state.defaultEntryDetailsResize));
}


export function stopResize() {
    r.set([path, 'resize'], state.defaultDetailsResize);
}


export function getResize() {
    return r.get(path, 'resize');
}


export function getWidth() {
    return r.get(path, 'width');
}


export function updateWidth(x) {
    const entryDetailsResize = getResize();
    if (u.equals(entryDetailsResize, state.defaultDetailsResize)) {
        return;
    }
    const dx = entryDetailsResize.xInitial - x;
    r.set([path, 'width'], Math.max(280, entryDetailsResize.widthInitial + dx));
}


export function isCollapsed() {
    return r.get(path, 'collapsed');
}


export function setCollapsed(v) {
    return r.set([path, 'collapsed'], v);
}


export function selectPreviousEntry() {
    r.change([path, 'selected'], oldId => {
        const newId = r.get(
            ['remote', 'entries', r.get('remote', 'entries').findIndex(entry => entry.id == oldId) + 1, 'id'],
        );
        return newId !== undefined ? newId : oldId;
    });
}


export function selectNextEntry() {
    r.change([path, 'selected'], oldId => {
        const newId = r.get(
            ['remote', 'entries', r.get('remote', 'entries').findIndex(entry => entry.id == oldId) - 1, 'id'],
        );
        return newId !== undefined ? newId : oldId;
    });
}


export function isRawDataCollapsed() {
    return r.get(path, 'rawDataCollapsed');
}


export function toggleRawDataCollapsed() {
    r.change([path, 'rawDataCollapsed'], v => !v);
}


export function selectedEntryStringified() {
    let entry = getSelectedEntry();
    u.set(['msg', 'data_raw'], entry.msg.data, entry);
    try {
        entry = u.pipe(
            u.change(['msg', 'data'], JSON.parse),
            u.change(['msg', 'data'], u.map(
                u.change('exc_info', excInfo => excInfo != '' ? excInfo.split('\n') : excInfo)
            ))
        )(entry);
    } catch(_) {
        entry = u.change(['msg', 'data'], data => data.split('\\n'), entry);
    }
    return JSON.stringify(entry, null, 2);
}


export function copy() {
    const navigator = window.navigator;
    const selectedEntry = getSelectedEntry();
    navigator.permissions.query({name: "clipboard-write"}).then(result => {
        if (result.state == "granted" || result.state == "prompt") {
            navigator.clipboard.writeText(selectedEntryStringified()).then(
                () => snackbarCb(`Copied entry ${selectedEntry.id}`),
                () => snackbarCb(`Couldn't copy entry ${selectedEntry.id}`)
            );
        }
    });
}


export function getSnackbars() {
    return r.get(snackbarQueuePath);
}


export function snackbarsExist() {
    return getSnackbars().length != 0;
}



