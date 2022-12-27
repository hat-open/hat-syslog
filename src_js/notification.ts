import * as u from '@hat-open/util';


export function notify(text: string) {
    let root = document.getElementById('notifications');
    if (!root) {
        root = document.createElement('div');
        root.id = 'notifications';
        document.body.appendChild(root);
    }

    const el = document.createElement('div');
    el.innerText = text;

    root.insertBefore(el, root.firstElementChild);
    u.delay(root.removeChild, 1000, el);
}
