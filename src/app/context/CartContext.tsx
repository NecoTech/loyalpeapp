'use client'

import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react'
import { encrypt, decrypt } from '..//..//..//lib/encryption'  // Import the encryption functions

type CartItem = {
    _id: string          // Combined categoryId-itemName as unique identifier
    categoryId: string   // Reference to the category
    name: string
    price: number
    quantity: number
    image?: string
    description?: string
    volume?: string
    isAvailable: boolean
    isVeg: boolean      // Add this field
    cookingRequest?: string    // Add this field
    isTakeaway?: boolean      // Add this field
    takeawayQuantity?: number  // Add this new field
}

// Type for storage (excluding image)
type StorageCartItem = Omit<CartItem, 'image'> & {
    image?: never
}

type CartContextType = {
    cartItems: CartItem[]
    restaurantId: string | null
    tableNumber: number | null
    addToCart: (item: Omit<CartItem, 'quantity'>) => void
    updateQuantity: (id: string, quantity: number) => void
    removeFromCart: (id: string) => void
    clearCart: () => void
    clearCartAfterPayment: () => void
    setRestaurantId: (id: string) => void
    setTableNumber: (number: number | null) => void
    updateCookingRequest: (id: string, request: string) => void
    updateTakeaway: (id: string, isTakeaway: boolean, takeawayQuantity?: number) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

// Define storage keys
const STORAGE_KEYS = {
    CART: 'cartData',
    RESTAURANT_ID: 'restaurantData',
    TABLE_NUMBER: 'tableData'
}

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cartItems, setCartItems] = useState<CartItem[]>([])
    const [restaurantId, setRestaurantId] = useState<string | null>(null)
    const [tableNumber, setTableNumber] = useState<number | null>(null)
    const [isInitialized, setIsInitialized] = useState(false)

    // Helper function to remove image data for storage
    const prepareForStorage = (items: CartItem[]): StorageCartItem[] => {
        return items.map(({ image, ...rest }) => rest)
    }

    // Function to safely get encrypted values from localStorage
    const getEncryptedItem = (key: string): any => {
        try {
            const encryptedValue = localStorage.getItem(key)
            if (!encryptedValue) return null

            return decrypt(encryptedValue)
        } catch (error) {
            console.error(`Error decrypting ${key}:`, error)
            localStorage.removeItem(key)
            return null
        }
    }

    // Function to safely set encrypted values in localStorage
    const setEncryptedItem = (key: string, value: any): void => {
        try {
            if (value === null || value === undefined) {
                localStorage.removeItem(key)
                return
            }

            const encryptedValue = encrypt(value)
            localStorage.setItem(key, encryptedValue)
        } catch (error) {
            console.error(`Error encrypting ${key}:`, error)
        }
    }

    // Load initial state from localStorage
    useEffect(() => {
        const savedCart = getEncryptedItem(STORAGE_KEYS.CART)
        const savedRestaurantId = getEncryptedItem(STORAGE_KEYS.RESTAURANT_ID)
        const savedTableNumber = getEncryptedItem(STORAGE_KEYS.TABLE_NUMBER)

        if (savedCart && savedRestaurantId) {
            try {
                // Storage never held images (StorageCartItem strips them before
                // saving), so restore items as-is rather than re-fetching the
                // menu just for images.
                setCartItems(savedCart as StorageCartItem[])
                setRestaurantId(savedRestaurantId)
            } catch (error) {
                console.error('Error parsing saved cart:', error)
                localStorage.removeItem(STORAGE_KEYS.CART)
            }
        }

        if (savedTableNumber) {
            setTableNumber(parseInt(savedTableNumber.toString()))
        }

        setIsInitialized(true)
    }, [])

    // Save state to localStorage with debounce
    useEffect(() => {
        if (!isInitialized) return

        const saveToStorage = () => {
            try {
                const storageItems = prepareForStorage(cartItems)
                setEncryptedItem(STORAGE_KEYS.CART, storageItems)

                if (restaurantId) {
                    setEncryptedItem(STORAGE_KEYS.RESTAURANT_ID, restaurantId)
                }

                if (tableNumber !== null) {
                    setEncryptedItem(STORAGE_KEYS.TABLE_NUMBER, tableNumber.toString())
                } else {
                    localStorage.removeItem(STORAGE_KEYS.TABLE_NUMBER)
                }
            } catch (error) {
                console.error('Error saving cart to localStorage:', error)
            }
        }

        const timeoutId = setTimeout(saveToStorage, 300)
        return () => clearTimeout(timeoutId)
    }, [cartItems, restaurantId, tableNumber, isInitialized])

    // Add new functions for cooking requests and takeaway
    const updateCookingRequest = useCallback((id: string, request: string) => {
        setCartItems((prevItems) =>
            prevItems.map((item) =>
                item._id === id ? { ...item, cookingRequest: request } : item
            )
        )
    }, [])

    const updateTakeaway = useCallback((id: string, isTakeaway: boolean, takeawayQuantity?: number) => {
        setCartItems((prevItems) =>
            prevItems.map((item) => {
                if (item._id === id) {
                    // If turning on takeaway
                    if (isTakeaway) {
                        // Use provided quantity or default to 1 (or item's quantity if provided is too large)
                        const validQuantity = takeawayQuantity
                            ? Math.min(takeawayQuantity, item.quantity)
                            : 1;

                        return {
                            ...item,
                            isTakeaway: true,
                            takeawayQuantity: validQuantity
                        };
                    }
                    // If turning off takeaway
                    else {
                        return {
                            ...item,
                            isTakeaway: false,
                            takeawayQuantity: 0
                        };
                    }
                }
                return item;
            })
        )
    }, [])

    const addToCart = useCallback((item: Omit<CartItem, 'quantity'>) => {
        if (!item.isAvailable) return

        setCartItems((prevItems) => {
            const existingItem = prevItems.find((i) => i._id === item._id)
            if (existingItem) {
                return prevItems.map((i) =>
                    i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i
                )
            }
            return [...prevItems, { ...item, quantity: 1 }]
        })
    }, [])

    const updateQuantity = useCallback((id: string, quantity: number) => {
        setCartItems((prevItems) => {
            const newItems = prevItems.map((item) => {
                if (item._id === id) {
                    const newQuantity = Math.max(0, quantity);

                    // If reducing quantity, check if we need to adjust takeawayQuantity
                    if (item.isTakeaway && item.takeawayQuantity && newQuantity < item.takeawayQuantity) {
                        return {
                            ...item,
                            quantity: newQuantity,
                            takeawayQuantity: newQuantity // Reduce takeaway quantity if it exceeds the new total
                        };
                    }

                    return { ...item, quantity: newQuantity };
                }
                return item;
            }).filter((item) => item.quantity > 0)

            if (JSON.stringify(prepareForStorage(newItems)) !== JSON.stringify(prepareForStorage(prevItems))) {
                return newItems
            }
            return prevItems
        })
    }, [])

    const removeFromCart = useCallback((id: string) => {
        setCartItems((prevItems) => prevItems.filter((item) => item._id !== id))
    }, [])

    const clearCart = useCallback(() => {
        // Check if we're in payment process
        const isInPaymentProcess = window.location.pathname.includes('/payment');

        if (isInPaymentProcess) {
            // Don't clear cart data during payment process, just clear the state
            setCartItems([]);
            setTableNumber(null);
            return;
        }

        // Normal cart clearing - remove from localStorage too
        setCartItems([]);
        localStorage.removeItem(STORAGE_KEYS.CART);
        localStorage.removeItem(STORAGE_KEYS.RESTAURANT_ID);
        localStorage.removeItem(STORAGE_KEYS.TABLE_NUMBER);
        setTableNumber(null);
    }, []);

    // Add a new function specifically for payment completion
    const clearCartAfterPayment = useCallback(() => {
        setCartItems([]);
        localStorage.removeItem(STORAGE_KEYS.CART);
        localStorage.removeItem(STORAGE_KEYS.RESTAURANT_ID);
        localStorage.removeItem(STORAGE_KEYS.TABLE_NUMBER);
        setTableNumber(null);
    }, []);

    const setRestaurantIdSafely = useCallback((id: string) => {
        const savedRestaurantId = getEncryptedItem(STORAGE_KEYS.RESTAURANT_ID)
        if (savedRestaurantId !== id) {
            setRestaurantId(id)
            setCartItems([])
            setTableNumber(null)
            localStorage.removeItem(STORAGE_KEYS.CART)
            localStorage.removeItem(STORAGE_KEYS.TABLE_NUMBER)
        }
    }, [])

    const contextValue = useMemo(() => ({
        cartItems,
        restaurantId,
        tableNumber,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        clearCartAfterPayment,
        setRestaurantId: setRestaurantIdSafely,
        setTableNumber,
        updateCookingRequest,
        updateTakeaway
    }), [
        cartItems,
        restaurantId,
        tableNumber,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        clearCartAfterPayment, // Add this
        setRestaurantIdSafely,
        updateCookingRequest,
        updateTakeaway
    ])

    return (
        <CartContext.Provider value={contextValue}>
            {children}
        </CartContext.Provider>
    )
}

export function useCart() {
    const context = useContext(CartContext)
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider')
    }
    return context
}

export const CartItemComponent = React.memo(function CartItemComponent({
    item,
    onUpdateQuantity
}: {
    item: CartItem
    onUpdateQuantity: (id: string, quantity: number) => void
}) {
    return (
        <div>
            <span>{item.name}</span>
            <span>Quantity: {item.quantity}</span>
            {item.volume && <span>Volume: {item.volume}</span>}
            {item.isTakeaway && item.takeawayQuantity && (
                <span>Takeaway: {item.takeawayQuantity} of {item.quantity}</span>
            )}
        </div>
    )
})