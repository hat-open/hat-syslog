import * as u from '@hat-open/util';
import r from '@hat-open/renderer';

import * as common from './common.js';


export function detailsVt(): u.VNodeChild {
    const state = common.getState();
    const visible = state.local.details.visible;

    return visible ? visibleVt() : hiddenVt();
}


function hiddenVt(): u.VNode {
    return ['div.details.hidden',
        ['button', {
            props: {
                title: 'Show details',
            },
            on: {
                click: openDetails
            }},
            common.icon('dialog-information'),
            ' Details'
        ]
    ];
}


function visibleVt(): u.VNodeChild {
    const state = common.getState();
    const width = state.local.details.width;

    return [
        ['div.details-resizer', {
            on: {
                mousedown: u.draggerMouseDownHandler(evt => {
                    const parent = (evt.target as HTMLElement).parentNode;
                    if (!parent)
                        return null;

                    const el = parent.querySelector('.details') as HTMLElement | null;
                    if (!el)
                        return null;

                    const width = el.clientWidth;
                    return (_, dx) => {
                        r.set(['local', 'details', 'width'], width - dx);
                    };
                })
            }
        }],
        ['div.details.visible', {
            props: {
                style: `width: ${width}px`
            }},
            headerVt(),
            contentVt()
        ]
    ];
}


function headerVt(): u.VNode {
    const state = common.getState();
    const entries = state.local.selectedEntries;

    return ['div.header',
        ['label',
            common.icon('dialog-information'),
            ' Details'
        ],
        ['button', {
            props: {
                title: 'Copy JSON entry',
                disabled: entries.length < 1
            },
            on: {
                click: copy
            }},
            common.icon('edit-copy')
        ],
        ['button', {
            props: {
                title: 'Download JSON entry',
                disabled: entries.length < 1
            },
            on: {
                click: download
            }},
            common.icon('browser-download')
        ],
        ['button', {
            props: {
                title: 'Close'
            },
            on: {
                click: closeDetails
            }},
            common.icon('window-close')
        ]
    ];
}


function contentVt(): u.VNode {
    const state = common.getState();
    const entries = state.local.selectedEntries;

    return ['div.content', entries.map(entry => {
        const data = (entry.msg.data ? decodeJson(entry.msg.data) : null);
        const hatLocation = getHatLocation(u.get('hat@1', data));
        const hatExcInfo = u.get(['hat@1', 'exc_info'], data);
        const hatMeta = u.get(['hat@1', 'meta'], data);

        return [
            ['label.wide.title', `Entry ${entry.id}`],
            ['label.wide', 'Message:'],
            ['div.wide', entry.msg.msg || ''],
            (hatExcInfo  ? [
                ['label.wide', 'Exception:'],
                ['pre.wide', String(hatExcInfo)],
            ] : []),
            (hatMeta  ? [
                ['label.wide', 'Meta:'],
                ['pre.wide', JSON.stringify(decodeJson(String(hatMeta)), null, 2)],
            ] : []),
            [
                ['Timestamp', u.timestampToLocalString(entry.timestamp)],
                ['Severity', entry.msg.severity],
                ['Location', hatLocation],
                ['Msg time', (entry.msg.timestamp != null ?
                    u.timestampToLocalString(entry.msg.timestamp) :
                    null
                )],
                ['Hostname', entry.msg.hostname],
                ['App name', entry.msg.app_name],
                ['Proc ID', entry.msg.procid],
                ['Message ID', entry.msg.msgid],
                ['Facility', entry.msg.facility],
                ['Version', String(entry.msg.version)],
            ].map(([label, value]) => (value != null ? [
                ['label', `${label}:`],
                ['div', {
                    props: {
                        title: value
                    }},
                    value
                ]
            ] : []))
        ];
    })];
}


async function copy() {
    const state = common.getState();
    const entries = state.local.selectedEntries;

    try {
        await writeClipboard(encodeEntries(entries));
        common.notify('Copied selected entries');

    } catch {
        common.notify("Couldn't copy selected entries");
    }
}


async function download() {
    const state = common.getState();
    const entries = state.local.selectedEntries;
    const blob = new Blob([encodeEntries(entries)], {type: 'text/json'});
    // TODO file name based on entries
    const file = new File([blob], `syslog.json`);
    u.saveFile(file);
}


async function writeClipboard(text: string) {
    const navigator = window.navigator;
    const permissions = await navigator.permissions.query({name: "clipboard-write"} as any);

    if (permissions.state != "granted" && permissions.state != "prompt")
        throw new Error('invalid permissions');

    await navigator.clipboard.writeText(text);
}


function encodeEntries(entries: common.Entry[]): string {
    const data = entries.map(entry => u.pipe(
        u.set(['msg', 'data_raw'], entry.msg.data),
        u.change(['msg', 'data'], data => {
            if (!u.isString(data))
                return data;

            data = decodeJson(data);
            if (!u.isObject(data))
                return data;

            if (u.get(['hat@1', 'exc_info'], data))
                data = u.change(
                    ['hat@1', 'exc_info'],
                    value => (u.isString(value) ?
                        value.split('\n') :
                        value
                    )
                )(data);

            if (u.get(['hat@1', 'meta'], data))
                data = u.change(
                    ['hat@1', 'meta'],
                    value => (u.isString(value) ?
                        decodeJson(value) :
                        value
                    )
                )(data);

            return data;
        })
    )(entry));

    return encodeJson(data);
}


function decodeJson(text: string): u.JData | null {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}


function encodeJson(data: u.JData): string {
    return JSON.stringify(data, null, 2);
}


function getHatLocation(hatData: u.JData): string | null {
    if (hatData == null)
        return null;

    const name = u.get('name', hatData);
    const funcName = u.get('funcName', hatData);
    const lineno = u.get('lineno', hatData);

    return `${name}.${funcName}:${lineno}`;
}


function openDetails() {
    r.set(['local', 'details', 'visible'], true);
}


function closeDetails() {
    r.set(['local', 'details', 'visible'], false);
}
