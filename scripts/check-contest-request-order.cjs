// Run with: node scripts/check-contest-request-order.cjs
// Exercise real store actions with deliberately reordered API responses.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { create } = require('zustand');

const pending = [];
const api = { get: () => new Promise((resolve, reject) => pending.push({ resolve, reject })) };
const source = fs.readFileSync('src/store/primary_stores/contestStore.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, {
  exports: exportsObject,
  require(name) {
    if (name === 'zustand') return { create };
    if (name === 'zustand/middleware') return {
      persist: (initializer) => initializer,
      createJSONStorage: () => undefined,
    };
    if (name.endsWith('/api')) return { api };
    return {};
  },
});
const store = exportsObject.useContestStore;
const contest = (id) => ({ id, name: `Contest ${id}`, is_open: false, is_tabulated: true });
const respond = (request, id) => request.resolve({ data: { Contest: contest(id) } });

(async () => {
  const first = store.getState().fetchContestById(1, true);
  const second = store.getState().fetchContestById(2, true);
  respond(pending[1], 2);
  await second;
  respond(pending[0], 1);
  await first;
  assert.equal(store.getState().contest.id, 2, 'A late response must not replace the latest contest');

  const cleared = store.getState().fetchContestById(3, true);
  store.getState().clearContest();
  respond(pending[2], 3);
  await cleared;
  assert.equal(store.getState().contest, null, 'Cleared data must not return from an old request');
  assert.equal(store.getState().isLoadingContest, false);

  store.setState({ allContests: [contest(4)] });
  const stale = store.getState().fetchContestById(5, true);
  await store.getState().fetchContestById(4);
  respond(pending[3], 5);
  await stale;
  assert.equal(store.getState().contest.id, 4, 'A cache selection must supersede older requests');
  assert.equal(store.getState().isLoadingContest, false);
  console.log('PASS: latest request, clear, and cached navigation preserve the selected contest');
})().catch((error) => { console.error(error); process.exitCode = 1; });
