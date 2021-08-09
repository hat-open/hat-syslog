import r from '@hat-open/renderer';
import * as u from '@hat-open/util';
import * as juggler from '@hat-open/juggler';

import * as vt from './vt';
import * as state from './state';


import '../src_scss/main.scss';


async function main() {
    const root = document.body.appendChild(document.createElement('div'));
    r.init(root, state.main, vt.main);
    new juggler.Application(['local', 'filter'], 'remote');
}


window.addEventListener('load', main);
window.r = r;
window.u = u;
