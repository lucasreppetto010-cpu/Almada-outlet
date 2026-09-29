import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";

import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import settingsRoutes from "./routes/settings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.join(__dirname, "..", ".."); // pasta almada-outlet/

const app = express();
const PORT = process.env.PORT || 3000;

// Necessário em produção: a hospedagem (Render/Railway/etc.) termina o HTTPS
// num proxy na frente da nossa app; sem isso o Express acha que a conexão é
// HTTP e o cookie de sessão (secure) não é setado corretamente.
app.set("trust proxy", 1);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "12mb" })); // uploads de imagem chegam como base64
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/settings", settingsRoutes);

// Nunca sirva a própria pasta do backend (banco de dados, .env, node_modules)
// como arquivo estático — só o site (index.html, style.css, script.js, assets/...).
app.use((req, res, next) => {
  if (/^\/server(\/|$)/i.test(req.path)) return res.status(404).end();
  next();
});

app.use(express.static(siteRoot, { dotfiles: "deny" }));

app.listen(PORT, () => {
  console.log(`Almada Outlet rodando em http://localhost:${PORT}`);
});
