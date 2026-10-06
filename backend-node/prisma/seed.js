const prisma = require('../src/prisma');

async function main() {
  const count = await prisma.product.count();
  if (count > 0) {
    console.log('Seed skipped: products already exist.');
    return;
  }
  console.log('Seeding sample data...');

  const cats = await Promise.all([
    prisma.category.create({ data: { name: 'Electronics', description: 'Electronic parts and components' } }),
    prisma.category.create({ data: { name: 'Hardware', description: 'General hardware supplies' } }),
    prisma.category.create({ data: { name: 'Consumables', description: 'Consumable items' } }),
  ]);

  const sups = await Promise.all([
    prisma.supplier.create({ data: { name: 'Sharma Traders', contact: 'Ravi Sharma', phone: '+91 98765 43210', email: 'ravi@sharma.in', address: 'Mumbai, India' } }),
    prisma.supplier.create({ data: { name: 'Krishna Distributors', contact: 'Meena Krishna', phone: '+91 99887 76655', email: 'sales@krishna.co.in', address: 'Bengaluru, India' } }),
    prisma.supplier.create({ data: { name: 'Bharat Industrial Supply', contact: 'Anil Verma', phone: '+91 91234 56789', email: 'info@bharatis.in', address: 'Delhi, India' } }),
  ]);

  const projs = await Promise.all([
    prisma.project.create({ data: { name: 'Site A - Warehouse Fitout', description: 'Warehouse installation project' } }),
    prisma.project.create({ data: { name: 'Site B - Office Renovation', description: 'Office renovation and upgrade' } }),
    prisma.project.create({ data: { name: 'R&D Lab Setup', description: 'Research lab equipment setup' } }),
  ]);

  const products = [
    { sku: 'PRD-0001', name: 'LED Bulb 9W', unit: 'pcs', price: 120, minStock: 20, currentStock: 150, category: cats[0].id, supplier: sups[0].id },
    { sku: 'PRD-0002', name: 'Copper Wire 2.5mm (100m)', unit: 'roll', price: 2500, minStock: 5, currentStock: 8, category: cats[0].id, supplier: sups[1].id },
    { sku: 'PRD-0003', name: 'MCB 16A', unit: 'pcs', price: 180, minStock: 30, currentStock: 22, category: cats[0].id, supplier: sups[0].id },
    { sku: 'PRD-0004', name: 'Screwdriver Set', unit: 'set', price: 450, minStock: 10, currentStock: 40, category: cats[1].id, supplier: sups[2].id },
    { sku: 'PRD-0005', name: 'Cement Bag 50kg', unit: 'bag', price: 380, minStock: 25, currentStock: 12, category: cats[1].id, supplier: sups[2].id },
    { sku: 'PRD-0006', name: 'Safety Gloves', unit: 'pair', price: 90, minStock: 50, currentStock: 200, category: cats[2].id, supplier: sups[1].id },
    { sku: 'PRD-0007', name: 'Insulation Tape', unit: 'roll', price: 40, minStock: 40, currentStock: 35, category: cats[2].id, supplier: sups[0].id },
    { sku: 'PRD-0008', name: 'PVC Pipe 1 inch (3m)', unit: 'pcs', price: 220, minStock: 15, currentStock: 60, category: cats[1].id, supplier: sups[2].id },
  ];

  const createdProducts = [];
  for (const p of products) {
    const item = await prisma.product.create({
      data: {
        sku: p.sku,
        name: p.name,
        unit: p.unit,
        price: p.price,
        minStock: p.minStock,
        currentStock: p.currentStock,
        categoryId: p.category,
        supplierId: p.supplier,
      },
    });
    createdProducts.push(item);
  }

  // Seed some transactions
  const now = new Date();
  for (let i = 0; i < 15; i++) {
    const p = createdProducts[i % createdProducts.length];
    const daysAgo = Math.floor(Math.random() * 90);
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const isIn = Math.random() > 0.55;
    if (isIn) {
      await prisma.transaction.create({
        data: { type: 'IN', productId: p.id, quantity: 10 + Math.floor(Math.random() * 40), date, note: 'Initial restock' },
      });
    } else {
      const proj = projs[Math.floor(Math.random() * projs.length)];
      await prisma.transaction.create({
        data: { type: 'OUT', productId: p.id, projectId: proj.id, quantity: 1 + Math.floor(Math.random() * 8), date, note: 'Used on site' },
      });
    }
  }

  console.log('Seed complete.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
