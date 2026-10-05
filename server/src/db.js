import { createClient } from "@libsql/client";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Em produção o banco fica no Turso (SQLite na nuvem, plano grátis): os dados
// sobrevivem a deploys e reinícios mesmo em hospedagem sem disco permanente.
// Sem TURSO_DATABASE_URL, usa o arquivo local server/data/almada.sqlite.
function databaseUrl(){
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  const dataDir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(__dirname, "..", "data");
  fs.mkdirSync(dataDir, { recursive: true });
  return "file:" + path.join(dataDir, "almada.sqlite");
}

const client = createClient({
  url: databaseUrl(),
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Converte "@nome" em "?" posicional: funciona igual no arquivo local e no Turso.
function bind(sql, args){
  if (args.length === 1 && args[0] && typeof args[0] === "object" && !Array.isArray(args[0])){
    const named = args[0];
    const values = [];
    const text = sql.replace(/@(\w+)/g, (_, k) => {
      values.push(named[k] === undefined ? null : named[k]);
      return "?";
    });
    return { sql: text, args: values };
  }
  return { sql, args: args.map(v => (v === undefined ? null : v)) };
}

// Mesma cara do node:sqlite (prepare().get/all/run), só que assíncrono.
export const db = {
  prepare(sql){
    return {
      async get(...args){ return (await client.execute(bind(sql, args))).rows[0]; },
      async all(...args){ return (await client.execute(bind(sql, args))).rows; },
      async run(...args){
        const r = await client.execute(bind(sql, args));
        return { changes: r.rowsAffected };
      },
    };
  },
  async exec(sql){ await client.executeMultiple(sql); },
};

// Express 4 não captura erro de função async: isso manda o erro para o
// tratador padrão em vez de derrubar o servidor.
export const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    featured INTEGER NOT NULL DEFAULT 0,
    description TEXT DEFAULT '',
    image TEXT,
    image_zoom REAL DEFAULT 100,
    image_pos_x REAL DEFAULT 50,
    image_pos_y REAL DEFAULT 50,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
`;

// Migrações: colunas adicionadas depois da criação inicial da tabela.
// size_type: "none" (tamanho único), "clothing" (P/M/G/GG) ou "shoes" (37–44).
// sizes: JSON com os tamanhos disponíveis em estoque, ex: ["P","M"].
async function migrate(){
  const productCols = (await db.prepare("PRAGMA table_info(products)").all()).map(c => c.name);
  if (!productCols.includes("size_type")) await db.exec("ALTER TABLE products ADD COLUMN size_type TEXT NOT NULL DEFAULT 'none'");
  if (!productCols.includes("sizes")) await db.exec("ALTER TABLE products ADD COLUMN sizes TEXT NOT NULL DEFAULT '[]'");
}

async function seedAdmin(){
  const { c } = await db.prepare("SELECT COUNT(*) AS c FROM admins").get();
  if (c > 0) return;
  const username = process.env.ADMIN_USER || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const hash = bcrypt.hashSync(password, 10);
  await db.prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)").run(username, hash);
  console.log(`[seed] Admin criado: usuário "${username}". Troque a senha em Admin > Config > Atualizar credenciais.`);
}

// Recuperação de acesso: troca a senha (e opcionalmente o usuário) do admin
// e derruba todas as sessões abertas. Usado pelo `npm run reset-admin` e pela
// variável ADMIN_RESET_PASSWORD.
export async function resetAdmin(password, username){
  const hash = bcrypt.hashSync(password, 10);
  const admin = await db.prepare("SELECT * FROM admins ORDER BY id LIMIT 1").get();
  const newUsername = (username || "").trim() || admin?.username || "admin";
  if (admin){
    await db.prepare("UPDATE admins SET username = ?, password_hash = ? WHERE id = ?").run(newUsername, hash, admin.id);
  } else {
    await db.prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)").run(newUsername, hash);
  }
  await db.prepare("DELETE FROM sessions").run();
  return newUsername;
}

function genId(){
  return "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const DEMO_PRODUCTS = [
  { name: "Tênis Chunky Street 90", category: "Tênis", featured: true, desc: "Solado alto, visual chunky. Combina com qualquer look urbano.", price: 299.90 },
  { name: "Tênis Runner Flex", category: "Tênis", featured: false, desc: "Leve e flexível, ideal para o dia a dia.", price: 259.90 },
  { name: "Camiseta Oversized Essential", category: "Camisetas", featured: true, desc: "Modelagem oversized, algodão macio. Várias cores.", price: 79.90 },
  { name: "Camiseta Estampada Street", category: "Camisetas", featured: false, desc: "Estampa exclusiva, caimento streetwear.", price: 69.90 },
  { name: "Calça Cargo Jogger", category: "Calças", featured: true, desc: "Bolsos laterais e punho elástico. Muito conforto.", price: 149.90 },
  { name: "Calça Jeans Slim", category: "Calças", featured: false, desc: "Jeans com elastano, caimento slim.", price: 179.90 },
  { name: "Bermuda Moletom Basic", category: "Bermudas", featured: false, desc: "Moletom leve, ótima para o verão.", price: 99.90 },
  { name: "Bermuda Jeans Slim", category: "Bermudas", featured: false, desc: "Jeans resistente, caimento moderno.", price: 119.90 },
  { name: "Kit 3 Cuecas Boxer Premium", category: "Cuecas", featured: true, desc: "Algodão com elastano. Kit com 3 unidades.", price: 59.90 },
  { name: "Cueca Boxer Cotton (unidade)", category: "Cuecas", featured: false, desc: "Confortável e respirável, uso diário.", price: 24.90 },
  { name: "Moletom Canguru Oversized", category: "Moletom", featured: true, desc: "Bolso canguru, capuz forrado, modelagem oversized.", price: 189.90 },
  { name: "Moletom Careca Basic", category: "Moletom", featured: false, desc: "Sem capuz, ideal para compor looks.", price: 159.90 },
  { name: "Óculos Oakley Holbrook", category: "Óculos Oakley", featured: true, desc: "Clássico e resistente, proteção UV.", price: 399.90 },
  { name: "Óculos Oakley Portal X", category: "Óculos Oakley", featured: false, desc: "Design moderno, lentes espelhadas.", price: 449.90 },
];

async function seedProducts(){
  const { c } = await db.prepare("SELECT COUNT(*) AS c FROM products").get();
  if (c > 0) return;
  const now = new Date().toISOString();
  const insert = db.prepare(`INSERT INTO products
    (id, name, category, price, featured, description, image, image_zoom, image_pos_x, image_pos_y, created_at, updated_at)
    VALUES (@id, @name, @category, @price, @featured, @description, @image, @image_zoom, @image_pos_x, @image_pos_y, @created_at, @updated_at)`);
  for (const p of DEMO_PRODUCTS){
    await insert.run({
      id: genId(),
      name: p.name,
      category: p.category,
      price: p.price,
      featured: p.featured ? 1 : 0,
      description: p.desc,
      image: null,
      image_zoom: 100,
      image_pos_x: 50,
      image_pos_y: 50,
      created_at: now,
      updated_at: now,
    });
  }
  console.log(`[seed] ${DEMO_PRODUCTS.length} produtos de exemplo criados.`);
}

export async function initDb(){
  await db.exec(SCHEMA);
  await migrate();
  await seedAdmin();
  // Produtos de exemplo só no desenvolvimento: a loja real começa vazia.
  if (process.env.NODE_ENV !== "production") await seedProducts();

  // Se ADMIN_RESET_PASSWORD estiver definida, o servidor redefine a senha ao
  // iniciar. Depois de entrar, apague a variável: senão a senha volta a ser essa
  // a cada reinício.
  if (process.env.ADMIN_RESET_PASSWORD){
    const user = await resetAdmin(process.env.ADMIN_RESET_PASSWORD, process.env.ADMIN_RESET_USER);
    console.warn(`[reset] Senha do admin "${user}" redefinida via ADMIN_RESET_PASSWORD. REMOVA essa variável agora.`);
  }
}
