/**
 * Fake em memória e encadeável do query builder do supabase-js, para os
 * testes unitários de tests/unit/userService.test.js. Cobre só a superfície
 * usada por src/services/userService.js: select/eq/order/single, upsert,
 * insert, update, delete, e um channel() que não faz nada (subscribeToUser
 * chama supabase.channel(...).on(...).subscribe(), mas os testes unitários
 * não exercitam realtime de verdade).
 *
 * Espelha o papel de tests/helpers/firestore-fake.mjs no toursinop, mas para
 * o formato de linhas/tabelas do Postgres em vez de documentos do Firestore.
 */
export function createFakeSupabase(seed = {}) {
    const store = {
        profiles: [],
        measurements: [],
        dose_history: [],
        symptoms_logs: [],
        daily_intake: [],
        ...Object.fromEntries(Object.entries(seed).map(([k, v]) => [k, [...v]])),
    };

    let nextId = 0;
    const matchFilters = (row, filters) => filters.every(([col, val]) => row[col] === val);

    const makeBuilder = (table) => {
        const state = { filters: [], order: null, single: false, op: null, payload: null, upsertOpts: null };

        const execute = () => {
            store[table] = store[table] || [];
            switch (state.op) {
                case 'select': {
                    let rows = store[table].filter((r) => matchFilters(r, state.filters));
                    if (state.order) {
                        const { col, ascending } = state.order;
                        rows = [...rows].sort((a, b) => {
                            if (a[col] === b[col]) return 0;
                            const dir = a[col] > b[col] ? 1 : -1;
                            return ascending ? dir : -dir;
                        });
                    }
                    if (state.single) {
                        const row = rows[0];
                        if (!row) return { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
                        return { data: row, error: null };
                    }
                    return { data: rows, error: null };
                }
                case 'upsert': {
                    const rowsIn = Array.isArray(state.payload) ? state.payload : [state.payload];
                    const conflictCols = state.upsertOpts?.onConflict ? state.upsertOpts.onConflict.split(',') : ['id'];
                    rowsIn.forEach((row) => {
                        const idx = store[table].findIndex((r) => conflictCols.every((c) => r[c] === row[c]));
                        if (idx >= 0) store[table][idx] = { ...store[table][idx], ...row };
                        else store[table].push({ ...row });
                    });
                    return { data: rowsIn, error: null };
                }
                case 'insert': {
                    const rowsIn = Array.isArray(state.payload) ? state.payload : [state.payload];
                    // Like the identity columns in schema.sql, every inserted row gets an id.
                    store[table].push(...rowsIn.map((r) => ({ id: r.id ?? `${table}-${++nextId}`, ...r })));
                    return { data: rowsIn, error: null };
                }
                case 'update': {
                    store[table] = store[table].map((r) =>
                        matchFilters(r, state.filters) ? { ...r, ...state.payload } : r
                    );
                    return { data: null, error: null };
                }
                case 'delete': {
                    store[table] = store[table].filter((r) => !matchFilters(r, state.filters));
                    return { data: null, error: null };
                }
                default:
                    return { data: [], error: null };
            }
        };

        const builder = {
            select() {
                state.op = 'select';
                return builder;
            },
            eq(col, val) {
                state.filters.push([col, val]);
                return builder;
            },
            order(col, opts) {
                state.order = { col, ascending: opts?.ascending !== false };
                return builder;
            },
            single() {
                state.single = true;
                return builder;
            },
            upsert(payload, opts) {
                state.op = 'upsert';
                state.payload = payload;
                state.upsertOpts = opts;
                return builder;
            },
            insert(payload) {
                state.op = 'insert';
                state.payload = payload;
                return builder;
            },
            update(payload) {
                state.op = 'update';
                state.payload = payload;
                return builder;
            },
            delete() {
                state.op = 'delete';
                return builder;
            },
            then(resolve, reject) {
                try {
                    resolve(execute());
                } catch (err) {
                    if (reject) reject(err);
                    else throw err;
                }
            },
        };

        return builder;
    };

    return {
        _store: store,
        from: makeBuilder,
        channel() {
            const chan = { on: () => chan, subscribe: () => chan };
            return chan;
        },
        removeChannel() {},
    };
}
