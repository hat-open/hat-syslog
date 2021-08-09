import * as u from '@hat-open/util';
import r from '@hat-open/renderer';

import * as datetimepicker from './datetimepicker';


export const pickerState = {
    visible: false,
    tab: 'DATE',
    datePicker: datetimepicker.getDatePickerDefaultState(),
    timePicker: datetimepicker.getTimePickerDefaultState(),
    timestamp: null,
};


export function utcTimestampToLocalString(utcTimestamp) {
    if (utcTimestamp === null) {
        return '';
    }

    const date = new Date(utcTimestamp * 1000);

    function padZero(value, requiredLength) {
        const valueString = `${value}`;
        return '0'.repeat(requiredLength - valueString.length) + valueString;
    }

    const year = date.getFullYear();
    const month = padZero(date.getMonth() + 1, 2);
    const day = padZero(date.getDate(), 2);
    const hour = padZero(date.getHours(), 2);
    const minutes = padZero(date.getMinutes(), 2);
    const seconds = padZero(date.getSeconds(), 2);
    const milliseconds = padZero(date.getMilliseconds(), 3);

    return `${year}-${month}-${day} ${hour}:${minutes}:${seconds}.${milliseconds}`;
}


function localStringToUTCTimestamp(localString) {
    try {
        const [dateString, timeString] = localString.split(' ');
        const [yearString, monthString, dayString] = dateString.split('-');
        const [hourString, minutesString, secondsString, milliseconsString] = timeString.split(/[:.]/);

        const parse = u.strictParseInt;

        const date = new Date(
            parse(yearString), parse(monthString) - 1, parse(dayString),
            parse(hourString), parse(minutesString), parse(secondsString), parse(milliseconsString));
        return date.getTime() / 1000;
    } catch (error) {
        return NaN;
    }
}


export function pickerVt(statePath, timestampPath, changeCb, placeholder) {
    const pickerVisiblePath = [statePath, 'visible'];
    const pickerVisible = r.get(pickerVisiblePath);

    const value = r.get(timestampPath);

    return ['span.timestamp-filter',
        ['input', {
            props: {
                value: utcTimestampToLocalString(value),
                placeholder: placeholder || ''
            },
            on: {
                blur: evt => evt.target.value = utcTimestampToLocalString(value),
                keydown: evt => {
                    if (evt.key != 'Enter')
                        return;
                    const ts = evt.target.value == '' ? null : localStringToUTCTimestamp(evt.target.value);
                    if (isNaN(ts)) {
                        evt.target.value = utcTimestampToLocalString(value);
                        return;
                    }
                    r.set(timestampPath, ts);
                }
            }
        }],
        value ? ['span.icon.clear', {
            on: {
                click: () => r.set(timestampPath, null)
            }},
            ['span.fa.fa-times']
        ] : [],
        ['span.icon.calendar', {
            class: {
                active: r.get(pickerVisiblePath)
            },
            props: {
                tabIndex: -1
            },
            on: {
                focusin: () => r.set(pickerVisiblePath, pickerVisible),
                click: () => {
                    const ts = value != null ? value * 1000: Date.now();
                    const date = new Date(ts);
                    r.change(statePath, u.pipe(
                        u.set('visible', !pickerVisible),
                        u.set('tab', 'TIME'),
                        u.set('timestamp', ts),
                        u.set('datePicker', datetimepicker.getDatePickerDefaultState(date.getFullYear(), date.getMonth()))
                    ));
                }
            }},
            ['span.fa.fa-calendar']
        ],
        timestampPicker(statePath, ts => {
            r.set([statePath, 'visible'], false);
            changeCb(ts);
        }, placeholder)
    ];
}


function timestampPicker(statePath, onChange, title) {
    const visiblePath = [statePath, 'visible'];
    const timestampPath = [statePath, 'timestamp'];
    const timestamp = r.get(timestampPath);
    const tabPath = [statePath, 'tab'];
    const tab = r.get(tabPath);

    return r.get(visiblePath) ? ['div.timestamp-picker', {
        props: {
            tabIndex: -1
        },
        on: {
            focusin: () => r.set(visiblePath, true),
            focusout: () => r.set(visiblePath, false)
        },
        hook: {
            insert: vnode => vnode.elm.focus()
        }},
        ['div.header',
            ['span.title', title],
            ['span.spacer'],
            ['span.tab', {
                class: {
                    active: tab == 'TIME'
                },
                on: {
                    click: () => r.set(tabPath, 'TIME')
                }},
                ['span.fa.fa-clock-o']
            ],
            ['span.tab', {
                class: {
                    active: tab == 'DATE'
                },
                on: {
                    click: () => r.set(tabPath, 'DATE')
                }},
                ['span.fa.fa-calendar']
            ],
            ['button', {
                on: {
                    click: () => {
                        const ts = r.get(timestampPath) / 1000;
                        onChange(ts);
                    }
                }},
                ['span.fa.fa-check'],
                ' Apply'
            ]
        ],
        ['div.main',
            r.get(statePath, 'tab') == 'DATE' ?
                datetimepicker.datePickerVt([statePath, 'datePicker'], timestamp, (year, month, day) =>
                    r.change(timestampPath, ts => updateDate(ts, year, month, day))
                ) :
                datetimepicker.timePickerVt([statePath, 'timePicker'], timestamp, (hour, minute, second) =>
                    r.change(timestampPath, ts => updateTime(ts, hour, minute, second))
                )
        ]
    ] : [];    
}


function updateDate(ts, year, month, day) {
    const date = new Date(ts);
    date.setFullYear(year);
    date.setMonth(month);
    date.setDate(day);
    return date.getTime();
}


function updateTime(ts, hour, minute, second) {
    const time = new Date(ts);
    time.setHours(hour);
    time.setMinutes(minute);
    time.setSeconds(second);
    return time.getTime();
}
