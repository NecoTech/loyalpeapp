'use client'

import { useParams } from 'next/navigation'
import MenuItemDetails from '../../../components/MenuItemDetails'

export default function MenuItemPage() {
    const params = useParams()
    const { categoryId, itemName } = params

    if (!categoryId || !itemName) {
        return (
            <div className="min-h-screen bg-gray-100 py-12">
                <div className="container mx-auto px-4">
                    <p className="text-red-500 text-center">Invalid menu item URL</p>
                </div>
            </div>
        )
    }

    return (
        // <div className="min-h-screen bg-gray-100 py-12">
        <MenuItemDetails
            categoryId={categoryId as string}
            itemName={decodeURIComponent(itemName as string)}
        />
        // </div>
    )
}