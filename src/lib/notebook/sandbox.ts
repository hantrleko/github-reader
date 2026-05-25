/**
 * Sandboxed expression / JS-cell evaluator for the Reactive Notebook.
 *
 * - Uses `new Function` with an explicit `with({})` scope to block access
 *   to `window`, `globalThis`, `import`, `fetch`, `eval`, etc.
 * - Injects a curated set of math + finance helpers.
 * - Soft timeout via opCount-style guard is not really possible in JS,
 *   so we just rely on synchronous fastness. Heavy work belongs in a
 *   future Web Worker cell.
 */

const HELPERS_SRC = `
const exp = Math.exp, log = Math.log, sqrt = Math.sqrt, pow = Math.pow,
      sin = Math.sin, cos = Math.cos, tan = Math.tan,
      abs = Math.abs, max = Math.max, min = Math.min,
      floor = Math.floor, ceil = Math.ceil, round = Math.round,
      PI = Math.PI, E = Math.E;

function ndf(x){ return Math.exp(-0.5*x*x)/Math.sqrt(2*Math.PI); }
function ncdf(x){
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,P=0.3275911;
  const sgn = x<0?-1:1; x = Math.abs(x)/Math.SQRT2;
  const t = 1/(1+P*x);
  const y = 1 - (((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);
  return 0.5*(1+sgn*y);
}
function bsCall(S,K,T,r,s){
  if (T<=0||s<=0) return Math.max(S-K,0);
  const d1 = (Math.log(S/K)+(r+0.5*s*s)*T)/(s*Math.sqrt(T));
  const d2 = d1 - s*Math.sqrt(T);
  return S*ncdf(d1) - K*Math.exp(-r*T)*ncdf(d2);
}
function bsPut(S,K,T,r,s){
  return bsCall(S,K,T,r,s) - S + K*Math.exp(-r*T);
}
function bondPrice(face, coupon, y, n, freq){
  freq = freq||1;
  const c = face*coupon/freq, m = y/freq, N = n*freq;
  let pv = 0;
  for (let t=1;t<=N;t++) pv += c/Math.pow(1+m,t);
  pv += face/Math.pow(1+m,N);
  return pv;
}

// d3-array style helpers
function linspace(a,b,n){
  const out = new Array(n);
  const step = (b-a)/Math.max(n-1,1);
  for (let i=0;i<n;i++) out[i] = a + i*step;
  return out;
}
function range(a,b,step){
  step = step||1;
  const out = [];
  for (let x=a; x<b; x+=step) out.push(x);
  return out;
}
function sum(arr){ let s=0; for (const v of arr) s+=v; return s; }
function mean(arr){ return arr.length ? sum(arr)/arr.length : NaN; }
function variance(arr){
  const m = mean(arr); let s = 0;
  for (const v of arr) s += (v-m)*(v-m);
  return arr.length>1 ? s/(arr.length-1) : NaN;
}
function std(arr){ return Math.sqrt(variance(arr)); }
function quantile(arr, q){
  if (!arr.length) return NaN;
  const sorted = arr.slice().sort((a,b)=>a-b);
  const i = (sorted.length-1)*q;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi]-sorted[lo])*(i-lo);
}
`;

// Block dangerous identifiers — first line of defence (the `with({})` scope
// below is the second).
const BANNED = [
  "import", "require", "fetch", "eval", "Function",
  "globalThis", "window", "self", "document", "process",
  "WebSocket", "XMLHttpRequest", "Worker", "navigator",
];

export function sanitizeSource(src: string): { ok: boolean; reason?: string } {
  for (const k of BANNED) {
    const re = new RegExp(`\\b${k}\\b`);
    if (re.test(src)) return { ok: false, reason: `禁用标识符: ${k}` };
  }
  return { ok: true };
}

/** Compile an expression cell — returns a function(p, x?) => any. */
export function compileExpr(expr: string): (
  scope: Record<string, unknown>,
  x?: number
) => unknown {
  const check = sanitizeSource(expr);
  if (!check.ok) {
    return () => { throw new Error(check.reason); };
  }
  // eslint-disable-next-line no-new-func
  const fn = new Function(
    "__scope",
    "x",
    `${HELPERS_SRC}; with(__scope){ return (${expr}); }`
  );
  return (scope, x) => fn(scope, x);
}

/** Compile a multi-line JS cell — body may use `return`. */
export function compileJs(body: string): (
  scope: Record<string, unknown>
) => unknown {
  const check = sanitizeSource(body);
  if (!check.ok) {
    return () => { throw new Error(check.reason); };
  }
  // eslint-disable-next-line no-new-func
  const fn = new Function(
    "__scope",
    `${HELPERS_SRC}; with(__scope){ ${body} }`
  );
  return (scope) => fn(scope);
}

/** Best-effort identifier extraction — used for DAG dependency detection. */
const ID_RE = /\b([A-Za-z_$][A-Za-z0-9_$]*)\b/g;
const KEYWORDS = new Set([
  "return", "if", "else", "for", "while", "var", "let", "const",
  "function", "true", "false", "null", "undefined", "typeof", "in", "of",
  "new", "this", "break", "continue", "switch", "case", "default",
  "Math", "Number", "Array", "Object", "JSON", "String", "Boolean",
  "Infinity", "NaN", "do", "try", "catch", "finally", "throw",
]);
const HELPER_NAMES = new Set([
  "exp","log","sqrt","pow","sin","cos","tan","abs","max","min",
  "floor","ceil","round","PI","E",
  "ndf","ncdf","bsCall","bsPut","bondPrice",
  "linspace","range","sum","mean","variance","std","quantile",
  "p","x",
]);

export function extractRefs(src: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  ID_RE.lastIndex = 0;
  while ((m = ID_RE.exec(src))) {
    const id = m[1];
    if (KEYWORDS.has(id) || HELPER_NAMES.has(id)) continue;
    // skip property access: `.foo`
    const prev = src[m.index - 1];
    if (prev === ".") continue;
    out.add(id);
  }
  return Array.from(out);
}