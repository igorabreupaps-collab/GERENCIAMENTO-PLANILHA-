const { esc, fmtPct, fmtDateBR } = require("../../web/js/format.js");

describe("esc", () => {
  test("escapa & < > \" para uso seguro em innerHTML", () => {
    expect(esc('<a href="x">a & b</a>')).toBe("&lt;a href=&quot;x&quot;&gt;a &amp; b&lt;/a&gt;");
  });
  test("null/undefined viram string vazia", () => {
    expect(esc(null)).toBe("");
    expect(esc(undefined)).toBe("");
  });
  test("números são convertidos pra string", () => {
    expect(esc(42)).toBe("42");
  });
});

describe("fmtPct", () => {
  test("formata fração como percentual com 1 casa decimal", () => {
    expect(fmtPct(0.876)).toBe("87.6%");
  });
  test("não-número vira travessão", () => {
    expect(fmtPct(null)).toBe("—");
    expect(fmtPct(undefined)).toBe("—");
  });
});

describe("fmtDateBR", () => {
  test("converte ISO (yyyy-mm-dd) para dd/mm/yyyy", () => {
    expect(fmtDateBR("2026-03-05")).toBe("05/03/2026");
  });
  test("vazio/nulo vira travessão", () => {
    expect(fmtDateBR(null)).toBe("—");
    expect(fmtDateBR("")).toBe("—");
  });
});
