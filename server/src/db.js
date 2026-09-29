import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// DATA_DIR permite apontar para um disco persistente montado pela hospedagem
// (ex: Render Disk). Sem isso definido, usa server/data (bom só para local).
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "almada.sqlite"));

db.exec(`
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
`);

function seedAdmin(){
  const count = db.prepare("SELECT COUNT(*) AS c FROM admins").get().c;
  if (count > 0) return;
  const username = process.env.ADMIN_USER || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const hash = bcrypt.hashSync(password, 10);
  db.prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)").run(username, hash);
  console.log(`[seed] Admin criado: usuário "${username}". Troque a senha em Admin > Config > Atualizar credenciais.`);
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

function seedProducts(){
  const count = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;
  if (count > 0) return;
  const now = new Date().toISOString();
  const insert = db.prepare(`INSERT INTO products
    (id, name, category, price, featured, description, image, image_zoom, image_pos_x, image_pos_y, created_at, updated_at)
    VALUES (@id, @name, @category, @price, @featured, @description, @image, @image_zoom, @image_pos_x, @image_pos_y, @created_at, @updated_at)`);
  for (const p of DEMO_PRODUCTS){
    insert.run({
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

seedAdmin();
seedProducts();
