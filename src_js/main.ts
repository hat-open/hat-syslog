import * as u from '@hat-open/util';
import r from '@hat-open/renderer';

import * as common from './common';

import { headerVt } from './header';
import { menuVt } from './menu';
import { tableVt } from './table';
import { detailsVt } from './details';


import '../src_scss/main.scss';


async function main() {
    const root = document.body.appendChild(document.createElement('div'));
    r.init(root, common.defaultState, mainVt);
    common.init();
}


function mainVt(): u.VNode {
    const state = common.getState();

    if (!state.remote)
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
