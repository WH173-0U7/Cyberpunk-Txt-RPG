/// <reference types="vite/client" />

/** Which build this is, set at build time (`CHANNEL=beta`): the stable release or the beta, which keeps its own save. */
declare const __CHANNEL__: 'stable' | 'beta';
/** The version and the commit it was built from, e.g. "0.1.0 (a283362)". */
declare const __BUILD__: string;
