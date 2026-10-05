import { Router } from "express";
import { db, asyncRoute } from "../db.js";
import { requireAdmin } from "../auth.js";

const router = Router();

function genId(){
  return "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const SIZE_TYPES = ["none", "clothing", "shoes"];

function parseSizes(raw){
  try {
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

// Normaliza o que vem do admin: tipo válido e lista de tamanhos sem repetidos.
function normalizeSizes(sizeType, sizes){
  const type = SIZE_TYPES.includes(sizeType) ? sizeType : "none";
  if (type === "none") return { size_type: "none", sizes: "[]" };
  const list = Array.isArray(sizes) ? sizes : [];
  const clean = [...new Set(list.map(s => String(s).trim().toUpperCase()).filter(Boolean))].slice(0, 30);
  return { size_type: type, sizes: JSON.stringify(clean) };
}

function rowToProduct(row){
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    featured: !!row.featured,
    desc: row.description || "",
    image: row.image || "",
    imageZoom: row.image_zoom,
    imagePos: { x: row.image_pos_x, y: row.image_pos_y },
    sizeType: row.size_type || "none",
    sizes: parseSizes(row.sizes),
  };
}

router.get("/", asyncRoute(async (req, res) => {
  const rows = await db.prepare("SELECT * FROM products ORDER BY created_at ASC").all();
  res.json(rows.map(rowToProduct));
}));

router.post("/", requireAdmin, asyncRoute(async (req, res) => {
  const b = req.body || {};
  const name = (b.name || "").trim();
  const category = (b.category || "").trim();
  const price = Number(b.price);
  if (!name || !category || !Number.isFinite(price) || price < 0){
    return res.status(400).json({ error: "Nome, categoria e preço válido são obrigatórios." });
  }

  const id = genId();
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO products
      (id, name, category, price, featured, description, image, image_zoom, image_pos_x, image_pos_y, size_type, sizes, created_at, updated_at)
      VALUES (@id, @name, @category, @price, @featured, @description, @image, @image_zoom, @image_pos_x, @image_pos_y, @size_type, @sizes, @created_at, @updated_at)`)
    .run({
      id, name, category, price,
      featured: b.featured ? 1 : 0,
      description: (b.desc || "").trim(),
      image: b.image || null,
      image_zoom: Number(b.imageZoom) || 100,
      image_pos_x: b.imagePos?.x ?? 50,
      image_pos_y: b.imagePos?.y ?? 50,
      ...normalizeSizes(b.sizeType, b.sizes),
      created_at: now,
      updated_at: now,
    });

  const row = await db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  res.status(201).json(rowToProduct(row));
}));

router.put("/:id", requireAdmin, asyncRoute(async (req, res) => {
  const existing = await db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Produto não encontrado." });

  const b = req.body || {};
  const name = (b.name ?? existing.name).trim();
  const category = (b.category ?? existing.category).trim();
  const price = b.price !== undefined ? Number(b.price) : existing.price;
  if (!name || !category || !Number.isFinite(price) || price < 0){
    return res.status(400).json({ error: "Nome, categoria e preço válido são obrigatórios." });
  }

  await db.prepare(`UPDATE products SET
        name=@name, category=@category, price=@price, featured=@featured,
        description=@description, image=@image, image_zoom=@image_zoom,
        image_pos_x=@image_pos_x, image_pos_y=@image_pos_y,
        size_type=@size_type, sizes=@sizes, updated_at=@updated_at
      WHERE id=@id`)
    .run({
      id: req.params.id, name, category, price,
      featured: b.featured ? 1 : 0,
      description: (b.desc ?? existing.description ?? "").trim(),
      image: b.image !== undefined ? (b.image || null) : existing.image,
      image_zoom: b.imageZoom !== undefined ? Number(b.imageZoom) : existing.image_zoom,
      image_pos_x: b.imagePos?.x ?? existing.image_pos_x,
      image_pos_y: b.imagePos?.y ?? existing.image_pos_y,
      ...(b.sizeType !== undefined
        ? normalizeSizes(b.sizeType, b.sizes)
        : { size_type: existing.size_type, sizes: existing.sizes }),
      updated_at: new Date().toISOString(),
    });

  const row = await db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  res.json(rowToProduct(row));
}));

router.delete("/:id", requireAdmin, asyncRoute(async (req, res) => {
  const info = await db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "Produto não encontrado." });
  res.json({ ok: true });
}));

export default router;
