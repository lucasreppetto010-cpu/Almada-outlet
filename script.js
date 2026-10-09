const LS = {
  cart: "ao_cart_v1",
};

const DEFAULT_SETTINGS = {
  wppNumber: "5555984580443",
  wppMessage: "Olá! Quero comprar na Almada Outlet:",
};

// Tamanhos sugeridos no admin para cada tipo de produto. O dono marca quais
// têm em estoque; outros tamanhos (XG, 36, 45...) podem ser adicionados à mão.
const SIZE_PRESETS = {
  clothing: ["P", "M", "G", "GG"],
  shoes: ["37", "38", "39", "40", "41", "42", "43", "44"],
};

const moneyBR =(v) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
function loadJSON(key, fallback){ try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
function saveJSON(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function escapeHTML(s=""){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
function clamp(v, min, max){ return Math.min(max, Math.max(min, v)); }

// ---------- API ----------
async function apiGet(path){
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) throw new Error(`Erro ao carregar ${path}`);
  return res.json();
}
async function apiSend(path, method, body){
  const opts = { method, credentials: "include", headers: {} };
  if (body !== undefined){
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data.error || `Erro (${res.status})`);
  return data;
}

const svgFallback = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>
  <rect width='100%' height='100%' fill='#f3ece0'/>
  <text x='50%' y='50%' fill='#6b6257' font-family='Inter, Arial' font-size='28' text-anchor='middle'>Sem imagem</text>
</svg>`);

// ---------- Simple brand-styled placeholder art (no external images needed) ----------
const CATEGORY_ICONS = {
  "Tênis": `<path d="M60,300 L60,230 Q90,170 150,160 L230,150 Q270,145 300,170 L420,220 Q470,235 480,270 L480,300 Q480,310 470,310 L70,310 Q60,310 60,300 Z" fill="none" stroke="#15130f" stroke-width="10" stroke-linejoin="round"/><path d="M150,160 L150,210 M230,150 L245,205 M300,170 L330,215" stroke="#15130f" stroke-width="8" fill="none" stroke-linecap="round"/><line x1="60" y1="280" x2="480" y2="280" stroke="#17b8ae" stroke-width="10"/>`,
  "Camisetas": `<path d="M190,120 L230,90 Q270,110 310,90 L350,120 L410,160 L370,210 L340,190 L340,400 L200,400 L200,190 L170,210 L130,160 Z" fill="none" stroke="#15130f" stroke-width="10" stroke-linejoin="round"/><path d="M230,90 Q270,140 310,90" fill="none" stroke="#17b8ae" stroke-width="8"/>`,
  "Calças": `<path d="M190,90 L350,90 L360,180 L400,400 L340,400 L290,220 L260,220 L230,400 L170,400 L190,180 Z" fill="none" stroke="#15130f" stroke-width="10" stroke-linejoin="round"/><line x1="190" y1="140" x2="350" y2="140" stroke="#17b8ae" stroke-width="8"/>`,
  "Bermudas": `<path d="M190,90 L350,90 L360,180 L340,300 L300,300 L285,200 L265,200 L250,300 L210,300 L190,180 Z" fill="none" stroke="#15130f" stroke-width="10" stroke-linejoin="round"/><line x1="190" y1="140" x2="350" y2="140" stroke="#17b8ae" stroke-width="8"/>`,
  "Cuecas": `<path d="M180,140 L380,140 Q380,220 340,260 Q300,300 280,340 Q260,300 220,260 Q180,220 180,140 Z" fill="none" stroke="#15130f" stroke-width="10" stroke-linejoin="round"/><line x1="180" y1="170" x2="380" y2="170" stroke="#17b8ae" stroke-width="8"/>`,
  "Moletom": `<path d="M280,80 Q330,80 340,130 L400,150 L420,220 L390,235 L370,190 L370,400 L190,400 L190,190 L170,235 L140,220 L160,150 L220,130 Q230,80 280,80 Z" fill="none" stroke="#15130f" stroke-width="10" stroke-linejoin="round"/><rect x="240" y="300" width="80" height="50" rx="10" fill="none" stroke="#17b8ae" stroke-width="8"/>`,
  "Óculos Oakley": `<circle cx="190" cy="230" r="70" fill="none" stroke="#15130f" stroke-width="10"/><circle cx="370" cy="230" r="70" fill="none" stroke="#15130f" stroke-width="10"/><line x1="260" y1="220" x2="300" y2="220" stroke="#15130f" stroke-width="10"/><line x1="120" y1="215" x2="60" y2="190" stroke="#15130f" stroke-width="10" stroke-linecap="round"/><line x1="440" y1="215" x2="500" y2="190" stroke="#15130f" stroke-width="10" stroke-linecap="round"/><circle cx="190" cy="230" r="70" fill="#17b8ae" opacity=".12"/><circle cx="370" cy="230" r="70" fill="#17b8ae" opacity=".12"/>`,
};

function placeholderImage(category){
  const icon = CATEGORY_ICONS[category] || `<circle cx="280" cy="230" r="90" fill="none" stroke="#15130f" stroke-width="10"/>`;
  const label = escapeHTML(category || "Almada Outlet");
  const svg = `
<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 560 480'>
  <rect width='560' height='480' fill='#f3ece0'/>
  <circle cx='280' cy='230' r='150' fill='#ffffff'/>
  <g transform="translate(0,-10)">${icon}</g>
  <text x='280' y='430' fill='#15130f' font-family='Georgia, serif' font-size='30' font-weight='700' text-anchor='middle' letter-spacing='2'>${label.toUpperCase()}</text>
  <text x='280' y='458' fill='#6b6257' font-family='Inter, Arial' font-size='16' text-anchor='middle'>Almada Outlet</text>
</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

// State
let products = [];
let cart = loadJSON(LS.cart, []);
let settings = { ...DEFAULT_SETTINGS };
let isAdmin = false;
let priceFilter = { min: null, max: null };

// DOM
const yearEl = document.getElementById("year");
yearEl.textContent = new Date().getFullYear();

const navCats = document.getElementById("navCats");
const productsGrid = document.getElementById("productsGrid");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const categorySelect = document.getElementById("categorySelect");
const sortSelect = document.getElementById("sortSelect");
const minPrice = document.getElementById("minPrice");
const maxPrice = document.getElementById("maxPrice");
const applyPriceBtn = document.getElementById("applyPriceBtn");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

const statProducts = document.getElementById("statProducts");
const statShown = document.getElementById("statShown");

const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");
const openCartBtn = document.getElementById("openCartBtn");
const openCartBtn2 = document.getElementById("openCartBtn2");
const openCartBtnHero = document.getElementById("openCartBtnHero");
const closeCartBtn = document.getElementById("closeCartBtn");
const cartCount = document.getElementById("cartCount");
const cartItems = document.getElementById("cartItems");
const cartSubtotal = document.getElementById("cartSubtotal");
const cartMiniInfo = document.getElementById("cartMiniInfo");
const cartNote = document.getElementById("cartNote");
const clearCartBtn = document.getElementById("clearCartBtn");
const checkoutWppBtn = document.getElementById("checkoutWppBtn");

const footerWpp = document.getElementById("footerWpp");
const ctaWppLink = document.getElementById("ctaWppLink");
const headerWppLink = document.getElementById("headerWppLink");

const adminModal = document.getElementById("adminModal");
const adminOverlay = document.getElementById("adminOverlay");
const closeAdminBtn = document.getElementById("closeAdminBtn");
const openAdminHintBtn = document.getElementById("openAdminHintBtn");

const tabLogin = document.getElementById("tabLogin");
const tabCatalog = document.getElementById("tabCatalog");
const tabSettings = document.getElementById("tabSettings");
const panelLogin = document.getElementById("panelLogin");
const panelCatalog = document.getElementById("panelCatalog");
const panelSettings = document.getElementById("panelSettings");

const adminUser = document.getElementById("adminUser");
const adminPass = document.getElementById("adminPass");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");

const productForm = document.getElementById("productForm");
const pId = document.getElementById("pId");
const pName = document.getElementById("pName");
const pCategory = document.getElementById("pCategory");
const pPrice = document.getElementById("pPrice");
const pFeatured = document.getElementById("pFeatured");
const pDesc = document.getElementById("pDesc");
const pSizeType = document.getElementById("pSizeType");
const pSizesBox = document.getElementById("pSizesBox");
const pSizes = document.getElementById("pSizes");
const pSizeCustom = document.getElementById("pSizeCustom");
const pSizeAddBtn = document.getElementById("pSizeAddBtn");
const pImage = document.getElementById("pImage");
const pImageFile = document.getElementById("pImageFile");
const clearFormBtn = document.getElementById("clearFormBtn");
const pCategoryList = document.getElementById("pCategoryList");
const pImagePreviewWrap = document.getElementById("pImagePreviewWrap");
const pImagePreview = document.getElementById("pImagePreview");
const pZoom = document.getElementById("pZoom");
const pZoomVal = document.getElementById("pZoomVal");
const pImageResetBtn = document.getElementById("pImageResetBtn");
const adminProductsList = document.getElementById("adminProductsList");

const storeWpp = document.getElementById("storeWpp");
const storeWppMsg = document.getElementById("storeWppMsg");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const newAdminUser = document.getElementById("newAdminUser");
const newAdminPass = document.getElementById("newAdminPass");
const saveCredsBtn = document.getElementById("saveCredsBtn");

// ---------- Cart helpers ----------
// Cada item do carrinho é { productId, size, qty }: o mesmo produto em
// tamanhos diferentes vira linhas separadas.
function cartTotalQty(){ return cart.reduce((a,i)=>a+i.qty,0); }
function findCartItem(productId, size){
  return cart.find(i=>i.productId===productId && (i.size||"")===(size||""));
}

// ---------- Sizes ----------
function hasSizes(p){ return !!p && p.sizeType && p.sizeType !== "none"; }
function availableSizes(p){ return hasSizes(p) ? (p.sizes || []) : []; }
function isSoldOut(p){ return hasSizes(p) && availableSizes(p).length === 0; }

// Tamanho escolhido pelo cliente em cada card (sobrevive aos re-renders).
const chosenSize = {};

// ---------- Categories ----------
function categories(){
  return Array.from(new Set(products.map(p => (p.category||"").trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
}

function renderCategoryUI(){
  const cats = categories();
  const current = categorySelect.value || "all";
  categorySelect.innerHTML = `<option value="all">Todas</option>` + cats.map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
  if ([...categorySelect.options].some(o=>o.value===current)) categorySelect.value = current;

  navCats.innerHTML = "";
  const mkBtn = (label, val) => {
    const b = document.createElement("button");
    b.className = "catBtn" + ((categorySelect.value===val) ? " isActive" : "");
    b.textContent = label;
    b.addEventListener("click", ()=>{ categorySelect.value = val; renderAll(); });
    return b;
  };
  navCats.appendChild(mkBtn("Todos", "all"));
  cats.forEach(c => navCats.appendChild(mkBtn(c, c)));

  pCategoryList.innerHTML = cats.map(c=>`<option value="${escapeHTML(c)}"></option>`).join("");
}

// ---------- Filtering / sorting ----------
function filteredProducts(){
  const q = (searchInput.value || "").trim().toLowerCase();
  const cat = categorySelect.value || "all";
  const sort = sortSelect.value || "featured";

  let list = [...products];
  if (cat !== "all") list = list.filter(p => (p.category||"").trim() === cat);
  if (q) list = list.filter(p => (`${p.name} ${p.category} ${p.desc}`).toLowerCase().includes(q));

  const min = priceFilter.min;
  const max = priceFilter.max;
  if (min != null && !Number.isNaN(min)) list = list.filter(p => (p.price||0) >= min);
  if (max != null && !Number.isNaN(max)) list = list.filter(p => (p.price||0) <= max);

  if (sort === "featured"){
    list.sort((a,b)=> (b.featured===true) - (a.featured===true) || a.name.localeCompare(b.name));
  } else if (sort === "priceAsc"){
    list.sort((a,b)=>(a.price||0)-(b.price||0));
  } else if (sort === "priceDesc"){
    list.sort((a,b)=>(b.price||0)-(a.price||0));
  } else if (sort === "nameAsc"){
    list.sort((a,b)=>a.name.localeCompare(b.name));
  }

  return list;
}

// ---------- Render products ----------
let io;
function ensureObserver(){
  if (io) return;
  io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if (e.isIntersecting) e.target.classList.add("isIn");
    });
  }, { threshold: 0.06 });
}

function sizesBlockHTML(p){
  if (!hasSizes(p)) return "";
  if (isSoldOut(p)) return `<div class="pSoldOut">Esgotado</div>`;
  const sizes = availableSizes(p);
  if (chosenSize[p.id] && !sizes.includes(chosenSize[p.id])) delete chosenSize[p.id];
  // Só um tamanho disponível: já vem selecionado.
  if (sizes.length === 1) chosenSize[p.id] = sizes[0];
  const current = chosenSize[p.id];
  return `
    <div>
      <div class="pSizesLabel">${current ? `Tamanho: ${escapeHTML(current)}` : (p.sizeType === "shoes" ? "Numeração" : "Tamanho")}</div>
      <div class="sizeChips">
        ${sizes.map(s=>`<button type="button" class="sizeChip${s===current ? " isActive" : ""}" data-size="${escapeHTML(s)}">${escapeHTML(s)}</button>`).join("")}
      </div>
    </div>`;
}

function renderProducts(){
  ensureObserver();
  const list = filteredProducts();
  statProducts.textContent = String(products.length);
  statShown.textContent = String(list.length);

  productsGrid.innerHTML = "";
  if (!list.length){
    productsGrid.innerHTML = `<div class="panel" style="grid-column:1/-1">Nenhum produto encontrado.</div>`;
    return;
  }

  list.forEach(p=>{
    const price = p.price ?? 0;
    const zoom = p.imageZoom || 100;
    const posX = p.imagePos?.x ?? 50;
    const posY = p.imagePos?.y ?? 50;

    const el = document.createElement("article");
    el.className = "pCard";
    el.innerHTML = `
      <div class="pImgWrap">
        <img class="pImg" src="${p.image || placeholderImage(p.category)}" alt="${escapeHTML(p.name)}" style="object-position:${posX}% ${posY}%; transform:scale(${zoom/100})" />
      </div>
      <div class="pBody">
        <div class="pTop">
          <div>
            <div class="pName">${escapeHTML(p.name)}</div>
            <div class="pCat">${escapeHTML(p.category||"")}</div>
          </div>
          <div class="priceStack">
            <div class="pPrice">${moneyBR(price)}</div>
            ${p.featured ? `<div class="pTag">Destaque</div>` : ``}
          </div>
        </div>

        <div class="pDesc">${escapeHTML(p.desc||"")}</div>

        ${sizesBlockHTML(p)}

        <div class="row">
          <button class="btn btn--primary btn--full" data-add="${p.id}" ${isSoldOut(p) ? "disabled" : ""}>${isSoldOut(p) ? "Indisponível" : "Adicionar"}</button>
          ${isAdmin ? `<button class="btn btn--ghost" data-edit="${p.id}">Editar</button>` : ``}
        </div>
      </div>
    `;

    const img = el.querySelector("img");
    img.onerror = () => img.src = svgFallback;

    el.querySelectorAll("[data-size]").forEach(b=>{
      b.addEventListener("click", ()=>{
        chosenSize[p.id] = b.dataset.size;
        el.querySelectorAll("[data-size]").forEach(x=>x.classList.toggle("isActive", x===b));
        const label = el.querySelector(".pSizesLabel");
        label.textContent = `Tamanho: ${b.dataset.size}`;
        label.style.color = "";
      });
    });

    el.querySelector("[data-add]").addEventListener("click", ()=>{
      if (hasSizes(p)){
        const size = chosenSize[p.id];
        if (!size || !availableSizes(p).includes(size)){
          const label = el.querySelector(".pSizesLabel");
          label.textContent = "Escolha um tamanho";
          label.style.color = "#991b1b";
          return;
        }
        addToCart(p.id, size);
      } else addToCart(p.id);
    });
    const editBtn = el.querySelector("[data-edit]");
    if (editBtn) editBtn.addEventListener("click", ()=>{ openAdmin(); loadToForm(p.id); });

    productsGrid.appendChild(el);
    io.observe(el);
  });
}

// ---------- Cart ----------
function cartSubtotalValue(){
  return cart.reduce((sum, it)=>{
    const p = products.find(x=>x.id===it.productId);
    if (!p) return sum;
    return sum + (p.price||0) * it.qty;
  },0);
}

function renderCart(){
  cartCount.textContent = String(cartTotalQty());
  cartSubtotal.textContent = moneyBR(cartSubtotalValue());
  cartMiniInfo.textContent = cart.length ? `${cartTotalQty()} item(ns)` : `Carrinho vazio`;

  cartItems.innerHTML = "";
  if (!cart.length){
    cartItems.innerHTML = `<div class="panel">Seu carrinho está vazio.</div>`;
    return;
  }

  cart.forEach(it=>{
    const p = products.find(x=>x.id===it.productId);
    if (!p) return;

    const sizeGone = it.size && hasSizes(p) && !availableSizes(p).includes(it.size);

    const row = document.createElement("div");
    row.className = "cartRow";
    row.innerHTML = `
      <img src="${p.image || placeholderImage(p.category)}" alt="${escapeHTML(p.name)}" />
      <div>
        <div class="cartName">${escapeHTML(p.name)}</div>
        ${it.size ? `<div class="cartSize">Tamanho: ${escapeHTML(it.size)}${sizeGone ? ` <span style="color:#991b1b">(esgotou)</span>` : ""}</div>` : ""}
        <div class="muted">Unit: <strong>${moneyBR(p.price||0)}</strong></div>
        <button class="btn btn--ghost" style="padding:8px 10px" data-remove>Remover</button>
      </div>
      <div class="qty">
        <button data-dec>−</button>
        <strong>${it.qty}</strong>
        <button data-inc>+</button>
      </div>
    `;

    row.querySelector("img").onerror = ()=> row.querySelector("img").src = svgFallback;
    row.querySelector("[data-inc]").addEventListener("click", ()=>incQty(it.productId, it.size));
    row.querySelector("[data-dec]").addEventListener("click", ()=>decQty(it.productId, it.size));
    row.querySelector("[data-remove]").addEventListener("click", ()=>removeFromCart(it.productId, it.size));
    cartItems.appendChild(row);
  });
}

function addToCart(productId, size){
  const found = findCartItem(productId, size);
  if (found) found.qty += 1;
  else cart.push(size ? {productId, size, qty:1} : {productId, qty:1});
  saveJSON(LS.cart, cart);
  renderProducts();
  renderCart();
  openCart();
}
function incQty(productId, size){
  const it = findCartItem(productId, size);
  if (!it) return;
  it.qty += 1;
  saveJSON(LS.cart, cart);
  renderProducts();
  renderCart();
}
function decQty(productId, size){
  const it = findCartItem(productId, size);
  if (!it) return;
  it.qty = Math.max(1, it.qty-1);
  saveJSON(LS.cart, cart);
  renderProducts();
  renderCart();
}
function removeFromCart(productId, size){
  const it = findCartItem(productId, size);
  cart = cart.filter(i=>i!==it);
  saveJSON(LS.cart, cart);
  renderProducts();
  renderCart();
}

// ---------- WhatsApp ----------
function wppBaseLink(customText){
  const number = (settings.wppNumber || DEFAULT_SETTINGS.wppNumber).replace(/\D/g,"");
  const text = encodeURIComponent(customText || settings.wppMessage || DEFAULT_SETTINGS.wppMessage);
  return `https://wa.me/${number}?text=${text}`;
}
function renderWppLinks(){
  headerWppLink.href = wppBaseLink();
  footerWpp.href = wppBaseLink();
  ctaWppLink.href = wppBaseLink();
}
function buildCheckoutMessage(){
  const lines = [];
  lines.push(settings.wppMessage || DEFAULT_SETTINGS.wppMessage);
  lines.push("");

  cart.forEach(it=>{
    const p = products.find(x=>x.id===it.productId);
    if (!p) return;
    const lineTotal = (p.price||0) * it.qty;
    const size = it.size ? ` (Tam. ${it.size})` : "";
    lines.push(`• ${it.qty}x ${p.name}${size} — Unit ${moneyBR(p.price||0)} (linha: ${moneyBR(lineTotal)})`);
  });

  lines.push("");
  lines.push(`Subtotal: ${moneyBR(cartSubtotalValue())}`);

  const note = (cartNote.value||"").trim();
  if (note){
    lines.push("");
    lines.push(`Obs: ${note}`);
  }
  return lines.join("\n");
}

// ---------- Drawer / Modal ----------
function openCart(){ cartDrawer.classList.add("isOpen"); cartDrawer.setAttribute("aria-hidden","false"); }
function closeCart(){ cartDrawer.classList.remove("isOpen"); cartDrawer.setAttribute("aria-hidden","true"); }
function openAdmin(){ adminModal.classList.add("isOpen"); adminModal.setAttribute("aria-hidden","false"); syncAdminUI(); }
function closeAdmin(){ adminModal.classList.remove("isOpen"); adminModal.setAttribute("aria-hidden","true"); }

openCartBtn.addEventListener("click", openCart);
openCartBtn2.addEventListener("click", openCart);
openCartBtnHero.addEventListener("click", openCart);
closeCartBtn.addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);

closeAdminBtn.addEventListener("click", closeAdmin);
adminOverlay.addEventListener("click", closeAdmin);
openAdminHintBtn.addEventListener("click", openAdmin);

document.addEventListener("keydown", (e)=>{
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase()==="a"){ e.preventDefault(); openAdmin(); }
  if (e.key === "Escape"){ closeCart(); closeAdmin(); }
});

// ---------- Filters ----------
function renderAll(){
  renderCategoryUI();
  renderProducts();
  renderCart();
  renderWppLinks();
  renderAdminList();
  syncAdminUI();
}
searchBtn.addEventListener("click", renderProducts);
searchInput.addEventListener("input", ()=>{ clearTimeout(window.__t); window.__t=setTimeout(renderProducts, 120); });
categorySelect.addEventListener("change", renderAll);
sortSelect.addEventListener("change", renderProducts);

applyPriceBtn.addEventListener("click", ()=>{
  const min = minPrice.value ? Number(minPrice.value) : null;
  const max = maxPrice.value ? Number(maxPrice.value) : null;
  priceFilter = { min, max };
  renderProducts();
});
clearFiltersBtn.addEventListener("click", ()=>{
  searchInput.value = "";
  categorySelect.value = "all";
  sortSelect.value = "featured";
  minPrice.value = "";
  maxPrice.value = "";
  priceFilter = { min:null, max:null };
  renderAll();
});

// Checkout / clear
checkoutWppBtn.addEventListener("click", ()=>{
  if (!cart.length) return alert("Seu carrinho está vazio.");
  const gone = cart.some(it=>{
    const p = products.find(x=>x.id===it.productId);
    return p && it.size && hasSizes(p) && !availableSizes(p).includes(it.size);
  });
  if (gone) return alert("Algum tamanho do seu carrinho esgotou. Remova o item marcado como (esgotou) para continuar.");
  window.open(wppBaseLink(buildCheckoutMessage()), "_blank", "noopener");
});
clearCartBtn.addEventListener("click", ()=>{
  if (!confirm("Limpar carrinho?")) return;
  cart = [];
  saveJSON(LS.cart, cart);
  renderProducts();
  renderCart();
});

// ---------- Admin ----------
function setTab(tab){
  [tabLogin, tabCatalog, tabSettings].forEach(t=>t.classList.remove("tab--active"));
  [panelLogin, panelCatalog, panelSettings].forEach(p=>p.classList.remove("tabPanel--active"));
  if (tab==="login"){ tabLogin.classList.add("tab--active"); panelLogin.classList.add("tabPanel--active"); }
  if (tab==="catalog"){ tabCatalog.classList.add("tab--active"); panelCatalog.classList.add("tabPanel--active"); }
  if (tab==="settings"){ tabSettings.classList.add("tab--active"); panelSettings.classList.add("tabPanel--active"); }
}
document.querySelectorAll(".tab").forEach(b=>{
  b.addEventListener("click", ()=>{ if (!b.disabled) setTab(b.dataset.tab); });
});

function syncAdminUI(){
  tabCatalog.disabled = !isAdmin;
  tabSettings.disabled = !isAdmin;
  adminLogoutBtn.disabled = !isAdmin;
  if (isAdmin){
    setTab("catalog");
    storeWpp.value = settings.wppNumber || "";
    storeWppMsg.value = settings.wppMessage || "";
    newAdminUser.value = "";
    newAdminPass.value = "";
  } else setTab("login");
}

adminLoginBtn.addEventListener("click", async ()=>{
  const u = (adminUser.value||"").trim();
  const p = (adminPass.value||"").trim();
  try {
    await apiSend("/api/auth/login", "POST", { username: u, password: p });
    isAdmin = true;
    adminUser.value = ""; adminPass.value = "";
    syncAdminUI(); renderAdminList(); renderProducts();
  } catch (err) {
    alert(err.message || "Usuário ou senha inválidos.");
  }
});
adminLogoutBtn.addEventListener("click", async ()=>{
  try { await apiSend("/api/auth/logout", "POST"); } catch {}
  isAdmin = false;
  syncAdminUI(); renderProducts();
});

// ---------- Product image editor (zoom / position) ----------
const DEFAULT_IMG_EDIT = { zoom: 100, x: 50, y: 50 };
let imgEdit = { ...DEFAULT_IMG_EDIT };

function applyImgEditPreview(){
  pImagePreview.style.objectPosition = `${imgEdit.x}% ${imgEdit.y}%`;
  pImagePreview.style.transform = `scale(${imgEdit.zoom/100})`;
  pZoom.value = String(imgEdit.zoom);
  pZoomVal.textContent = `${imgEdit.zoom}%`;
}

async function refreshImagePreviewSrc(){
  let src = "";
  if (pImageFile.files && pImageFile.files[0]) src = await fileToDataURL(pImageFile.files[0]);
  else src = (pImage.value||"").trim();
  pImagePreview.src = src || placeholderImage(pCategory.value.trim());
  applyImgEditPreview();
}
pImage.addEventListener("input", refreshImagePreviewSrc);
pImageFile.addEventListener("change", refreshImagePreviewSrc);

pZoom.addEventListener("input", ()=>{
  imgEdit.zoom = Number(pZoom.value);
  applyImgEditPreview();
});

pImageResetBtn.addEventListener("click", ()=>{
  imgEdit = { ...DEFAULT_IMG_EDIT };
  applyImgEditPreview();
});

let dragState = null;
pImagePreviewWrap.addEventListener("pointerdown", (e)=>{
  dragState = { startX: e.clientX, startY: e.clientY, origX: imgEdit.x, origY: imgEdit.y };
  pImagePreviewWrap.setPointerCapture(e.pointerId);
});
pImagePreviewWrap.addEventListener("pointermove", (e)=>{
  if (!dragState) return;
  const rect = pImagePreviewWrap.getBoundingClientRect();
  const dx = (e.clientX - dragState.startX) / rect.width * 100;
  const dy = (e.clientY - dragState.startY) / rect.height * 100;
  imgEdit.x = clamp(dragState.origX - dx, 0, 100);
  imgEdit.y = clamp(dragState.origY - dy, 0, 100);
  applyImgEditPreview();
});
["pointerup","pointercancel","pointerleave"].forEach(ev=>{
  pImagePreviewWrap.addEventListener(ev, ()=>{ dragState = null; });
});

// ---------- Product sizes editor ----------
// sizeEdit.options = todos os botões exibidos (sugestões + extras do dono);
// sizeEdit.selected = os que estão em estoque e vão para a vitrine.
let sizeEdit = { options: [], selected: new Set() };
let sizeTypeTouched = false;

function guessSizeType(category){
  const c = (category||"").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/tenis|calcado|sapat|chinelo|bota/.test(c)) return "shoes";
  if (/oculos|bone|acessorio|relogio|carteira|cueca/.test(c)) return "none";
  return "clothing";
}

function setSizeEditor(type, sizes){
  pSizeType.value = type;
  const preset = SIZE_PRESETS[type] || [];
  const extras = (sizes||[]).filter(s=>!preset.includes(s));
  sizeEdit = { options: [...preset, ...extras], selected: new Set(sizes||[]) };
  renderSizeEditor();
}

function renderSizeEditor(){
  pSizesBox.hidden = pSizeType.value === "none";
  pSizes.innerHTML = sizeEdit.options.map(s=>
    `<button type="button" class="sizeChip${sizeEdit.selected.has(s) ? " isActive" : ""}" data-size="${escapeHTML(s)}">${escapeHTML(s)}</button>`
  ).join("");
  pSizes.querySelectorAll("[data-size]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const s = b.dataset.size;
      if (sizeEdit.selected.has(s)) sizeEdit.selected.delete(s);
      else sizeEdit.selected.add(s);
      renderSizeEditor();
    });
  });
}

function selectedSizesInOrder(){
  return sizeEdit.options.filter(s=>sizeEdit.selected.has(s));
}

pSizeType.addEventListener("change", ()=>{
  sizeTypeTouched = true;
  setSizeEditor(pSizeType.value, []);
});

// Em produto novo, sugere o tipo de tamanho pela categoria (até o dono escolher na mão).
pCategory.addEventListener("input", ()=>{
  if (pId.value || sizeTypeTouched) return;
  const type = guessSizeType(pCategory.value);
  if (type !== pSizeType.value) setSizeEditor(type, []);
});

function addCustomSize(){
  const s = (pSizeCustom.value||"").trim().toUpperCase();
  if (!s) return;
  if (!sizeEdit.options.includes(s)) sizeEdit.options.push(s);
  sizeEdit.selected.add(s);
  pSizeCustom.value = "";
  renderSizeEditor();
}
pSizeAddBtn.addEventListener("click", addCustomSize);
pSizeCustom.addEventListener("keydown", (e)=>{
  if (e.key === "Enter"){ e.preventDefault(); addCustomSize(); }
});

function clearForm(){
  pId.value = "";
  pName.value = "";
  pCategory.value = "";
  pPrice.value = "";
  pFeatured.value = "true";
  pDesc.value = "";
  pImage.value = "";
  pImageFile.value = "";
  pSizeCustom.value = "";
  sizeTypeTouched = false;
  setSizeEditor("none", []);
  imgEdit = { ...DEFAULT_IMG_EDIT };
  refreshImagePreviewSrc();
}
clearFormBtn.addEventListener("click", clearForm);

async function fileToDataURL(file){
  return new Promise((resolve, reject)=>{
    const r = new FileReader();
    r.onload = ()=>resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Reduz a foto antes de enviar: foto de celular tem vários MB e deixava o
// salvamento (e o carregamento da loja) muito lento.
async function compressImage(file, maxSide = 1200, quality = 0.82){
  const src = await fileToDataURL(file);
  try {
    const img = new Image();
    await new Promise((resolve, reject)=>{ img.onload = resolve; img.onerror = reject; img.src = src; });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; // PNG transparente não fica preto no JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const out = canvas.toDataURL("image/jpeg", quality);
    return out.length < src.length ? out : src;
  } catch {
    return src; // formato que o navegador não desenha: envia como está
  }
}

productForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  if (!isAdmin) return alert("Faça login.");
  // Evita salvar o mesmo produto duas vezes com cliques repetidos.
  const submitBtn = productForm.querySelector('[type="submit"]');
  if (submitBtn.disabled) return;
  submitBtn.disabled = true;
  submitBtn.textContent = "Salvando...";
  try {
    await saveProduct();
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Salvar";
  }
});

async function saveProduct(){
  let img = (pImage.value||"").trim();
  if (pImageFile.files && pImageFile.files[0]) img = await compressImage(pImageFile.files[0]);

  const category = pCategory.value.trim();
  const name = pName.value.trim();
  const id = pId.value;

  // Foto enviada por arquivo (data:) não aparece no campo de URL ao editar;
  // sem isso, salvar a edição (ex.: marcar como esgotado) apagaria a foto.
  if (!img && id){
    const existing = products.find(x=>x.id===id);
    if (existing?.image && String(existing.image).startsWith("data:")) img = existing.image;
  }

  const payload = {
    name,
    category,
    price: Number(pPrice.value),
    featured: pFeatured.value === "true",
    desc: pDesc.value.trim(),
    image: img || null,
    imageZoom: imgEdit.zoom,
    imagePos: { x: imgEdit.x, y: imgEdit.y },
    sizeType: pSizeType.value,
    sizes: pSizeType.value === "none" ? [] : selectedSizesInOrder(),
  };

  if (payload.sizeType !== "none" && !payload.sizes.length
      && !confirm("Nenhum tamanho marcado: o produto vai aparecer como ESGOTADO na vitrine. Salvar mesmo assim?")) return;

  try {
    if (id) await apiSend(`/api/products/${id}`, "PUT", payload);
    else await apiSend("/api/products", "POST", payload);
    products = await apiGet("/api/products");
    clearForm();
    renderAll();
    alert("Produto salvo.");
  } catch (err) {
    alert(err.message || "Não foi possível salvar o produto.");
  }
}

function renderAdminList(){
  adminProductsList.innerHTML = "";
  const list = [...products].sort((a,b)=>a.name.localeCompare(b.name));
  list.forEach(p=>{
    const el = document.createElement("div");
    el.className = "adminItem";
    el.innerHTML = `
      <img src="${p.image || placeholderImage(p.category)}" alt="${escapeHTML(p.name)}" />
      <div>
        <div style="font-weight:800">${escapeHTML(p.name)}</div>
        <div class="muted">${escapeHTML(p.category||"")} • ${moneyBR(p.price||0)} ${p.featured ? "• Destaque" : ""}</div>
        ${hasSizes(p) ? `<div class="muted">${isSoldOut(p) ? `<strong style="color:#991b1b">Esgotado</strong>` : `Tamanhos: <strong>${escapeHTML(availableSizes(p).join(", "))}</strong>`}</div>` : ""}
      </div>
      <div class="row" style="justify-content:flex-end">
        <button class="btn btn--ghost" data-edit="${p.id}">Editar</button>
        <button class="btn btn--ghost" style="border-color:#fecaca;color:#991b1b" data-del="${p.id}">Excluir</button>
      </div>
    `;
    el.querySelector("img").onerror = ()=> el.querySelector("img").src = svgFallback;
    el.querySelector("[data-edit]").addEventListener("click", ()=>loadToForm(p.id));
    el.querySelector("[data-del]").addEventListener("click", ()=>delProduct(p.id));
    adminProductsList.appendChild(el);
  });
}

function loadToForm(id){
  const p = products.find(x=>x.id===id);
  if (!p) return;
  pId.value = p.id;
  pName.value = p.name || "";
  pCategory.value = p.category || "";
  pPrice.value = String(p.price ?? "");
  pFeatured.value = p.featured ? "true" : "false";
  pDesc.value = p.desc || "";
  pImage.value = (p.image && !String(p.image).startsWith("data:")) ? p.image : "";
  pImageFile.value = "";
  pSizeCustom.value = "";
  sizeTypeTouched = true;
  setSizeEditor(p.sizeType || "none", p.sizes || []);
  imgEdit = { zoom: p.imageZoom || DEFAULT_IMG_EDIT.zoom, x: p.imagePos?.x ?? DEFAULT_IMG_EDIT.x, y: p.imagePos?.y ?? DEFAULT_IMG_EDIT.y };
  pImagePreview.src = p.image || placeholderImage(p.category);
  applyImgEditPreview();
  setTab("catalog");
}

async function delProduct(id){
  if (!confirm("Excluir este produto?")) return;
  try {
    await apiSend(`/api/products/${id}`, "DELETE");
    cart = cart.filter(i=>i.productId!==id);
    saveJSON(LS.cart, cart);
    products = await apiGet("/api/products");
    renderAll();
  } catch (err) {
    alert(err.message || "Não foi possível excluir o produto.");
  }
}

// Settings
saveSettingsBtn.addEventListener("click", async ()=>{
  if (!isAdmin) return alert("Faça login.");
  try {
    settings = await apiSend("/api/settings", "PUT", {
      wppNumber: (storeWpp.value||"").trim(),
      wppMessage: (storeWppMsg.value||"").trim(),
    });
    renderWppLinks();
    renderCart();
    alert("Configurações salvas.");
  } catch (err) {
    alert(err.message || "Não foi possível salvar as configurações.");
  }
});

saveCredsBtn.addEventListener("click", async ()=>{
  if (!isAdmin) return alert("Faça login.");
  const u = (newAdminUser.value||"").trim();
  const p = (newAdminPass.value||"").trim();
  if (!u && !p) return alert("Preencha usuário e/ou senha novos.");
  try {
    await apiSend("/api/auth/credentials", "PUT", { username: u || undefined, password: p || undefined });
    newAdminUser.value = ""; newAdminPass.value = "";
    alert("Credenciais atualizadas.");
  } catch (err) {
    alert(err.message || "Não foi possível atualizar as credenciais.");
  }
});

// ---------- Particles canvas ----------
function initParticles(){
  const canvas = document.getElementById("particlesCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w, h, dpr;
  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = Math.floor(innerWidth * dpr);
    h = canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
  }
  resize();
  addEventListener("resize", resize);

  const N = Math.min(90, Math.floor(innerWidth / 14));
  const pts = Array.from({length:N}, ()=>({
    x: Math.random()*w,
    y: Math.random()*h,
    vx: (Math.random()-.5) * 0.35 * dpr,
    vy: (Math.random()-.5) * 0.35 * dpr,
    r: (Math.random()*1.6 + 0.6) * dpr,
  }));

  function tick(){
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = "rgba(23,184,174,.55)";
    for (const p of pts){
      p.x += p.vx; p.y += p.vy;
      if (p.x < -20 || p.x > w+20) p.vx *= -1;
      if (p.y < -20 || p.y > h+20) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  tick();
}

// Init
async function init(){
  initParticles();
  try {
    const [productsData, settingsData, meData] = await Promise.all([
      apiGet("/api/products"),
      apiGet("/api/settings"),
      apiGet("/api/auth/me"),
    ]);
    products = productsData;
    settings = settingsData;
    isAdmin = !!meData.isAdmin;
  } catch (err) {
    console.error("Falha ao carregar dados do servidor:", err);
  }
  renderAll();
}
init();
