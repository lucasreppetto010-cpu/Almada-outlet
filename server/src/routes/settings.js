import { Router } from "express";
import { db, asyncRoute } from "../db.js";
import { requireAdmin } from "../auth.js";

const DEFAULTS = {
  wppNumber: "5555984580443",
  wppMessage: "Olá! Quero comprar na Almada Outlet:",
};

const router = Router();

async function getSettings(){
  const rows = await db.prepare("SELECT key, value FROM settings").all();
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {
    wppNumber: map.wppNumber || DEFAULTS.wppNumber,
    wppMessage: map.wppMessage || DEFAULTS.wppMessage,
  };
}

router.get("/", asyncRoute(async (req, res) => {
  res.json(await getSettings());
}));

router.put("/", requireAdmin, asyncRoute(async (req, res) => {
  const b = req.body || {};
  const wppNumber = (b.wppNumber || "").trim() || DEFAULTS.wppNumber;
  const wppMessage = (b.wppMessage || "").trim() || DEFAULTS.wppMessage;

  const upsert = db.prepare(
    "INSERT INTO settings (key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value=@value"
  );
  await upsert.run({ key: "wppNumber", value: wppNumber });
  await upsert.run({ key: "wppMessage", value: wppMessage });

  res.json(await getSettings());
}));

export default router;
