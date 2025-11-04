const sqlite = require('sqlite3').verbose();
const { SQLITE_FILE } = require('../config');

const db = new sqlite.Database(SQLITE_FILE);

db.serialize(() => {
    db.run("DROP TABLE IF EXISTS products");
    db.run("DROP TABLE IF EXISTS orders");
    db.run("DROP TABLE IF EXISTS order_items");

    db.run("CREATE TABLE products(product_id INTEGER PRIMARY KEY, name TEXT, category TEXT)");
    db.run("CREATE TABLE orders(order_id INTEGER PRIMARY KEY, order_date TEXT, region TEXT)");
    db.run("CREATE TABLE order_items(order_item_id INTEGER PRIMARY KEY, order_id INTEGER, product_id INTEGER, quantity INTEGER, price REAL)");

    const p = db.prepare("INSERT INTO products (name, category) VALUES (?, ?)");
    p.run("Alpha T-Shirt", "Clothing"); p.run("Beta Jeans", "Home"); p.run ("Gamma Phone Case", "Electronics"); p.finalize();

    const o = db.prepare("INSERT INTO orders (order_date, region) VALUES (?, ?)");
    o.run("2023-10-01", "North America"); o.run("2023-10-02", "Europe"); o.finalize();

    const oi = db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
    oi.run(1, 1, 2, 19.99); oi.run(1, 3, 1, 9.99); oi.run(2, 2, 1, 49.99); oi.finalize();

})

db.close();
console.log("Database initialized.", SQLITE_FILE);