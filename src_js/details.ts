import * as u from '@hat-open/util';
import r from '@hat-open/renderer';

import * as common from './common';
import * as notification from './notification';
import * as dragger from './dragger';


export function isVisible(): boolean {
    return Boolean(r.get('local', 'details', 'visible'));
}


export function setVisible(visible: boolean) {
    r.set(['local', 'details', 'visible'], visible);
}


export function getSelectedEntry(): common.Entry | null {
    return r.get('local', 'details', 'selected') as common.Entry | null;
}


export function selectEntry(entry: common.Entry | null) {
    r.set(['local', 'details', 'selected'], entry);
}


export function detailsVt(): u.VNodeChild {
    if (!isVisible())
        return [];

    const entry = getSelectedEntry();
    if (!entry)
        return [];

    return [
        ['div.details-resizer', {
            on: {
                mousedown: dragger.mouseDownHandler(evt => {
                    const parent = (evt.target as HTMLElement).parentNode;
                    if (!parent)
                        return null;

                    const el = parent.querySelector('.details') as HTMLElement | null;
                    if (!el)
                        return null;

                    const width = el.clientWidth;
                    return (_, dx) => {
                        // TODO: flex grow/shrink - grid grow/shrink
                        setWidth(width - dx);
                    };
                })
            }
        }],
        ['div.details', {
            props: {
                style: `width: ${getWidth()}px`
            }},
            headerVt(entry),
            contentVt(entry)
        ]
    ];
}


function headerVt(entry: common.Entry): u.VNode {
    return ['div.header',
        ['label', `Entry ${entry.id}`],
        ['button', {
            props: {
                title: 'Copy JSON entry',
            },
            on: {
                click: () => copy(entry)
            }},
            ['span.fa.fa-copy']
        ],
        ['button', {
            props: {
                title: 'Download JSON entry',
            },
            on: {
                click: () => download(entry)
            }},
            ['span.fa.fa-download']
        ],
        ['button', {
            props: {
                title: 'Close',
            },
            on: {
                click: () => setVisible(false)
            }},
            ['span.fa.fa-times']
        ]
    ];
}


function contentVt(entry: common.Entry): u.VNode {
    const rawDataVisible = r.get('local', 'details', 'rawDataVisible');

    const data = (entry.msg.data ? decodeJson(entry.msg.data) : null);
    const hatLocation = getHatLocation(u.get('hat@1', data));
    const hatExcInfo = u.get(['hat@1', 'exc_info'], data);

    return ['div.content',
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
        ] : [])),
        ['label.wide.collapsible', {
            on: {
                click: () => r.change(['local', 'details', 'rawDataVisible'], u.not)
            }},
            (rawDataVisible ?
                ['span.fa.fa-minus-square-o'] :
                ['span.fa.fa-plus-square-o']
            ),
            ' Raw data:'
        ],
        (rawDataVisible ?
            ['pre.wide', encodeJson(data).replace(/\\n/g, '\n')] :
            []
        )
    ];
}


async function copy(entry: common.Entry) {
    try {
        await writeClipboard(encodeEntry(entry));
        notification.notify(`Copied entry ${entry.id}`);

    } catch (e) {
        notification.notify(`Couldn't copy entry ${entry.id}`);
    }
}


async function download(entry: common.Entry) {
    const blob = new Blob([encodeEntry(entry)], {type: 'text/json'});
    const file = new File([blob], `syslogEntry${entry.id}.json`);
    saveFile(file);
}


async function writeClipboard(text: string) {
    const navigator = window.navigator;
    const permissions = await navigator.permissions.query({name: "clipboard-write"} as any);

    if (permissions.state != "granted" && permissions.state != "prompt")
        throw new Error('invalid permissions');

    await navigator.clipboard.writeText(text);
}


function saveFile(f: File) {
    const a = document.createElement('a');
    a.download = f.name;
    a.rel = 'noopener';
    a.href = URL.createObjectURL(f);
    setTimeout(() => { URL.revokeObjectURL(a.href); }, 20000);
    setTimeout(() => { a.click(); }, 0);
}


function encodeEntry(entry: common.Entry): string {
    return u.pipe(
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
        }),
        encodeJson
    )(entry);
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


function getWidth(): number {
    return r.get('local', 'details', 'width') as number;
}


function setWidth(width: number) {
    r.set(['local', 'details', 'width'], width);
}
