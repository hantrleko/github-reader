/**
 * Export current notebook cells to a minimal Jupyter `.ipynb` v4 document.
 * Markdown / formula → markdown cells. JS / chart / table → code cells
 * (the JS source is preserved as a comment block; not executable in Jupyter).
 */

type AnyCell = {
  kind: string;
  text?: string;
  latex?: string;
  expression?: string;
  name?: string;
  value?: number;
  min?: number;
  max?: number;
  body?: string;
  xVar?: string;
  xMin?: number;
  xMax?: number;
  n?: number;
};

const codeCell = (lines: string[]) => ({
  cell_type: "code",
  execution_count: null,
  metadata: {},
  outputs: [],
  source: lines.map((l, i) => (i < lines.length - 1 ? l + "\n" : l)),
});

const mdCell = (lines: string[]) => ({
  cell_type: "markdown",
  metadata: {},
  source: lines.map((l, i) => (i < lines.length - 1 ? l + "\n" : l)),
});

export function exportIpynb(title: string, cells: AnyCell[]): string {
  const out: object[] = [
    mdCell([`# ${title}`, "", "_Exported from EF LAB Reactive Notebook._"]),
  ];

  for (const c of cells) {
    switch (c.kind) {
      case "markdown":
        out.push(mdCell((c.text ?? "").split("\n")));
        break;
      case "param":
        out.push(mdCell([
          `**Parameter** \`${c.name}\` = ${c.value}  *(range ${c.min} – ${c.max})*`,
        ]));
        break;
      case "formula":
        out.push(mdCell([
          c.latex ? `$$${c.latex}$$` : "",
          "",
          `> JS: \`${c.expression ?? ""}\``,
        ]));
        break;
      case "js":
        out.push(codeCell([
          `# JS sandbox cell — name: ${c.name || "(unnamed)"}`,
          "# Original source preserved as comment (not executable in Python)",
          ...(c.body ?? "").split("\n").map((l) => `# ${l}`),
        ]));
        break;
      case "chart":
        out.push(codeCell([
          `# Chart — x: ${c.xVar} ∈ [${c.xMin}, ${c.xMax}], N=${c.n}`,
          `# expression: ${c.expression ?? ""}`,
          "import numpy as np, matplotlib.pyplot as plt",
          `x = np.linspace(${c.xMin}, ${c.xMax}, ${c.n})`,
          "# y = <your function of x>",
          "# plt.plot(x, y); plt.show()",
        ]));
        break;
      case "table":
        out.push(mdCell([
          "**Table cell** (rendered in EF LAB)",
          "",
          `> source: \`${c.body ?? ""}\``,
        ]));
        break;
      case "python":
        // Real Python — export as directly executable code
        out.push(codeCell((c.body ?? "").split("\n")));
        break;
      default:
        out.push(mdCell([`<!-- unknown cell kind: ${c.kind} -->`]));
    }
  }

  return JSON.stringify(
    {
      cells: out,
      metadata: {
        kernelspec: { name: "python3", display_name: "Python 3", language: "python" },
        language_info: { name: "python", version: "3.11" },
        ef_lab: { source: "Reactive Notebook v2" },
      },
      nbformat: 4,
      nbformat_minor: 5,
    },
    null,
    2
  );
}