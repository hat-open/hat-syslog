import * as u from '@hat-open/util';
import r from '@hat-open/renderer';

import * as common from './common';


export function detailsVt(): u.VNodeChild {
    const state = common.getState();
    if (!state.local.details.visible)
        return [];

    const entries = state.local.selectedEntries;
    if (entries.length < 1)
        return [];

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
        ['div.details', {
            props: {
                style: `width: ${width}px`
            }},
            headerVt(),
            contentVt()
        ]
    ];
}


function headerVt(): u.VNode {
    return ['div.header',
        ['label', 'Details'],
        ['button', {
            props: {
                title: 'Copy JSON entry',
            },
            on: {
                click: copy
            }},
            ['span.fa.fa-copy']
        ],
        ['button', {
            props: {
                title: 'Download JSON entry',
            },
            on: {
                click: download
            }},
            ['span.fa.fa-download']
        ],
        ['button', {
            props: {
                title: 'Close',
            },
            on: {
                click: close
            }},
            ['span.fa.fa-times']
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

        return [
            ['label.wide.title', `Entry ${entry.id}`],
            ['label.wide', 'Message:'],
            ['div.wide', entry.msg.msg || ''],
            (hatExcInfo  ? [
                ['label.wide', 'Exception:'],
                ['pre.wide', String(hatExcInfo)],
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

    } catch (e) {
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


function close() {
    r.set(['local', 'details', 'visible'], false);
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

            return u.map<u.JData, u.JData>(i => (u.get('exc_info', i) ?
                u.change('exc_info', value => (u.isString(value) ?
                    value.split('\n') :
                    value
                ), i) :
                i
            ))(data as any);
        })
    )(entry));

    return encodeJson(data);
}


function decodeJson(text: string): u.JData | null {
    try {
        return JSON.parse(text);
    } catch (e) {
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
    const funcName = u.get('name', hatData);
    const lineno = u.get('lineno', hatData);

    return `${name}.${funcName}:${lineno}`;
}
