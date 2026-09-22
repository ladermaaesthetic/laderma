import { db } from './db.js';

// Treatment categories + their items, backed by the shared libSQL client
// in db.js (a local SQLite file by default, or a free Turso database in
// production — see db.js and server/.env.example). The data genuinely
// needs relational shape (categories with many ordered items each, added/
// edited/removed independently), so a single JSON file would mean
// rewriting the whole pricing list on every small edit.
let ready = null;

function init() {
  if (ready) return ready;
  ready = db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `).then(() => db.execute(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `));
  return ready;
}

function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function nextSortOrder(table, whereClause = '', args = []) {
  const result = await db.execute({
    sql: `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM ${table} ${whereClause}`,
    args,
  });
  return Number(result.rows[0].next);
}

// ---------------------------------------------------------------------------
// Seeding — runs once, only if the categories table is empty. Never
// overwrites existing rows, so once an admin starts editing through the
// panel, re-deploys never silently reset their changes.
// ---------------------------------------------------------------------------
export async function seedFromStaticDataIfEmpty(staticCategories) {
  await init();
  const countResult = await db.execute('SELECT COUNT(*) AS count FROM categories');
  if (Number(countResult.rows[0].count) > 0) return;

  const tx = await db.transaction('write');
  try {
    for (const [catIndex, cat] of staticCategories.entries()) {
      await tx.execute({
        sql: 'INSERT INTO categories (id, title, description, sort_order) VALUES (?, ?, ?, ?)',
        args: [cat.id, cat.title, cat.desc || '', catIndex],
      });
      for (const [itemIndex, item] of (cat.items || []).entries()) {
        await tx.execute({
          sql: 'INSERT INTO items (category_id, name, price, sort_order) VALUES (?, ?, ?, ?)',
          args: [cat.id, item.name, item.price, itemIndex],
        });
      }
    }
    await tx.commit();
    console.log(`Seeded pricing database with ${staticCategories.length} categories.`);
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
export async function getAllCategories() {
  await init();
  const categoriesResult = await db.execute(
    'SELECT id, title, description AS desc, sort_order FROM categories ORDER BY sort_order ASC'
  );

  const categories = [];
  for (const cat of categoriesResult.rows) {
    const itemsResult = await db.execute({
      sql: 'SELECT id, name, price FROM items WHERE category_id = ? ORDER BY sort_order ASC',
      args: [cat.id],
    });
    categories.push({
      id: cat.id,
      title: cat.title,
      desc: cat.desc,
      sort_order: Number(cat.sort_order),
      items: itemsResult.rows.map((item) => ({ id: Number(item.id), name: item.name, price: item.price })),
    });
  }
  return categories;
}

export async function getCategoryById(id) {
  await init();
  const catResult = await db.execute({
    sql: 'SELECT id, title, description AS desc, sort_order FROM categories WHERE id = ?',
    args: [id],
  });
  const cat = catResult.rows[0];
  if (!cat) return null;

  const itemsResult = await db.execute({
    sql: 'SELECT id, name, price FROM items WHERE category_id = ? ORDER BY sort_order ASC',
    args: [id],
  });

  return {
    id: cat.id,
    title: cat.title,
    desc: cat.desc,
    sort_order: Number(cat.sort_order),
    items: itemsResult.rows.map((item) => ({ id: Number(item.id), name: item.name, price: item.price })),
  };
}

// ---------------------------------------------------------------------------
// Category CRUD
// ---------------------------------------------------------------------------
export async function createCategory({ title, description }) {
  if (!title || !title.trim()) throw new Error('Category title is required.');
  await init();

  let id = slugify(title);
  if (!id) throw new Error('Category title must contain at least one letter or number.');

  const existingResult = await db.execute({ sql: 'SELECT id FROM categories WHERE id = ?', args: [id] });
  if (existingResult.rows.length > 0) {
    // Disambiguate rather than fail outright — keeps the admin flow smooth
    // if two categories would naturally slugify to the same id.
    let suffix = 2;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const candidate = `${id}-${suffix}`;
      const clashResult = await db.execute({ sql: 'SELECT id FROM categories WHERE id = ?', args: [candidate] });
      if (clashResult.rows.length === 0) {
        id = candidate;
        break;
      }
      suffix += 1;
    }
  }

  const order = await nextSortOrder('categories');
  await db.execute({
    sql: 'INSERT INTO categories (id, title, description, sort_order) VALUES (?, ?, ?, ?)',
    args: [id, title.trim(), (description || '').trim(), order],
  });

  return getCategoryById(id);
}

export async function updateCategory(id, { title, description }) {
  await init();
  const existingResult = await db.execute({ sql: 'SELECT id FROM categories WHERE id = ?', args: [id] });
  if (existingResult.rows.length === 0) throw new Error('Category not found.');
  if (!title || !title.trim()) throw new Error('Category title is required.');

  await db.execute({
    sql: 'UPDATE categories SET title = ?, description = ? WHERE id = ?',
    args: [title.trim(), (description || '').trim(), id],
  });

  return getCategoryById(id);
}

export async function deleteCategory(id) {
  await init();
  const existingResult = await db.execute({ sql: 'SELECT id FROM categories WHERE id = ?', args: [id] });
  if (existingResult.rows.length === 0) throw new Error('Category not found.');

  const tx = await db.transaction('write');
  try {
    await tx.execute({ sql: 'DELETE FROM items WHERE category_id = ?', args: [id] });
    await tx.execute({ sql: 'DELETE FROM categories WHERE id = ?', args: [id] });
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function reorderCategories(orderedIds) {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw new Error('orderedIds must be a non-empty array.');
  }
  await init();
  const tx = await db.transaction('write');
  try {
    for (const [index, id] of orderedIds.entries()) {
      await tx.execute({ sql: 'UPDATE categories SET sort_order = ? WHERE id = ?', args: [index, id] });
    }
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Item CRUD
// ---------------------------------------------------------------------------
export async function createItem(categoryId, { name, price }) {
  await init();
  const categoryResult = await db.execute({ sql: 'SELECT id FROM categories WHERE id = ?', args: [categoryId] });
  if (categoryResult.rows.length === 0) throw new Error('Category not found.');
  if (!name || !name.trim()) throw new Error('Item name is required.');
  if (price === undefined || price === null || String(price).trim() === '') {
    throw new Error('Item price is required.');
  }

  const order = await nextSortOrder('items', 'WHERE category_id = ?', [categoryId]);
  const result = await db.execute({
    sql: 'INSERT INTO items (category_id, name, price, sort_order) VALUES (?, ?, ?, ?)',
    args: [categoryId, name.trim(), String(price).trim(), order],
  });

  return { id: Number(result.lastInsertRowid), categoryId, name: name.trim(), price: String(price).trim() };
}

export async function updateItem(itemId, { name, price }) {
  await init();
  const existingResult = await db.execute({ sql: 'SELECT id FROM items WHERE id = ?', args: [itemId] });
  if (existingResult.rows.length === 0) throw new Error('Item not found.');
  if (!name || !name.trim()) throw new Error('Item name is required.');
  if (price === undefined || price === null || String(price).trim() === '') {
    throw new Error('Item price is required.');
  }

  await db.execute({
    sql: 'UPDATE items SET name = ?, price = ? WHERE id = ?',
    args: [name.trim(), String(price).trim(), itemId],
  });

  const result = await db.execute({
    sql: 'SELECT id, category_id AS categoryId, name, price FROM items WHERE id = ?',
    args: [itemId],
  });
  const row = result.rows[0];
  return { id: Number(row.id), categoryId: row.categoryId, name: row.name, price: row.price };
}

export async function deleteItem(itemId) {
  await init();
  const existingResult = await db.execute({ sql: 'SELECT id FROM items WHERE id = ?', args: [itemId] });
  if (existingResult.rows.length === 0) throw new Error('Item not found.');
  await db.execute({ sql: 'DELETE FROM items WHERE id = ?', args: [itemId] });
}

export async function reorderItems(categoryId, orderedItemIds) {
  if (!Array.isArray(orderedItemIds) || orderedItemIds.length === 0) {
    throw new Error('orderedItemIds must be a non-empty array.');
  }
  await init();
  const tx = await db.transaction('write');
  try {
    for (const [index, id] of orderedItemIds.entries()) {
      await tx.execute({
        sql: 'UPDATE items SET sort_order = ? WHERE id = ? AND category_id = ?',
        args: [index, id, categoryId],
      });
    }
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}
