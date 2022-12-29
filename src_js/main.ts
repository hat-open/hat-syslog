import * as u from '@hat-open/util';
import r from '@hat-open/renderer';

import * as app from './app';
import * as common from './common';

import { headerVt } from './header';
import { menuVt } from './menu';
import { tableVt } from './table';
import { detailsVt } from './details';


import '../src_scss/main.scss';


async function main() {
    const root = document.body.appendChild(document.createElement('div'));
    r.init(root, common.defaultState, mainVt);
    app.init();
}


function mainVt(): u.VNode {
    if (!r.get('remote'))
        return ['div.main'];

    return ['div.main',
        headerVt(),
        menuVt(),
        tableVt(),
        detailsVt()
    ];
}


window.addEventListener('load', main);
(window as any).r = r;
(window as any).u = u;
