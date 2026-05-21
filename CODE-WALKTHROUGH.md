# Code Walkthrough for Presentation
We use let db at the top so the database connection can be stored later after setupDb() finishes running. Since connecting to the database is asynchronous, the app must wait until the database is ready before starting the server. That is why app.listen() is placed inside setupDb().then(...). This guarantees that all routes can safely use db without crashing.
## 1. `server.js`

This is the main Express file. It starts the app, sets up sessions, connects to SQLite, and defines the website routes.

The most important parts are:

- `app.use(express.urlencoded(...))`: lets the server read form data.
- `app.use(express.static(...))`: serves CSS, browser JavaScript, and images.
- `app.use(session(...))`: remembers the logged-in user and shopping cart.
- `requireLogin(...)`: protects pages like Profile and Checkout.
- `getCartDetails(...)`: turns the cart product IDs into real product information from SQLite.

## 2. `db/database.js`

This file creates the SQLite database tables:

- `products`: stores the 12 mystery boxes.
- `users`: stores registered users.
- `orders`: stores completed checkouts.
- `order_items`: stores the products inside each order.

The file also adds the 12 products automatically the first time the app starts.

## 3. Authentication

Registration uses bcryptjs:

```js
const passwordHash = await bcrypt.hash(password, 10);
```

Login checks the password with:

```js
const passwordMatches = await bcrypt.compare(password, user.password_hash);
```

This means the real password is never saved in the database.

## 4. Cart

The cart is stored in the session. It looks like this:

```js
{
  "box-001": 2,
  "box-005": 1
}
```

That means the user has 2 of product `box-001` and 1 of product `box-005`.

## 5. Checkout

Checkout is mocked, so no real card is charged. When checkout is submitted, the app:

1. Checks that the user is logged in.
2. Checks that the cart is not empty.
3. Checks product stock.
4. Creates an order.
5. Creates order items.
6. Reduces product stock.
7. Clears the cart.

## 6. Views

The `views` folder contains Pug templates. `layout.pug` is the shared page wrapper. Every page uses it so the navbar and footer stay consistent.

## 7. Public Folder

The `public` folder contains files the browser can download directly:

- CSS file
- Small JavaScript file
- Product SVG images
