import { NextResponse } from 'next/server'

// This endpoint returns seed data instructions
// Use scripts/seed.js with firebase-admin for actual seeding

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  return NextResponse.json({
    message: 'Construction Manager Seed Data',
    instructions: 'Run node scripts/seed.js with a Firebase service account key to seed the database.',
    collections: {
      budget_categories: [
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
      ],
      materials: [
        { name: 'Cement', unit: 'bags', currentStock: 0, minimumStock: 20, unitPrice: 15000 },
        { name: 'Bricks', unit: 'pieces', currentStock: 0, minimumStock: 1000, unitPrice: 150 },
        { name: 'Sand', unit: 'tonnes', currentStock: 0, minimumStock: 5, unitPrice: 80000 },
        { name: 'Iron Bars', unit: 'pieces', currentStock: 0, minimumStock: 50, unitPrice: 8000 },
        { name: 'Tiles', unit: 'sqm', currentStock: 0, minimumStock: 20, unitPrice: 25000 },
        { name: 'Paint', unit: 'litres', currentStock: 0, minimumStock: 10, unitPrice: 12000 },
      ],
    }
  })
}
