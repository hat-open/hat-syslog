import r from '@hat-open/renderer';
import * as u from '@hat-open/util';


export function snackbarsVt(): u.VNodeChild {
    const snackbars = r.get('local', 'snackbars') as string[];

    return ['div.snackbars', snackbars.map(text =>
        ['div.snackbar',
            ['label', text]
        ]
    )];
}


export async function show(text: string) {
    const path = ['local', 'snackbars'];

    const add = u.concat([text]);

    const remove = (snackbars: string[]) => {
        const index = u.findIndex(u.equals(text), snackbars);
        return (u.isNumber(index) ?
            u.omit(index, snackbars) :
            snackbars
        );
    };

    await r.change(path, add as any);
    await u.sleep(1000);
    await r.change(path, remove as any)
}
