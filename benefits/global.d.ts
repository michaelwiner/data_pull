// Next handles plain CSS imports at build time, but tsc has no declaration for
// a side-effect import of a .css file (TS2882). Next only ships one for
// *.module.css.
declare module "*.css";
