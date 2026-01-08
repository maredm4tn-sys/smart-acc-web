
const Database = require('better-sqlite3');
const db = new Database('smart-acc-offline.db');

try {
    const suppliersCount = db.prepare('SELECT COUNT(*) as count FROM suppliers').get();
    const suppliers = db.prepare('SELECT * FROM suppliers').all();
    console.log('Suppliers Count:', suppliersCount.count);
    console.log('Suppliers List:', suppliers);

    const customersCount = db.prepare('SELECT COUNT(*) as count FROM customers').get();
    console.log('Customers Count:', customersCount.count);
} catch (e) {
    console.error('Error reading database:', e.message);
} finally {
    db.close();
}
