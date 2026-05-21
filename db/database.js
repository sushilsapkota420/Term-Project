// db/database.js
// ------------------------------------------------------------
// This file is only responsible for the database.
// Keeping database setup in one file makes server.js easier to read.
//
// Our app uses SQLite, which means the whole database lives in one
// local file on the computer. That is perfect for a class project
// because we do not need to pay for a cloud database.
// ------------------------------------------------------------

const fs = require("fs");
const path = require("path"); 
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

// The database file will be saved inside the db folder.
// __dirname means "the folder this file is currently inside".
const databasePath = path.join(__dirname, "mystery_boxes.sqlite");

async function openDb() {
  // Make sure the db folder exists before SQLite tries to create the file.
  // recursive: true means "do not crash if the folder already exists".
  fs.mkdirSync(__dirname, { recursive: true });

  return open({
    filename: databasePath,
    driver: sqlite3.Database,
  });
}

async function setupDb() {
  const db = await openDb();

  // SQLite does not always enforce foreign keys unless we turn this on.
  // Foreign keys help connect orders to users and order items to orders.
  await db.exec("PRAGMA foreign_keys = ON");

  // Products are the mystery boxes shown on the storefront.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      theme TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL,
      image TEXT NOT NULL
    )
  `);

  // Users are created from the registration form.
  // Notice that we store password_hash, not the real password.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // An order is created when a logged-in user finishes checkout.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Each order can have many products, so we keep the line items here.
  // We also save product_name and price at the time of purchase, because
  // product names/prices might change later but the receipt should not.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Only seed products if the products table is empty.
  // This prevents duplicate products every time we restart the server.
  const result = await db.get("SELECT COUNT(*) AS count FROM products");

  if (result.count === 0) {
    const starterProducts = [
      {
        id: "box-001",
        name: "Starter Surprise Box",
        theme: "Gaming",
        description:
          "A beginner-friendly mystery box with gaming stickers, a mini figure, and a random accessory.",
        price: 24.99,
        stock: 10,
        image: "/images/box-001.svg",
      },
      {
        id: "box-002",
        name: "Collector Chaos Box",
        theme: "Anime",
        description:
          "A fun collector box with anime-inspired keychains, pins, art cards, and one rare surprise item.",
        price: 39.99,
        stock: 6,
        image: "/images/box-002.svg",
      },
      {
        id: "box-003",
        name: "Cozy Mystery Box",
        theme: "Self Care",
        description:
          "A relaxing box with cozy socks, tea, a candle, and a small self-care surprise.",
        price: 29.99,
        stock: 14,
        image: "/images/box-003.svg",
      },
      {
        id: "box-004",
        name: "Tech Treasure Box",
        theme: "Technology",
        description:
          "A technology-themed box with useful desk gadgets, cable organizers, and a mystery tech item.",
        price: 44.99,
        stock: 8,
        image: "/images/box-004.svg",
      },
      {
        id: "box-005",
        name: "Snack Attack Box",
        theme: "Snacks",
        description:
          "A tasty mystery box filled with sweet, salty, and international snack surprises.",
        price: 19.99,
        stock: 20,
        image: "/images/box-005.svg",
      },
      {
        id: "box-006",
        name: "Art Supply Drop Box",
        theme: "Art",
        description:
          "A creative box with markers, sketch supplies, stickers, and a random art challenge card.",
        price: 34.99,
        stock: 12,
        image: "/images/box-006.svg",
      },
      {
        id: "box-007",
        name: "Bookworm Bundle Box",
        theme: "Books",
        description:
          "A reading-themed box with a surprise paperback, bookmark, notebook, and cozy reading treat.",
        price: 27.99,
        stock: 9,
        image: "/images/box-007.svg",
      },
      {
        id: "box-008",
        name: "Fitness Find Box",
        theme: "Fitness",
        description:
          "A workout mystery box with a resistance band, shaker bottle, towel, and motivational extras.",
        price: 32.99,
        stock: 11,
        image: "/images/box-008.svg",
      },
      {
        id: "box-009",
        name: "Pet Pal Surprise Box",
        theme: "Pets",
        description:
          "A pet-friendly box with toys, treats, and a surprise accessory for cats or dogs.",
        price: 26.99,
        stock: 16,
        image: "/images/box-009.svg",
      },
      {
        id: "box-010",
        name: "Retro Rewind Box",
        theme: "Retro",
        description:
          "A nostalgic box with retro stickers, small collectibles, candy, and an old-school surprise.",
        price: 31.99,
        stock: 7,
        image: "/images/box-010.svg",
      },
      {
        id: "box-011",
        name: "Study Boost Box",
        theme: "School",
        description:
          "A student box with stationery, sticky notes, snacks, and small items to make studying easier.",
        price: 21.99,
        stock: 18,
        image: "/images/box-011.svg",
      },
      {
        id: "box-012",
        name: "Premium Vault Box",
        theme: "Premium",
        description:
          "Our highest-value mystery box with premium collectibles and one guaranteed deluxe surprise.",
        price: 59.99,
        stock: 5,
        image: "/images/box-012.svg",
      },
    ];

    // Insert every product with a prepared SQL statement.
    // The question marks are placeholders. They keep our app safe from SQL injection.
    for (const product of starterProducts) {
      await db.run(
        `INSERT INTO products (id, name, theme, description, price, stock, image)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          product.id,
          product.name,
          product.theme,
          product.description,
          product.price,
          product.stock,
          product.image,
        ]
      );
    }
  }

  return db;
}

module.exports = setupDb;
