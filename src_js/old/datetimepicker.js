import r from '@hat-open/renderer';
import * as u from '@hat-open/util';


export function getDatePickerDefaultState(year = 1970, month = 0) {
    return {
        pickerType: 'DAY',
        year: year,
        month: month,
        decadeStart: null
    };
}


export function getTimePickerDefaultState() {
    return {
        mouseMove: null
    };
}


export function datePickerVt(path, ts, onChange) {
    const pickerType = r.get(path, 'pickerType');
    return ['div.date-picker',
        {
            'YEAR': yearPicker,
            'MONTH': monthPicker,
            'DAY': dayPicker,
        }[pickerType](path, ts, onChange)
    ];
}


export function timePickerVt(path, ts, onChange) {
    return ['div.time-picker',
        timePicker(path, ts, onChange)
    ];
}


const monthLabels = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
];


const weekdays = [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun'
];


function yearPicker(path) {
    const decadeStartPath = [path, 'decadeStart'];
    const yearPath = [path, 'year'];
    const decadeStart = r.get(decadeStartPath);
    const currentYear = r.get(yearPath);
    const years = [...Array(10).keys()].map(i => decadeStart + i);
    return ['div.year-picker',
        ['div.year-grid',
            ['div.nav.top', {
                on: {
                    click: () =>  r.change(decadeStartPath, i => i - 10)
                }},
                ['span.fa.fa-chevron-up']
            ],
            years.map(i => ['div.year', {
                class: {
                    current: i == currentYear
                },
                on: {
                    click: () => r.change(path, u.pipe(
                        u.set('year', i),
                        u.set('pickerType', 'DAY')
                    ))
                }},
                String(i)
            ]),
            ['div.nav.bottom', {
                on: {
                    click: () => r.change(decadeStartPath, i => i + 10)
                }},
                ['span.fa.fa-chevron-down']
            ]
        ]
    ];
}


function monthPicker(path) {
    const monthPath = [path, 'month'];
    const currentMonth = r.get(monthPath);
    const months = [...Array(12).keys()];
    return ['div.month-picker',
        ['div.month-grid',
            months.map(i => ['div', {
                class: {
                    current: i == currentMonth
                },
                on: {
                    click: () => r.change(path, u.pipe(
                        u.set('month', i),
                        u.set('pickerType', 'DAY')
                    ))
                }},
                monthLabels[i]
            ])
        ]
    ];
}


function dayPicker(path, ts, onChange) {
    const yearPath = [path, 'year'];
    const monthPath = [path, 'month'];
    const year = r.get(yearPath);
    const month = r.get(monthPath);
    const currentDay = ts != null ? new Date(ts) : null;
    const today = new Date(Date.now());
    const lastDay = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // First day of week in Europe is Monday
    const days = [...Array(lastDay).keys()].map(u.inc);
    return ['div.day-picker',
        ['div.header',
            monthHeaderPicker(path),
            yearHeaderPicker(path)
        ],
        ['div.day-grid',
            [...Array(7).keys()].map(i => ['div.weekday', weekdays[i]]),
            [...Array(firstDayOfWeek).keys()].map(() => ['div']),
            days.map(i => ['div.day', {
                class: {
                    current: currentDay != null && currentDay.getFullYear() && month == currentDay.getMonth() && i == currentDay.getDate(),
                    today: year == today.getFullYear() && month == today.getMonth() && i == today.getDate()
                },
                on: {
                    click: () => onChange(year, month, i)
                }},
                String(i)])
        ]
    ];
}


function monthHeaderPicker(path) {
    const monthPath = [path, 'month'];
    const month = r.get(monthPath);
    const monthLabel = monthLabels[month];
    return ['div.month',
        ['span.fa.fa-chevron-left', {
            on: {
                click: () => r.change(path, u.pipe(
                    u.change('month', i => (i + 11) % 12),
                    i => i.month == 11 ? u.change('year', u.dec, i) : i
                ))
            }}
        ],
        ['span.title', {
            on: {
                click: () => r.set([path, 'pickerType'], 'MONTH')
            }},
            monthLabel
        ],
        ['span.fa.fa-chevron-right', {
            on: {
                click: () => r.change(path, u.pipe(
                    u.change('month', i => (i + 1) % 12),
                    i => i.month == 0 ? u.change('year', u.inc, i) : i
                ))
            }}
        ],
    ];
}


function yearHeaderPicker(path) {
    const yearPath = [path, 'year'];
    const year = r.get(yearPath);
    return ['div.year',
        ['span.fa.fa-chevron-left', {
            on: {
                click: () => r.change(yearPath, u.dec)
            }}
        ],
        ['span.title', {
            on: {
                click: () => r.change(path, u.pipe(
                    u.set('pickerType', 'YEAR'),
                    u.set('decadeStart', year - year % 10)
                ))
            }},
            String(year)
        ],
        ['span.fa.fa-chevron-right', {
            on: {
                click: () => r.change(yearPath, u.inc)
            }}
        ]
    ];
}


function timePicker(path, ts, onChange) {
    const mouseMovePath = [path, 'mouseMove'];
    const date = ts != null ? new Date(ts) : null;
    const hour = ts ? date.getHours() : 0;
    const minute = ts ? date.getMinutes() : 0;
    const second = ts ? date.getSeconds() : 0;
    return ['div.time-picker',
        ['svg', {
            attrs: {
                height: 200,
                width: 200,
                viewBox: '-100 -100 200 200'
            }},
            ['circle', {
                attrs: {
                    cx: 0,
                    cy: 0,
                    r: 100,
                    fill: 'white'
                }},
            ],
            drawHourBoxes(74, 99, 87, ts, minute, second, onChange),
            ['circle.minute-ring', {
                attrs: {
                    cx: 0,
                    cy: 0,
                    r: 60,
                    'stroke-width': 1,
                    fill: 'none'
                }},
            ],
            drawMinute(57, 0, '60'),
            drawMinute(57, 90, '15'),
            drawMinute(57, 180, '30'),
            drawMinute(57, 270, '45'),
            drawTicks(68, 74, 60, 1, 'minute-tick'),
            drawTicks(64, 74, 12, 2, 'minute-tick'),
            drawMinutePointer(minute, 60, 74),
            drawTicks(44, 50, 60, 1, 'second-tick'),
            drawSecondPointer(second, 44, 60),
            ['circle.hour-ring', {
                attrs: {
                    cx: 0,
                    cy: 0,
                    r: 74,
                    'stroke-width': 1,
                    fill: 'none'
                }},
            ],
            ['circle', {
                attrs: {
                    cx: 0,
                    cy: 0,
                    r: 74,
                    fill: 'transparent'
                },
                on: {
                    mousedown: evt => {
                        const newMinute = getValueFromCoords(60, evt.offsetX - 100, evt.offsetY - 100);
                        r.set(mouseMovePath, 'minutes');
                        onChange(hour, newMinute, second);
                    }
                }}
            ],
            ['circle', {
                attrs: {
                    cx: 0,
                    cy: 0,
                    r: 60,
                    fill: 'transparent'
                },
                on: {
                    mousedown: evt => {
                        const newSecond = getValueFromCoords(60, evt.offsetX - 100, evt.offsetY - 100);
                        r.set(mouseMovePath, 'seconds');
                        onChange(hour, minute, newSecond);
                    }
                }}
            ],
            drawCentral(hour, minute, second),
            ['circle.outer-ring', {
                attrs: {
                    cx: 0,
                    cy: 0,
                    r: 99,
                    'stroke-width': 1,
                    fill: 'none'
                }}
            ],
            r.get(path, 'mouseMove') ? ['circle', {
                attrs: {
                    cx: 0,
                    cy: 0,
                    r: 100,
                    fill: 'transparent'
                },
                on: {
                    mousemove: evt => {
                        const value = getValueFromCoords(60, evt.offsetX - 100, evt.offsetY - 100);
                        const mouseMove = r.get(mouseMovePath);
                        if (mouseMove == 'minutes') {
                            onChange(hour, value, second);
                        } else if (mouseMove == 'seconds'){
                            onChange(hour, minute, value);
                        }
                    },
                    mouseup: () => r.set(mouseMovePath, null),
                    mouseleave: () => r.set(mouseMovePath, null),
                }}
            ] : [],
            drawComplication(-84, -84, 15, '0:00', () => onChange(0, 0, 0)),
            drawComplication(84, -84, 15, 'now', () => {
                const now = new Date();
                onChange(now.getHours(), now.getMinutes(), now.getSeconds());
            }),
        ]
    ];
}


function drawCentral(hour, minute, second) {
    return [
        ['g.central',
            ['text', {
                attrs: {
                    x: 0,
                    y: 0,
                }},
                ':'
            ],
            ['text', {
                attrs: {
                    x: -16,
                    y: 0,
                }},
                formatDigits(hour)
            ],
            ['text', {
                attrs: {
                    x: 16,
                    y: 0,
                }},
                formatDigits(minute)
            ],
            ['text.seconds', {
                attrs: {
                    x: 0,
                    y: 25,
                }},
                formatDigits(second)
            ]
        ]
    ];
}


function drawTicks(r1, r2, n, w, className) {
    return u.map(v => {
        var t = theta(n, v);
        return [`line.tick.${className}`, {
            attrs: {
                x1: r1 * Math.cos(t),
                y1: r1 * Math.sin(t),
                x2: r2 * Math.cos(t),
                y2: r2 * Math.sin(t),
                'stroke-width': w,
            }}];
    }, [...Array(n).keys()]);
}


function drawHourBoxes(r1, r2, rText, ts, minute, second, onChange) {
    const hour = ts != null ? new Date(ts).getHours() : null;
    return u.map(v => {
        const t = theta(24, v);
        return ['g.hour-box', {
            class: {
                selected: v == hour
            },
            on: {
                click: () => onChange(v, minute, second)
            }},
            drawBox(r1, r2, 24, v, 7.5),
            ['text', {
                attrs: {
                    x: rText * Math.cos(t),
                    y: rText * Math.sin(t),
                    style: `font-size:12px;font-weight:normal;alignment-baseline:central;text-anchor:middle`
                }},
                String(v)
            ]
        ];
    }, [...Array(24).keys()]);
}


function drawBox(r1, r2, n, v, delta) {
    const t = theta(n, v);
    const t1 = t - radians(delta);
    const t2 = t + radians(delta);
    const aX = r1 * Math.cos(t1);
    const aY = r1 * Math.sin(t1);
    const bX = r2 * Math.cos(t1);
    const bY = r2 * Math.sin(t1);
    const cX = r2 * Math.cos(t2);
    const cY = r2 * Math.sin(t2);
    const dX = r1 * Math.cos(t2);
    const dY = r1 * Math.sin(t2);
    return ['path.box', {
        attrs: {
            d: [`M ${aX} ${aY}`,
                `L ${bX} ${bY}`,
                `A ${r2} ${r2} 0 0 1 ${cX} ${cY}`,
                `L ${dX} ${dY}`,
                `A ${r1} ${r1} 0 0 0 ${aX} ${aY}`].join(' '),
        }}
    ];
}


function drawMinutePointer(minute, r1, r2) {
    const t = theta(60, minute);
    const t1 = t - radians(4);
    const t2 = t + radians(4);
    const aX = r1 * Math.cos(t);
    const aY = r1 * Math.sin(t);
    const bX = r2 * Math.cos(t1);
    const bY = r2 * Math.sin(t1);
    const cX = r2 * Math.cos(t2);
    const cY = r2 * Math.sin(t2);
    return ['path.minutes-pointer', {
        attrs: {
            d: [`M ${aX} ${aY}`,
                `L ${bX}, ${bY}`,
                `A ${r2} ${r2} 0 0 1 ${cX} ${cY}`,
                `L ${aX} ${aY}`].join(' '),
        }}
    ];
}


function drawSecondPointer(second, r1, r2) {
    const t = theta(60, second);
    return ['line.seconds-pointer', {
        attrs: {
            x1: r1 * Math.cos(t),
            y1: r1 * Math.sin(t),
            x2: r2 * Math.cos(t),
            y2: r2 * Math.sin(t)
        }}
    ];
}


function drawMinute(r, deg, text) {
    const t = radians(deg - 90);
    const x = r * Math.cos(t);
    const y = r * Math.sin(t);
    return [
        ['circle', {
            attrs: {
                cx: x,
                cy: y,
                r: 8,
                fill: 'white'
            }},
        ],
        ['text.minute-text', {
            attrs: {
                x: x,
                y: y,
                style: `font-size:10px;font-weight:normal;alignment-baseline:central;text-anchor:middle`
            }},
            text
        ]
    ];
}


function drawComplication(x, y, r, text, onClick) {
    return ['g.complication', {
        on: {
            click: onClick
        },
        attrs: {
            transform: `translate(${x} ${y})`
        }},
        ['circle', {
            attrs: {
                cx: 0,
                cy: 0,
                r: r,
                'stroke-width': 1,
                fill: 'white'
            }}
        ],
        ['text', {
            attrs: {
                style: `font-size:12px;font-weight:normal;alignment-baseline:central;text-anchor:middle`

            }},
            text
        ]
    ];
}


function radians(deg) {
    return deg * Math.PI / 180;
}


function degrees(rad) {
    return rad * 180 / Math.PI;
}


const theta = u.curry((n, v) => {
    return radians(270) + radians(360 / n) * v;
});


function formatDigits(v) {
    return v < 10 ? `0${v}` : `${v}`;
}


function getValueFromCoords(n, x, y) {
    const theta = atan2(x, y);
    const deg = degrees(theta) + 90;
    return Math.round(deg / 6) % 60;
}


function atan2(x, y) {
    if (x > 0)
        return Math.atan(y / x);
    else if (x < 0)
        return Math.atan(y / x) + Math.PI;
    else if (x == 0 && y > 0)
        return Math.PI / 2;
    else if (x == 0 && y < 0)
        return Math.PI / -2;
    else
        return 0;
}
