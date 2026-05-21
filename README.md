# term-project
 link to live deployed site- http://167.99.0.219:3000

MysteryBox Market is a simple e-commerce website for a CSC 317 class project. The fake company sells themed mystery boxes, such as gaming boxes, snack boxes, tech boxes, book boxes, and pet boxes.

## Features

- Home/storefront page with 12 products
- Product detail page with image, description, price, and stock
- Search by product name, theme, description, or product ID
- User registration and login
- Password hashing with bcryptjs
- User profile page
- Purchase history saved in SQLite
- Shopping cart using sessions
- Mock checkout/payment page
- Stock decreases after checkout
- About page
- FAQ page
- Navigation bar on every page
- Small JSON API at `/api/products`

## Tech Stack

- Node.js
- Express.js
- SQLite
- Pug templates
- HTML, CSS, and JavaScript
- bcryptjs for password hashing
- express-session for login sessions and cart sessions

## How to Run Locally


## Important Files

```text
term-project/
├── app.js                    # Optional starter file that loads server.js
├── server.js                 # Main Express app and website routes
├── db/
│   └── database.js           # SQLite tables and product seed data
├── public/
│   ├── css/style.css         # Website styling
│   ├── js/main.js            # Small browser JavaScript file
│   └── images/               # Product images
├── views/                    # Pug page templates
├── package.json              # Project dependencies and scripts
└── README.md                 # Project information
```

## Demo Login

There is no hard-coded demo account. Create an account from the Register page. The password will be hashed before it is saved to the database.



## Class Rubric Checklist

- Backend with Node.js and Express: complete
- SQLite database: complete
- HTML/CSS/JavaScript frontend: complete
- Login and registration: complete
- Password hashing: complete
- Minimum 12 products: complete
- Product detail page: complete
- Search functionality: complete
- User profile page: complete
- Purchase history: complete
- Navigation bar: complete
- About page: complete
- FAQ page: complete
- Cart and mock checkout: complete
- GitHub repository: complete
- Active team member commits: complete
- Glitch deployment: you still need to deploy it
