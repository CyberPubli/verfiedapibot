import fs from "fs";

const FILE = "./lines.json";

function loadLines() {
  if (!fs.existsSync(FILE)) return [];
  return JSON.parse(fs.readFileSync(FILE, "utf-8"));
}

function saveLines(lines) {
  fs.writeFileSync(FILE, JSON.stringify(lines, null, 2));
}

export function getLines() {
  return loadLines();
}

export function addLine(name, phone) {
  const lines = loadLines();
  if (lines.find(l => l.phone === phone)) return false;

  lines.push({
    name,
    phone,
    window_open: true,
    last_user_message: Date.now(),
    last_ping: null,
    last_ack: null,
    status: "ok",
    failures: 0
  });

  saveLines(lines);
  return true;
}

export function updateLine(phone, data) {
  const lines = loadLines();
  const idx = lines.findIndex(l => l.phone === phone);
  if (idx === -1) return;

  lines[idx] = { ...lines[idx], ...data };
  saveLines(lines);
}

export function removeLine(phone) {
  const lines = loadLines().filter(l => l.phone !== phone);
  saveLines(lines);
}
