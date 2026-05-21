// server.js


const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const setupDb = require("./db/database"); 

const app = express();
const PORT = process.env.PORT || 3000;

// We create db here, but we connect to it at the bottom of the file.
let db;

// ------------------------------------------------------------
// Basic Express setup
// ------------------------------------------------------------

// This lets Express read form data from POST requests.
// Example: login form, register form, checkout form, etc.
app.use(express.urlencoded({ extended: true }));

// This lets Express read JSON if we ever send JSON to the server.
app.use(express.json());

// This tells Express where our CSS, browser JavaScript, and images are.
app.use(express.static(path.join(__dirname, "public")));

// We are using Pug templates because oour original project already used Pug.
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Sessions let us remember who is logged in and what is in the cart.
// For a class project, the default memory session store is okay.
// For a real business website, we would use a stronger session store.
app.use(
  session({
    secret: process.env.SESSION_SECRET || "mystery box class project secret",
    resave: false,
    saveUninitialized: false,
  })
);

// ------------------------------------------------------------
// Small helper functions
// ------------------------------------------------------------

function cleanText(value) {
  // This turns undefined/null into an empty string and removes extra spaces.
  return String(value || "").trim();
}

function cleanEmail(value) {
  // Emails should be compared in lowercase so AVA@EMAIL.COM and ava@email.com match.
  return cleanText(value).toLowerCase();
}

function formatMoney(value) {
  // This keeps prices looking like money, for example 24.99.
  return Number(value).toFixed(2);
}

function getCart(req) {
  // The cart lives inside the user's session.
  // The shape is simple: { "box-001": 2, "box-005": 1 }
  if (!req.session.cart) {
    req.session.cart = {};
  }

  return req.session.cart;
}

function countCartItems(cart) {
  // This adds all quantities together for the cart number in the navbar.
  return Object.values(cart).reduce((total, quantity) => total + Number(quantity), 0);
}

function requireLogin(req, res, next) {
  // Some pages should only be viewed by logged-in users.
  // If the user is not logged in, send them to the login page.
  if (!req.session.user) {
    req.session.error = "Please log in first.";
    return res.redirect("/login");
  }

  next();
}

async function getCartDetails(req) {
  // This function turns the simple session cart into full product information.
  // It is used on the cart page and the checkout page.
  const cart = getCart(req);
  const items = [];
  let total = 0;

  for (const [productId, quantityFromSession] of Object.entries(cart)) {
    const product = await db.get("SELECT * FROM products WHERE id = ?", [productId]);

    // If a product was deleted from the database, remove it from the cart.
    if (!product) {
      delete cart[productId];
      continue;
    }

    // Keep the quantity safe and simple.
    const requestedQuantity = Number(quantityFromSession) || 1;
    const safeQuantity = Math.max(1, Math.min(requestedQuantity, product.stock));

    // If stock is zero, the item cannot stay in the cart.
    if (product.stock <= 0) {
      delete cart[productId];
      continue;
    }

    cart[productId] = safeQuantity;

    const lineTotal = product.price * safeQuantity;
    total += lineTotal;

    items.push({
      product,
      quantity: safeQuantity,
      lineTotal,
    });
  }

  return { items, total };
}

// ------------------------------------------------------------
// Variables that every Pug page can use
// ------------------------------------------------------------

app.use((req, res, next) => {
  const cart = getCart(req);

  res.locals.currentYear = new Date().getFullYear();
  res.locals.currentUser = req.session.user || null;
  res.locals.cartCount = countCartItems(cart);
  res.locals.money = formatMoney;

  // These messages show one time after a redirect.
  res.locals.message = req.session.message;
  res.locals.error = req.session.error;

  delete req.session.message;
  delete req.session.error;

  next();
});

// ------------------------------------------------------------
// Storefront and regular pages
// ------------------------------------------------------------

async function showStorefront(req, res) {
  const search = cleanText(req.query.q);
  let products;

  if (search.length > 0) {
    // LIKE lets us search by name, theme, description, or product id.
    const term = `%${search}%`;

    products = await db.all(
      `SELECT * FROM products
       WHERE name LIKE ? OR theme LIKE ? OR description LIKE ? OR id LIKE ?
       ORDER BY id`,
      [term, term, term, term]
    );
  } else {
    products = await db.all("SELECT * FROM products ORDER BY id");
  }

  res.render("home", {
    title: "Home",
    products,
    search,
  });
}

// The home page is the storefront.
// /products shows the same page because some users expect that URL.
app.get(["/", "/products"], showStorefront);

app.get("/products/:id", async (req, res) => {
  const productId = cleanText(req.params.id).toLowerCase();
  const product = await db.get("SELECT * FROM products WHERE id = ?", [productId]);

  if (!product) {
    return res.status(404).render("404", {
      title: "Product Not Found",
      missingPage: req.originalUrl,
    });
  }

  res.render("product-detail", {
    title: product.name,
    product,
  });
});

app.get("/about", (req, res) => {
  res.render("about", {
    title: "About",
  });
});

app.get("/faq", (req, res) => {
  res.render("faq", {
    title: "FAQ",
  });
});

// ------------------------------------------------------------
// Register, login, and logout
// ------------------------------------------------------------

app.get("/register", (req, res) => {
  res.render("register", {
    title: "Register",
  });
});

app.post("/register", async (req, res) => {
  const name = cleanText(req.body.name);
  const email = cleanEmail(req.body.email);
  const password = String(req.body.password || "");

  if (!name || !email || !password) {
    return res.status(400).render("register", {
      title: "Register",
      error: "Please fill out every field.",
    });
  }

  if (password.length < 6) {
    return res.status(400).render("register", {
      title: "Register",
      error: "Password should be at least 6 characters.",
    });
  }

  const existingUser = await db.get("SELECT id FROM users WHERE email = ?", [email]);

  if (existingUser) {
    return res.status(409).render("register", {
      title: "Register",
      error: "An account with that email already exists.",
    });
  }

  // bcrypt hashes the password so we do not store the real password.
  const passwordHash = await bcrypt.hash(password, 10);

  const result = await db.run(
    "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
    [name, email, passwordHash]
  );

  // After registering, we log the user in right away.
  req.session.user = {
    id: result.lastID,
    name,
    email,
  };

  req.session.message = "Account created. You are now logged in.";
  res.redirect("/profile");
});

app.get("/login", (req, res) => {
  res.render("login", {
    title: "Login",
  });
});

app.post("/login", async (req, res) => {
  const email = cleanEmail(req.body.email);
  const password = String(req.body.password || "");

  const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);

  if (!user) {
    return res.status(401).render("login", {
      title: "Login",
      error: "Email or password is incorrect.",
    });
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    return res.status(401).render("login", {
      title: "Login",
      error: "Email or password is incorrect.",
    });
  }

  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
  };

  req.session.message = "Welcome back!";
  res.redirect("/profile");
});

app.post("/logout", (req, res) => {
  // We only remove the user login here.
  // The cart can stay so the user does not lose items by accident.
  delete req.session.user;
  req.session.message = "You have been logged out.";
  res.redirect("/");
});

// ------------------------------------------------------------
// Profile and purchase history
// ------------------------------------------------------------

app.get("/profile", requireLogin, async (req, res) => {
  const user = await db.get("SELECT id, name, email, created_at FROM users WHERE id = ?", [
    req.session.user.id,
  ]);

  // This query returns one row for each purchased product.
  // That is enough for a simple purchase history page.
  const purchases = await db.all(
    `SELECT
       orders.id AS order_id,
       orders.created_at,
       orders.total,
       order_items.product_name,
       order_items.quantity,
       order_items.price
     FROM orders
     JOIN order_items ON orders.id = order_items.order_id
     WHERE orders.user_id = ?
     ORDER BY orders.created_at DESC, order_items.id ASC`,
    [req.session.user.id]
  );

  res.render("profile", {
    title: "Profile",
    user,
    purchases,
  });
});

// ------------------------------------------------------------
// Shopping cart
// ------------------------------------------------------------

app.get("/cart", async (req, res) => {
  const cartDetails = await getCartDetails(req);

  res.render("cart", {
    title: "Cart",
    items: cartDetails.items,
    total: cartDetails.total,
  });
});

app.post("/cart/add/:id", async (req, res) => {
  const productId = cleanText(req.params.id).toLowerCase();
  const product = await db.get("SELECT * FROM products WHERE id = ?", [productId]);

  if (!product) {
    req.session.error = "That product does not exist.";
    return res.redirect("/");
  }

  if (product.stock <= 0) {
    req.session.error = "That product is currently sold out.";
    return res.redirect(`/products/${productId}`);
  }

  const cart = getCart(req);
  const currentQuantity = Number(cart[productId] || 0);

  if (currentQuantity >= product.stock) {
    req.session.error = "You already have the maximum available quantity in your cart.";
    return res.redirect("/cart");
  }

  cart[productId] = currentQuantity + 1;
  req.session.message = `${product.name} was added to your cart.`;
  res.redirect("/cart");
});

app.post("/cart/update/:id", async (req, res) => {
  const productId = cleanText(req.params.id).toLowerCase();
  const action = cleanText(req.body.action);
  const cart = getCart(req);
  const product = await db.get("SELECT * FROM products WHERE id = ?", [productId]);

  if (!cart[productId]) {
    return res.redirect("/cart");
  }

  if (action === "increase" && product && cart[productId] < product.stock) {
    cart[productId] += 1;
  }

  if (action === "decrease") {
    cart[productId] -= 1;
  }

  if (action === "remove" || cart[productId] <= 0) {
    delete cart[productId];
  }

  res.redirect("/cart");
});

app.post("/cart/clear", (req, res) => {
  req.session.cart = {};
  req.session.message = "Your cart is now empty.";
  res.redirect("/cart");
});

// ------------------------------------------------------------
// Mock checkout and payment page
// ------------------------------------------------------------

app.get("/checkout", requireLogin, async (req, res) => {
  const cartDetails = await getCartDetails(req);

  if (cartDetails.items.length === 0) {
    req.session.error = "Your cart is empty.";
    return res.redirect("/cart");
  }

  res.render("checkout", {
    title: "Checkout",
    items: cartDetails.items,
    total: cartDetails.total,
  });
});

app.post("/checkout", requireLogin, async (req, res) => {
  const cartDetails = await getCartDetails(req);

  if (cartDetails.items.length === 0) {
    req.session.error = "Your cart is empty.";
    return res.redirect("/cart");
  }

  try {
    // A transaction means all checkout steps must finish together.
    // If one step fails, the database rolls everything back.
    await db.exec("BEGIN TRANSACTION");

    // Check stock again right before placing the order.
    // This matters because stock can change while the user is shopping.
    for (const item of cartDetails.items) {
      const freshProduct = await db.get("SELECT stock FROM products WHERE id = ?", [
        item.product.id,
      ]);

      if (!freshProduct || freshProduct.stock < item.quantity) {
        throw new Error(`${item.product.name} does not have enough stock.`);
      }
    }

    const orderResult = await db.run("INSERT INTO orders (user_id, total) VALUES (?, ?)", [
      req.session.user.id,
      cartDetails.total,
    ]);

    const orderId = orderResult.lastID;

    for (const item of cartDetails.items) {
      await db.run(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.product.id, item.product.name, item.quantity, item.product.price]
      );

      await db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [
        item.quantity,
        item.product.id,
      ]);
    }

    await db.exec("COMMIT");

    // Empty the cart after the order is saved.
    req.session.cart = {};

    res.render("order-success", {
      title: "Order Complete",
      orderId,
      items: cartDetails.items,
      total: cartDetails.total,
    });
  } catch (error) {
    await db.exec("ROLLBACK");
    req.session.error = error.message || "Checkout failed. Please try again.";
    res.redirect("/cart");
  }
});

// ------------------------------------------------------------
// Small JSON API route
// ------------------------------------------------------------
// This is not required for the pages to work, but it is useful to show
// that our products really come from SQLite.

app.get("/api/products", async (req, res) => {
  const products = await db.all("SELECT * FROM products ORDER BY id");
  res.json(products);
});

// ------------------------------------------------------------
// 404 and error pages
// ------------------------------------------------------------

app.use((req, res) => {
  res.status(404).render("404", {
    title: "Page Not Found",
    missingPage: req.originalUrl,
  });
});

app.use((error, req, res, next) => {
  console.error(error);

  res.status(500).render("500", {
    title: "Server Error",
  });
});

// ------------------------------------------------------------
// Start the app
// ------------------------------------------------------------

setupDb()
  .then((database) => {
    db = database;

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
  });
