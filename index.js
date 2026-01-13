import express from "express";

const app = express();
app.use(express.json());

const VERIFY_TOKEN = "mi_token_secreto";

// ==============================
// Verificación de Webhook (Meta)
// ==============================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado correctamente");
    return res.status(200).send(challenge);
  }

  console.log("Falló verificación de webhook");
  return res.sendStatus(403);
});

// ==============================
// Eventos entrantes de WhatsApp
// ==============================
app.post("/webhook", (req, res) => {
  console.log("EVENTO RECIBIDO:");
  console.log(JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

// ==============================
// Inicio del servidor (Railway)
// ==============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Webhook activo en puerto ${PORT}`);
});
