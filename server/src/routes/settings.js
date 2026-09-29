import { Router } from "express";
import { db } from "../db.js";
import { requireAdmin } from "../auth.js";

const DEFAULTS = {
  wppNumber: "5555999999999",
  wppMessage: "Olá! Quero comprar na Almada Outlet:",
};

const router = Router();

function getSettings(){
  const rows = db.prepare("SELECT key, value FROM settings").all();
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {
    wppNumber: map.wppNumber || DEFAULTS.wppNumber,
    wppMessage: map.wppMessage || DEFAULTS.wppMessage,
  };
}

router.get("/", (req, res) => {
  res.json(getSettings());
});

router.put("/", requireAdmin, (req, res) => {
  const b = req.body || {};
  const wppNumber = (b.wppNumber || "").trim() || DEFAULTS.wppNumber;
  const wppMessage = (b.wppMessage || "").trim() || DEFAULTS.wppMessage;

  const upsert = db.prepare(
    "INSERT INTO settings (key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value=@value"
  );
  upsert.run({ key: "wppNumber", value: wppNumber });
  upsert.run({ key: "wppMessage", value: wppMessage });

  res.json(getSettings());
});

export default router;
