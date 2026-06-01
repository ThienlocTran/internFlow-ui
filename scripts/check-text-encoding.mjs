import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(process.cwd(), "src");
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".html"]);
const mojibakeMarkers = [
  "Ã",
  "Ä",
  "Æ",
  "Â",
  "â€",
  "Thi?u",
  "?nh nh?m",
];

function extensionOf(filePath) {
  const match = filePath.match(/\.[^.]+$/);
  return match?.[0] ?? "";
}

function listFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    const stats = statSync(path);
    if (stats.isDirectory()) return listFiles(path);
    return extensions.has(extensionOf(path)) ? [path] : [];
  });
}

const findings = [];

for (const filePath of listFiles(root)) {
  const content = readFileSync(filePath, "utf8");
  content.split(/\r?\n/).forEach((line, index) => {
    const marker = mojibakeMarkers.find((item) => line.includes(item));
    if (marker) {
      findings.push({
        file: relative(process.cwd(), filePath),
        line: index + 1,
        marker,
        text: line.trim(),
      });
    }
  });
}

if (findings.length > 0) {
  console.error("Possible mojibake text found:");
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} [${finding.marker}] ${finding.text}`);
  }
  process.exit(1);
}

console.log("No mojibake markers found in src.");
