import r from '@hat-open/renderer';
import * as u from '@hat-open/util';

import * as table from './table';
import * as datetime from '../datetime';


export function frozen() {
    return r.get('remote', 'filter', 'last_id') !== null;
}


const changeLastId = lastId => u.change('local', u.pipe(
    u.set(['filter', 'last_id'], lastId),
    u.change('pageLastIds', lastIds => {
        if (lastId === null)
            return null;
        if (lastIds === null) {
            const globalLast = getGlobalLast();
            if (lastId == globalLast)
                return [globalLast];
            return [globalLast, lastId];
        }
        if (!lastIds.includes(lastId))
            return u.append(lastId, lastIds);
        return lastIds;
    })
));


export function setFreeze(isFrozen) {
    const newLastId = isFrozen ? r.get(['remote', 'last_id']) : null;
    r.change(changeLastId(newLastId));
}


export function setPageSize(size) {
    r.change(changeSetFilterValue('max_results', u.strictParseInt(size)));
}


export function getPageSize() {
    return r.get(['remote', 'filter', 'max_results']);
}


export function getPageIndex() {
    const pages = r.get('local', 'pageLastIds');
    if (pages === null)
        return 0;
    return pages.findIndex(lastId => lastId == getLast());
}


export function getGlobalLast() {
    return r.get('remote', 'last_id');
}


export function getGlobalFirst() {
    return r.get('remote', 'first_id');
}


export function getLast() {
    return r.get('remote', 'filter', 'last_id') || r.get('remote', 'last_id');
}


export function getNextLastId() {
    const entries = r.get('remote', 'entries');
    if (entries.length < r.get('remote', 'filter', 'max_results')) {
        return null;
    }
    return entries.slice(-1)[0].id - 1;
}


export function navigatePreviousDisabled() {
    return getLast() == getGlobalLast(); 
}


export function navigateNextDisabled() {
    const nextLastId = getNextLastId();
    if (nextLastId === null) {
        return true;
    }
    return nextLastId < r.get('remote', 'first_id'); 
}


export function navigateNext() {
    if (navigateNextDisabled())
        return;
    r.change(changeLastId(r.get('remote', 'entries').slice(-1)[0].id - 1));
}


export function navigatePrevious() {
    if (navigatePreviousDisabled())
        return;
    const pages = r.get('local', 'pageLastIds');
    const currentPageIndex = pages.findIndex(page => page == getLast());
    if (currentPageIndex > 0)
        r.change(changeLastId(pages[currentPageIndex - 1]));
}


export function navigateFirst() {
    r.change(changeLastId(r.get('remote', 'last_id')));
}


export function getValue(key) {
    return r.get('remote', 'filter', key);
}


const changeSetFilterValue = u.curry(
    (key, value, state) => u.pipe(
        u.set(['local', 'filter', key], value),
        u.change([], state => {
            const lastId = u.get(['remote', 'filter', 'last_id'], state);
            if (lastId === null)
                return state;
            return u.pipe(
                changeLastId(null),
                changeLastId(getGlobalLast())
            )(state);
        })
    )(state)
);


export function setTimestampFrom(timestamp) {
    r.change(changeSetFilterValue('entry_timestamp_from', timestamp));
}


export function setTimestampTo(timestamp) {
    r.change(changeSetFilterValue('entry_timestamp_to', timestamp));
}


export function setValue(key, value) {
    r.change(changeSetFilterValue(key, value));
}


export function getActive() {
    return u.pipe(
        u.map(column => ({ key: column.filterKey, label: column.label })),
        u.filter(filterItem => filterItem.key),
        u.map(filterItem => u.set('value', getValue(filterItem.key), filterItem)),
        u.concat([{
            key: 'entry_timestamp_from',
            label: 'Timestamp from',
            value: datetime.utcTimestampToLocalString(getValue('entry_timestamp_from'))
        }, {
            key: 'entry_timestamp_to',
            label: 'Timestamp to',
            value: datetime.utcTimestampToLocalString(getValue('entry_timestamp_to'))
        }]),
        u.filter(filterItem => filterItem.value)
    )(table.columnsSorted());
}


export function clearAllActive() {
    r.change(u.pipe(
        ...getActive().map(({key}) => changeSetFilterValue(key, null)),
    ));
}
