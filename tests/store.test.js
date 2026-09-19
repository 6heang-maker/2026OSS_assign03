const { test } = require('node:test');
const assert = require('node:assert/strict');
const { KEY, createStore, validate } = require('../store.js');

function fixture() {
    const data = new Map();
    const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
    let count = 0;
    return { data, storage, store: createStore(storage, () => 'test-' + ++count) };
}
const valid = { name: '테스트 친구', relationship: '기타', phone: '010-1111-2222', email: 'test@example.com', address: '서울', birthday: '2000-02-29', memo: '' };

test('initial seed is saved only once and each friend has a unique ID', () => {
    const { store } = fixture();
    assert.equal(store.list().length, 5);
    assert.equal(new Set(store.list().map(friend => friend.id)).size, 5);
    assert.equal(store.list().length, 5);
});

test('create, reload, update and delete preserve other records', () => {
    const { store, storage } = fixture();
    const original = store.list();
    const id = store.save({ ...valid, name: '  테스트 친구  ', memo: '<script>alert(1)</script>' });
    const reloaded = createStore(storage, () => 'new-id');
    assert.equal(reloaded.get(id).name, valid.name);
    assert.equal(reloaded.get(id).memo, '<script>alert(1)</script>');
    reloaded.save({ ...valid, name: '수정 친구' }, id);
    assert.equal(store.get(id).name, '수정 친구');
    assert.equal(store.list().length, 6);
    reloaded.remove(id);
    assert.equal(store.get(id), undefined);
    assert.deepEqual(store.list(), original);
});

test('deleting every friend leaves the list empty on reload', () => {
    const { store, storage } = fixture();
    store.list().forEach(friend => store.remove(friend.id));
    assert.deepEqual(createStore(storage, () => 'id').list(), []);
});

test('invalid fields, impossible dates and future birthdays are rejected', () => {
    assert.deepEqual(validate(valid), {});
    for (const [field, value] of Object.entries({ name: '김', relationship: 'invalid', phone: '01011112222', email: 'x@', address: '', birthday: '2001-02-29', memo: 'a'.repeat(101) })) {
        assert.ok(validate({ ...valid, [field]: value })[field], field);
    }
    for (const birthday of ['2099-01-01', '1899-12-31', '', '2020-13-01']) assert.ok(validate({ ...valid, birthday }).birthday);
    const { store } = fixture();
    assert.throws(() => store.save({ ...valid, name: '  ' }));
    assert.equal(store.list().length, 5);
});

test('unknown IDs cannot silently insert or delete records', () => {
    const { store } = fixture();
    assert.throws(() => store.save(valid, 'missing'));
    assert.throws(() => store.remove('missing'));
    assert.equal(store.list().length, 5);
});

test('corrupt data stays untouched', () => {
    const { data, store } = fixture();
    for (const raw of ['broken JSON', '{}', '[{"id":"bad"}]']) {
        data.set(KEY, raw);
        assert.throws(() => store.list());
        assert.equal(data.get(KEY), raw);
    }
});

test('storage access and quota failures are reported without success', () => {
    const denied = createStore({ getItem() { throw new Error('denied'); } }, () => 'id');
    assert.throws(() => denied.list(), /접근/);
    const { storage, store } = fixture();
    const original = store.list();
    storage.setItem = () => { throw new Error('quota'); };
    assert.throws(() => store.save(valid), /저장하지/);
    assert.deepEqual(store.list(), original);
});
