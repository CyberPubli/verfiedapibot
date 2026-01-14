import express from "express";
import fetch from "node-fetch";
import {
  getLines,
  addLine,
  updateLine,
  removeLine
} from "./storage.js";

const app = express();
app.use(express.json());

const VERIFY_TOKEN = "mi_token_secreto";
const ADMIN = "5492236049325";

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.PHONE_NUMBER_ID;

// =======================
// WEBHOOK VERIFY
// =======================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// =======================
// WEBHOOK EVENTS
// =======================
app.post("/webhook", (req, res) => {
  const entry = req.body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  // MENSAJES
  if (value?.messages) {
    const msg = value.messages[0];
    const from = msg.from;
    const text = msg.text?.body?.trim();

    updateLine(from, {
      last_user_message: Date.now(),
      window_open: true
    });

    // COMANDO AGREGAR
    if (text?.startsWith("!agregar")) {
      const name = text.replace("!agregar", "").trim();
      if (addLine(name, from)) {
        notifyAdmin(`➕ Línea agregada\n${name} (${from})`);
      }
    }

    // ADMIN COMMANDS
    if (from === ADMIN) {
      if (text === "!lineas") {
        sendAdminLines();
      }

      if (text.startsWith("!eliminar")) {
        const phone = text.replace("!eliminar", "").trim();
        removeLine(phone);
        notifyAdmin(`🗑️ Línea eliminada ${phone}`);
      }
    }
  }

  // ACK STATUS
  if (value?.statuses) {
    const status = value.statuses[0];
    updateLine(status.recipient_id, {
      last_ack: Date.now(),
      failures: 0,
      status: "ok"
    });
  }

  res.sendStatus(200);
});

// =======================
// MONITOREO CADA 15 MIN
// =======================
setInterval(async () => {
  const lines = getLines();

  for (const line of lines) {
    if (!line.window_open) continue;

    const since = Date.now() - line.last_user_message;
    if (since > 24 * 60 * 60 * 1000) {
      updateLine(line.phone, {
        window_open: false,
        status: "paused"
      });
      notifyAdmin(`⏸️ Ventana cerrada\n${line.name}`);
      continue;
    }

    if (line.last_ping && Date.now() - line.last_ping < 15 * 60 * 1000) {
      continue;
    }

    await delay(random(20000, 30000));
    await sendPing(line.phone);

    updateLine(line.phone, {
      last_ping: Date.now()
    });
  }

  notifyAdmin(`✅ Sistema OK\nLíneas: ${lines.length}`);
}, 15 * 60 * 1000);

// =======================
// HELPERS
// =======================
async function sendPing(to) {
  await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      text: { body: "." }
    })
  });
}

async function notifyAdmin(text) {
  await sendPing(ADMIN, text);
}

async function sendAdminLines() {
  const lines = getLines();
  let msg = "📊 LÍNEAS\n\n";

  for (const l of lines) {
    msg += `${l.status === "ok" ? "🟢" : "🔴"} ${l.name}\n`;
  }

  await notifyAdmin(msg);
}

const delay = ms => new Promise(r => setTimeout(r, ms));
const random = (a, b) => Math.floor(Math.random() * (b - a) + a);

// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Bot activo");
});
