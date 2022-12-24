import * as juggler from '@hat-open/juggler';

import * as common from './common';


let app: juggler.Application;


export function init() {
    app = new juggler.Application('remote');
    (window as any).app = app;
}


export async function setFilter(filter: common.Filter) {
    await app.send('filter', filter);
}
