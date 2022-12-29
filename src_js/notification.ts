
export function notify(text: string) {
    let root = document.querySelector('body > .notifications');
    if (!root) {
        root = document.createElement('div');
        root.className = 'notifications';
        document.body.appendChild(root);
    }

    const el = document.createElement('div');
    el.innerText = text;
    root.appendChild(el);

    setTimeout(() => {
        if (!root)
            return;
        root.removeChild(el);
    }, 1000);
}
