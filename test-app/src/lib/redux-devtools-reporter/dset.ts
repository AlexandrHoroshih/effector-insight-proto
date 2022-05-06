export function set<
  O extends Record<string | number | symbol, unknown | V>,
  V
>(obj: O, keys: string | string[], val: V) {
  (keys as string).split && (keys = (keys as string).split("."));
  let i = 0,
    l = keys.length,
    t = obj as any,
    x,
    k;
  while (i < l) {
    k = keys[i++];
    if (k === "__proto__" || k === "constructor" || k === "prototype") break;
    t = t[k as any] =
      i === l
        ? val
        : typeof (x = t[k]) === typeof keys
        ? x
        : (keys[i] as any) * 0 !== 0 || !!~("" + keys[i]).indexOf(".")
        ? {}
        : [];
  }
}
