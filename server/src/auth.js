import crypto from "node:crypto";
import { db } from "./db.js";

export const COOKIE_NAME = "ao_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export function createSession(){
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_MS);
  db.prepare("INSERT INTO sessions (token, created_at, expires_at) VALUES (?, ?, ?)")
    .run(token, now.toISOString(), expires.toISOString());
  return { token, expires };
}

export function destroySession(token){
  if (!token) return;
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function isValidSession(token){
  if (!token) return false;
  const row = db.prepare("SELECT * FROM sessions WHERE token = ?").get(token);
  if (!row) return false;
  if (new Date(row.expires_at).getTime() < Date.now()){
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return false;
  }
  return true;
}

export function requireAdmin(req, res, next){
  const token = req.cookies?.[COOKIE_NAME];
  if (!isValidSession(token)) return res.status(401).json({ error: "Não autenticado." });
  next();
}
