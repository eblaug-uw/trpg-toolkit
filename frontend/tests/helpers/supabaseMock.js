export const FAKE_USER_ID = "00000000-0000-0000-0000-000000000001";
export const FAKE_SESSION = {
  user: { id: FAKE_USER_ID, email: "test@example.com" },
  access_token: "fake-token",
};

export function createSupabaseMock(initial = {}) {
  const initialClone = JSON.parse(JSON.stringify(initial));
  const store = {};
  let idCounter = 0;

  function loadInitial(seed) {
    for (const k of Object.keys(store)) delete store[k];
    for (const [t, rows] of Object.entries(seed)) {
      store[t] = rows.map((r) => ({ ...r }));
    }
    idCounter = 0;
  }
  loadInitial(initialClone);

  function from(table) {
    let op = null;
    let payload = null;
    const filters = [];
    let asSingle = false;

    const execute = () => {
      store[table] = store[table] || [];
      const rows = store[table];
      const match = (r) => filters.every(([c, v]) => r[c] === v);

      if (op === "select" || op === null) {
        return { data: rows.slice(), error: null };
      }
      if (op === "insert") {
        const newRow = {
          id: `mock-${++idCounter}`,
          created_at: new Date().toISOString(),
          ...payload,
        };
        store[table] = [...rows, newRow];
        return { data: asSingle ? newRow : [newRow], error: null };
      }
      if (op === "update") {
        let updated = null;
        store[table] = rows.map((r) => {
          if (match(r)) {
            updated = { ...r, ...payload };
            return updated;
          }
          return r;
        });
        return {
          data: asSingle ? updated : updated ? [updated] : [],
          error: null,
        };
      }
      if (op === "delete") {
        store[table] = rows.filter((r) => !match(r));
        return { data: null, error: null };
      }
      return { data: null, error: { message: `unknown op: ${op}` } };
    };

    const builder = {
      select() {
        if (!op) op = "select";
        return builder;
      },
      order() {
        return builder;
      },
      insert(row) {
        op = "insert";
        payload = row;
        return builder;
      },
      update(patch) {
        op = "update";
        payload = patch;
        return builder;
      },
      delete() {
        op = "delete";
        return builder;
      },
      eq(col, val) {
        filters.push([col, val]);
        return builder;
      },
      single() {
        asSingle = true;
        return builder;
      },
      then(onResolve, onReject) {
        return Promise.resolve(execute()).then(onResolve, onReject);
      },
    };
    return builder;
  }

  return {
    from,
    auth: {
      getSession: () => Promise.resolve({ data: { session: FAKE_SESSION }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    /** Reset the store to a fresh state — call in beforeEach for isolation. */
    __reset(newInitial = initialClone) {
      loadInitial(newInitial);
    },
    /** Direct store access if a test wants to inspect post-mutation rows. */
    __store: store,
  };
}
