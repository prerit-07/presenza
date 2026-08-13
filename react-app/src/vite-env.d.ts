/// <reference types="vite/client" />

// Leaflet is loaded globally via a CDN <script> tag in index.html
// (same approach the original site used) rather than as an npm
// dependency, so it's declared here as an untyped global.
declare const L: any;
interface Window { L: any }
