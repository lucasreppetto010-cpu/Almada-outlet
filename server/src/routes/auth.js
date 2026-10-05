import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, asyncRoute } from "../db.js";
import { createSession, destroySession, isValidSession, requireAdmin, COOKIE_NAME } from "../auth.js";

const router = Router();
const isProd = process.env.NODE_ENV === "production";

router.post("/login", asyncRoute(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password){
    return res.status(400).json({ error: "Usuário e senha são obrigatórios." });
  }
  const admin = await db.prepare("SELECT * FROM admins WHERE username = ?").get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)){
    return res.status(401).json({ error: "Usuário ou senha inválidos." });
  }
  const { token, expires } = await createSession();
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    expires,
  });
  res.json({ ok: true });
}));

router.post("/logout", asyncRoute(async (req, res) => {
  await destroySession(req.cookies?.[COOKIE_NAME]);
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
}));

router.get("/me", asyncRoute(async (req, res) => {
  res.json({ isAdmin: await isValidSession(req.cookies?.[COOKIE_NAME]) });
}));

router.put("/credentials", requireAdmin, asyncRoute(async (req, res) => {
  const { username, password } = req.body || {};
  const admin = await db.prepare("SELECT * FROM admins ORDER BY id LIMIT 1").get();
  if (!admin) return res.status(500).json({ error: "Admin não encontrado." });

  const newUsername = (username || "").trim() || admin.username;
  const newHash = password ? bcrypt.hashSync(password, 10) : admin.password_hash;

  const clash = await db.prepare("SELECT id FROM admins WHERE username = ? AND id != ?").get(newUsername, admin.id);
  if (clash) return res.status(409).json({ error: "Já existe um admin com esse usuário." });

  await db.prepare("UPDATE admins SET username = ?, password_hash = ? WHERE id = ?")
    .run(newUsername, newHash, admin.id);
  res.json({ ok: true, username: newUsername });
}));

export default router;
