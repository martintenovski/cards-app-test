// Stub for native-only modules on web.
// Exports empty/no-op functions so imports don't crash.
module.exports = new Proxy(
  {},
  {
    get(_, key) {
      if (key === '__esModule') return true;
      if (key === 'default') return module.exports;
      // Return a no-op function for any property access
      return () => Promise.resolve(null);
    },
  },
);
