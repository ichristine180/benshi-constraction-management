/**
 * Seed Script for Construction Manager
 *
 * Run this ONCE after setting up Firebase to populate default data.
 *
 * Prerequisites:
 * 1. Install firebase-admin: npm install -g firebase-admin
 * 2. Download your Firebase service account key from Firebase Console:
 *    Project Settings > Service Accounts > Generate new private key
 * 3. Save it as serviceAccountKey.json in the project root
 *
 * Usage:
 *   node scripts/seed.js
 */

const admin = require('firebase-admin')
const serviceAccount = require('../serviceAccountKey.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

async function seed() {
  console.log('🌱 Seeding Construction Manager database...')

  // Budget Categories
  const categories = [
    { categoryName: 'Foundation', plannedBudget: 5000000 },
    { categoryName: 'Bricks', plannedBudget: 8000000 },
    { categoryName: 'Cement', plannedBudget: 3000000 },
    { categoryName: 'Roofing', plannedBudget: 6000000 },
    { categoryName: 'Electrical', plannedBudget: 2000000 },
    { categoryName: 'Plumbing', plannedBudget: 2000000 },
    { categoryName: 'Doors & Windows', plannedBudget: 4000000 },
    { categoryName: 'Finishing', plannedBudget: 5000000 },
    { categoryName: 'Labor', plannedBudget: 8000000 },
    { categoryName: 'Transport', plannedBudget: 1500000 },
    { categoryName: 'Miscellaneous', plannedBudget: 1500000 },
  ]

  for (const cat of categories) {
    await db.collection('budget_categories').add({
      ...cat,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  }
  console.log(`✅ Created ${categories.length} budget categories`)

  // Materials
  const materials = [
    { name: 'Cement', unit: 'bags', currentStock: 0, minimumStock: 20, unitPrice: 15000 },
    { name: 'Bricks', unit: 'pieces', currentStock: 0, minimumStock: 1000, unitPrice: 150 },
    { name: 'Sand', unit: 'tonnes', currentStock: 0, minimumStock: 5, unitPrice: 80000 },
    { name: 'Iron Bars (Y12)', unit: 'pieces', currentStock: 0, minimumStock: 50, unitPrice: 8000 },
    { name: 'Iron Bars (Y16)', unit: 'pieces', currentStock: 0, minimumStock: 30, unitPrice: 12000 },
    { name: 'Tiles', unit: 'sqm', currentStock: 0, minimumStock: 20, unitPrice: 25000 },
    { name: 'Paint', unit: 'litres', currentStock: 0, minimumStock: 10, unitPrice: 12000 },
    { name: 'Gravel', unit: 'tonnes', currentStock: 0, minimumStock: 3, unitPrice: 60000 },
    { name: 'Roofing Sheets', unit: 'pieces', currentStock: 0, minimumStock: 20, unitPrice: 35000 },
    { name: 'Electrical Wire', unit: 'meters', currentStock: 0, minimumStock: 50, unitPrice: 800 },
  ]

  for (const mat of materials) {
    await db.collection('materials').add({
      ...mat,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  }
  console.log(`✅ Created ${materials.length} materials`)

  // Construction stages
  const stages = [
    { stage: 'planning', stageName: 'Planning', isCurrent: false, notes: '' },
    { stage: 'site_preparation', stageName: 'Site Preparation', isCurrent: false, notes: '' },
    { stage: 'foundation', stageName: 'Foundation', isCurrent: true, notes: 'Currently under construction' },
    { stage: 'walls', stageName: 'Walls', isCurrent: false, notes: '' },
    { stage: 'roofing', stageName: 'Roofing', isCurrent: false, notes: '' },
    { stage: 'electrical', stageName: 'Electrical', isCurrent: false, notes: '' },
    { stage: 'plumbing', stageName: 'Plumbing', isCurrent: false, notes: '' },
    { stage: 'finishing', stageName: 'Finishing', isCurrent: false, notes: '' },
    { stage: 'complete', stageName: 'Complete', isCurrent: false, notes: '' },
  ]

  for (const s of stages) {
    await db.collection('construction_stages').add({
      ...s,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  }
  console.log(`✅ Created ${stages.length} construction stages`)

  console.log('\n✅ Database seeded successfully!')
  console.log('\nNext steps:')
  console.log('1. Create your owner account in Firebase Authentication Console')
  console.log('2. Add the user document manually in Firestore users collection with role: "owner"')
  console.log('3. Start the app: npm run dev')
  console.log('4. Login and start adding funding sources, workers, and recording transactions')
}

seed().catch(console.error).finally(() => process.exit())
