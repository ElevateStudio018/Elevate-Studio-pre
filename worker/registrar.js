// Registrar adapters. The platform talks to one interface, so Elevate Studio can change registrar without a rebuild.
// Nothing is ever registered unless REGISTRAR_LIVE is "true" AND the order's payment is verified on the server.
// Until then every order is handled by hand from the admin (status "manual").
//
// Settings (Cloudflare):
//   REGISTRAR            "resellerclub" | "openprovider" | "demo" (default demo)
//   REGISTRAR_LIVE       "true" to allow real registrations (default off)
//   RESELLERCLUB_USER_ID secret, the reseller id (auth-userid)
//   RESELLERCLUB_API_KEY secret
//   Note: ResellerClub only answers from whitelisted IP addresses. Cloudflare Workers have no fixed address, so a
//   small proxy with a fixed IP is needed before ResellerClub can be used live.

const adapters = {
  demo: {
    name: 'Demo',
    ready: () => true,
    async register() { return { ok: false, manual: true, message: 'Demoläge: ingen domän registreras. Ordern hanteras manuellt.' }; },
  },
  resellerclub: {
    name: 'ResellerClub',
    ready: (env) => !!(env.RESELLERCLUB_USER_ID && env.RESELLERCLUB_API_KEY),
    async register(env, order) {
      // Implemented when a fixed-IP proxy exists; see note above. Refuses rather than guessing.
      return { ok: false, manual: true, message: 'ResellerClub kräver fast IP-adress. Registrera manuellt i ResellerClub tills proxyn finns.' };
    },
  },
  openprovider: {
    name: 'Openprovider',
    ready: (env) => !!(env.OPENPROVIDER_USER && env.OPENPROVIDER_PASSWORD),
    async register() { return { ok: false, manual: true, message: 'Openprovider är inte kopplat än.' }; },
  },
};

export function registrar(env) {
  const a = adapters[env.REGISTRAR] || adapters.demo;
  return { ...a, live: env.REGISTRAR_LIVE === 'true' && a.ready(env) };
}
