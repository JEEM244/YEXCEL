import test from "node:test";
import assert from "node:assert/strict";
import { csvCell, escapeHTML } from "../js/utils.js";

test("HTML-looking user content becomes inert text", () => {
  const hostile = '<script>alert(1)</script>';
  assert.equal(escapeHTML(hostile), "&lt;script&gt;alert(1)&lt;/script&gt;");
});

test("CSV formula prefixes are neutralized after leading control whitespace", () => {
  for (const value of ["=1+1", "+SUM(A1:A2)", "-2+3", "@SUM(A:A)", "\t=1+1", "\r@SUM(A:A)"]) {
    const result = csvCell(value);
    assert.ok(result.startsWith('"\''));
  }
});

test("CSV values remain enclosed and internal quotes are doubled", () => {
  assert.equal(csvCell("linea 1\nlinea 2"), '"linea 1\nlinea 2"');
  assert.equal(csvCell('a"b'), '"a""b"');
});
