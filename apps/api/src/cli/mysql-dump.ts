/**
 * Minimal reader for phpMyAdmin / mysqldump SQL exports: returns each table's
 * rows as objects, using the column lists from CREATE TABLE and INSERT.
 * It never executes anything from the file.
 */
export type Row = Record<string, string | number | null>;

function parseValues(src: string, start: number, onRow: (vals: (string | number | null)[]) => void): number {
  let i = start;
  const n = src.length;
  while (i < n) {
    while (i < n && /\s|,/.test(src[i]!)) i++;
    if (src[i] === ";") return i + 1;
    if (src[i] !== "(") throw new Error(`Unexpected "${src.slice(i, i + 20)}" in VALUES`);
    i++;
    const vals: (string | number | null)[] = [];
    for (;;) {
      while (src[i] === " " || src[i] === "\n" || src[i] === "\r" || src[i] === "\t") i++;
      if (src[i] === "'") {
        i++;
        let s = "";
        for (;;) {
          const c = src[i]!;
          if (c === "\\") {
            const e = src[i + 1]!;
            s += e === "n" ? "\n" : e === "r" ? "\r" : e === "t" ? "\t" : e === "0" ? "\0" : e === "Z" ? "\x1a" : e;
            i += 2;
          } else if (c === "'") {
            if (src[i + 1] === "'") {
              s += "'";
              i += 2;
            } else {
              i++;
              break;
            }
          } else {
            s += c;
            i++;
          }
          if (i > n) throw new Error("Unterminated string");
        }
        vals.push(s);
      } else {
        let j = i;
        while (src[j] !== "," && src[j] !== ")") j++;
        const raw = src.slice(i, j).trim();
        vals.push(raw.toUpperCase() === "NULL" ? null : /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(raw) ? Number(raw) : raw);
        i = j;
      }
      while (src[i] === " ") i++;
      if (src[i] === ",") {
        i++;
        continue;
      }
      if (src[i] === ")") {
        i++;
        break;
      }
      throw new Error(`Unexpected "${src.slice(i, i + 20)}" in row`);
    }
    onRow(vals);
  }
  return i;
}

export function readDump(sql: string): Map<string, Row[]> {
  const tables = new Map<string, Row[]>();
  const columns = new Map<string, string[]>();
  for (const m of sql.matchAll(/CREATE TABLE `([^`]+)` \(([\s\S]*?)\n\)/g)) {
    columns.set(m[1]!, [...m[2]!.matchAll(/^\s*`([^`]+)`/gm)].map((c) => c[1]!));
  }
  const re = /INSERT INTO `([^`]+)`\s*(\(([^)]*)\))?\s*VALUES\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    const table = m[1]!;
    const cols = m[3] ? m[3].split(",").map((c) => c.trim().replace(/`/g, "")) : (columns.get(table) ?? []);
    const rows = tables.get(table) ?? [];
    const end = parseValues(sql, re.lastIndex, (vals) => {
      const row: Row = {};
      cols.forEach((c, k) => (row[c] = vals[k] ?? null));
      rows.push(row);
    });
    tables.set(table, rows);
    re.lastIndex = end;
  }
  return tables;
}
