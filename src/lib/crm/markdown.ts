/**
 * Minimal hand-rolled Markdown → HTML renderer for contract bodies.
 * Supports only what the contract template needs: #/## headings, **bold**,
 * "- " bullet lists, and paragraphs. No external dependency.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inline(s: string): string {
  return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let listOpen = false;

  function closeList() {
    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.trim() === "") {
      closeList();
      continue;
    }
    if (line.startsWith("## ")) {
      closeList();
      html.push(`<h3>${inline(line.slice(3))}</h3>`);
    } else if (line.startsWith("# ")) {
      closeList();
      html.push(`<h2>${inline(line.slice(2))}</h2>`);
    } else if (line.startsWith("- ")) {
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${inline(line.slice(2))}</li>`);
    } else {
      closeList();
      html.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return html.join("\n");
}
