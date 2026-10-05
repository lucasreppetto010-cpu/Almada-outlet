import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";

import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import settingsRoutes from "./routes/settings.js";
import { initDb } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.join(__dirname, "..", ".."); // pasta almada-outlet/

const app = express();
const PORT = process.env.PORT || 3000;

// Necessário em produção: a hospedagem (Render/Railway/etc.) termina o HTTPS
// num proxy na frente da nossa app; sem isso o Express acha que a conexão é
// HTTP e o cookie de sessão (secure) não é setado corretamente.
app.set("trust proxy", 1);

// Em produção, todo acesso vai por HTTPS: quem entrar por http:// é
// redirecionado, e o HSTS faz o navegador nem tentar http nas próximas vezes.
// Assim a senha do admin e o cookie de sessão nunca trafegam abertos.
if (process.env.NODE_ENV === "production"){
  app.use((req, res, next) => {
    if (req.secure) {
      res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
      return next();
    }
    res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  });
}

// Sem CORS: o site e a API ficam no mesmo endereço, então nenhum outro site
// precisa (nem deve) conseguir chamar a API pelo navegador.
app.use(express.json({ limit: "12mb" })); // uploads de imagem chegam como base64
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/settings", settingsRoutes);

// Só os arquivos do site são públicos. Todo o resto da pasta (server/, banco,
// .env, render.yaml, README...) responde 404.
const PUBLIC_PATH = /^\/(|index\.html|style\.css|script\.js|assets\/[^/]+)$/;
app.use((req, res, next) => {
  // Confere o caminho já decodificado: "%2f" vira "/" e não escapa da regra.
  let p;
  try { p = decodeURIComponent(req.path); } catch { return res.status(400).end(); }
  if (p.includes("..") || p.includes("\\") || !PUBLIC_PATH.test(p)) return res.status(404).end();
  next();
});

app.use(express.static(siteRoot, { dotfiles: "deny" }));

// Erro inesperado (ex: banco fora do ar): responde em JSON sem expor detalhes.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Erro no servidor. Tente novamente." });
});

await initDb();
app.listen(PORT, () => {
  console.log(`Almada Outlet rodando em http://localhost:${PORT}`);
});

// O plano grátis do Render hiberna após 15 min sem visitas. O Render informa
// o endereço público em RENDER_EXTERNAL_URL; acessá-lo a cada 10 min passa
// pelo proxy do Render e conta como visita, mantendo o site acordado.
const KEEP_ALIVE_URL = process.env.RENDER_EXTERNAL_URL;
if (KEEP_ALIVE_URL){
  setInterval(async () => {
    try {
      const res = await fetch(`${KEEP_ALIVE_URL}/api/settings`, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) console.warn(`[keep-alive] resposta ${res.status}`);
    } catch (err) {
      console.warn(`[keep-alive] falhou: ${err.message}`);
    }
  }, 10 * 60 * 1000);
  console.log(`[keep-alive] Acessando ${KEEP_ALIVE_URL} a cada 10 minutos.`);
}
