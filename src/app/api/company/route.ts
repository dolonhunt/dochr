import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DEFAULT_COMPANY } from '@/lib/storage'

export async function GET() {
  try {
    const company = await db.companySetting.findUnique({ where: { id: 'default' } })
    if (!company) {
      return NextResponse.json(DEFAULT_COMPANY)
    }

    return NextResponse.json({
      name: company.name,
      address: company.address,
      phone: company.phone,
      email: company.email,
      proprietor_name: company.proprietorName,
      proprietor_designation: company.proprietorDesignation,
      brand_color: company.brandColor,
      logo_path: company.logoPath,
    })
  } catch (error) {
    console.error('Failed to fetch company:', error)
    return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 })
  }
}
