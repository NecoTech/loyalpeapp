'use client'

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { useCart } from '..//context/CartContext'
import { useCurrency } from '..//context/CurrencyContext'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft,
    Utensils,
    MapPin,
    ScrollText,
    Download,
    CreditCard,
    Banknote, GrabIcon as TakeawayIcon, CirclePlus,
    X,
    CircleMinus,
    ChevronDown,
    AlertCircle,
    Truck,
    Home,
    Info,
    BedDouble
} from "lucide-react"
import { Button } from "..//components/ui/button"
import { Input } from "..//components/ui/input"
import { Label } from "..//components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "..//components/ui/dialog"
import { Card, CardContent } from "..//components/ui/card"
import { Separator } from "..//components/ui/separator"
import { Textarea } from "..//components/ui/textarea"
import { useTheme } from 'next-themes'
import { cn } from '..//..//..//lib/utils'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "..//components/ui/select"

const VegIcon = () => (
    <div className="border-2 border-green-600 p-[2px]">
        <div className="h-2 w-2 rounded-full bg-green-600" />
    </div>
)

const NonVegIcon = () => (
    <div className="border-2 border-red-600 p-[2px]">
        <div className="h-2 w-2 rounded-full bg-red-600" />
    </div>
)

export default function Cart({ restaurantId }: { restaurantId: string }) {
    const { cartItems, updateQuantity, removeFromCart, tableNumber, setTableNumber, updateCookingRequest, updateTakeaway } = useCart()
    const [localTableNumber, setLocalTableNumber] = useState<string>('')
    const { currency } = useCurrency()
    const router = useRouter()
    const [currentSlide, setCurrentSlide] = useState(0)
    const [tipAmount, setTipAmount] = useState(0)
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
    const [isCashPaymentPending, setIsCashPaymentPending] = useState(false)
    const [isCashPaymentVerified, setIsCashPaymentVerified] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const { theme } = useTheme()
    const [tableCount, setTableCount] = useState<number>(1)
    const [menuItems, setMenuItems] = useState<any[]>([])
    const [showLimitWarning, setShowLimitWarning] = useState(false)
    const [limitWarningItem, setLimitWarningItem] = useState<string>('')
    const [showAdjustmentNotice, setShowAdjustmentNotice] = useState(false)
    const [adjustedItems, setAdjustedItems] = useState<string[]>([])

    const [isCookingRequestOpen, setIsCookingRequestOpen] = useState(false)
    const [currentItemId, setCurrentItemId] = useState<string | null>(null)

    const [isTakeawayDialogOpen, setIsTakeawayDialogOpen] = useState(false);
    const [selectedTakeawayQuantity, setSelectedTakeawayQuantity] = useState(1);

    // Services state
    const [selectedService, setSelectedService] = useState<'dine-in' | 'home-delivery' | 'room-service'>('dine-in');
    const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number, lng: number } | null>(null);

    // Room service state - NEW
    const [roomNumber, setRoomNumber] = useState<string>('');
    const [isRoomServiceAvailable, setIsRoomServiceAvailable] = useState<boolean>(false);
    const [roomServiceUnavailableReason, setRoomServiceUnavailableReason] = useState<string>('');

    // Tax rates
    const [cgstRate, setCgstRate] = useState<number>(2.5); // Default 2.5%
    const [sgstRate, setSgstRate] = useState<number>(2.5); // Default 2.5%
    const [platformRate, setPlatformRate] = useState<number>(0); // Default 2.5%
    const [restaurantDetails, setRestaurantDetails] = useState<any>(null);

    // Delivery charge states
    const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
    const [deliveryDistance, setDeliveryDistance] = useState<number>(0);

    // New state for delivery availability
    const [isDeliveryAvailable, setIsDeliveryAvailable] = useState<boolean>(false);
    const [deliveryUnavailableReason, setDeliveryUnavailableReason] = useState<string>('');

    // Map-related state variables
    const [showLocationInput, setShowLocationInput] = useState(false);
    const [locationSearchQuery, setLocationSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const [mapZoom, setMapZoom] = useState(12);
    const [mapCenter, setMapCenter] = useState({ lat: 45.4, lng: -75.7 }); // Ottawa default
    const [mapBounds, setMapBounds] = useState({
        north: 45.6,
        south: 45.2,
        east: -75.4,
        west: -76.0
    });

    // Function to check delivery availability
    const checkDeliveryAvailability = (restaurant: any) => {
        if (!restaurant) {
            setIsDeliveryAvailable(false);
            setDeliveryUnavailableReason('Restaurant information not available');
            return false;
        }

        // Check if delivery is enabled
        if (!restaurant.deliveryEnabled) {
            setIsDeliveryAvailable(false);
            setDeliveryUnavailableReason('Delivery service is not enabled for this restaurant');
            return false;
        }

        // Check if restaurant location is set
        if (!restaurant.latitude || !restaurant.longitude || !restaurant.locationSet) {
            setIsDeliveryAvailable(false);
            setDeliveryUnavailableReason('Restaurant location is not configured for delivery');
            return false;
        }

        // Check if delivery radius is configured
        if (!restaurant.maxDeliveryRadius || restaurant.maxDeliveryRadius <= 0) {
            setIsDeliveryAvailable(false);
            setDeliveryUnavailableReason('Delivery radius is not configured');
            return false;
        }

        setIsDeliveryAvailable(true);
        setDeliveryUnavailableReason('');
        return true;
    };

    // Function to calculate distance between two coordinates using Haversine formula
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371; // Radius of the Earth in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in kilometers
        return distance;
    };

    // Function to check room service availability - NEW
    const checkRoomServiceAvailability = (restaurant: any) => {
        if (!restaurant) {
            setIsRoomServiceAvailable(false);
            setRoomServiceUnavailableReason('Restaurant information not available');
            return false;
        }

        // Check if room service is enabled
        if (!restaurant.roomServiceEnabled) {
            setIsRoomServiceAvailable(false);
            setRoomServiceUnavailableReason('Room service is not enabled for this restaurant');
            return false;
        }

        setIsRoomServiceAvailable(true);
        setRoomServiceUnavailableReason('');
        return true;
    };

    // Function to calculate delivery charge based on distance and restaurant settings
    const calculateDeliveryCharge = (distance: number): number => {
        if (!restaurantDetails) return 0;

        const {
            deliveryChargePerKm = 0,
            freeDeliveryRadius = 0,
            maxDeliveryRadius = 10
        } = restaurantDetails;

        // Check if delivery is within max radius
        if (distance > maxDeliveryRadius) {
            return -1; // Indicates delivery not available
        }

        // Check if delivery is within free radius
        if (distance <= freeDeliveryRadius) {
            return 0; // Free delivery
        }

        // Calculate charge for distance beyond free radius
        const chargeableDistance = distance - freeDeliveryRadius;
        return chargeableDistance * deliveryChargePerKm;
    };

    // Function to update delivery charge when location changes
    const updateDeliveryCharge = async (userLocation: { lat: number, lng: number }) => {
        if (!restaurantDetails || selectedService !== 'home-delivery' || !isDeliveryAvailable) {
            setDeliveryCharge(0);
            setDeliveryDistance(0);
            return;
        }

        // Get restaurant coordinates from stored lat/lng or fallback to geocoding
        let restaurantLat: number;
        let restaurantLng: number;

        // First priority: Use stored restaurant coordinates if available
        if (restaurantDetails.latitude && restaurantDetails.longitude && restaurantDetails.locationSet) {
            restaurantLat = restaurantDetails.latitude;
            restaurantLng = restaurantDetails.longitude;
        }
        // Fallback: Try to get coordinates from restaurant address
        else if (restaurantDetails.address) {
            try {
                // console.log('Restaurant location not set, trying to geocode address...');
                const geocodeResponse = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(restaurantDetails.address)}&limit=1`
                );
                const geocodeData = await geocodeResponse.json();

                if (geocodeData && geocodeData.length > 0) {
                    restaurantLat = parseFloat(geocodeData[0].lat);
                    restaurantLng = parseFloat(geocodeData[0].lon);
                } else {
                    // Show warning and use fallback coordinates
                    console.warn('Could not geocode restaurant address, using fallback coordinates');
                    alert('Restaurant location not found. Please set the restaurant location in your profile for accurate delivery calculations.');
                    restaurantLat = 45.4215; // Ottawa downtown as example
                    restaurantLng = -75.6919;
                }
            } catch (error) {
                console.error('Error geocoding restaurant address:', error);
                alert('Unable to determine restaurant location. Please set the restaurant location in your profile.');
                // Fallback coordinates
                restaurantLat = 45.4215;
                restaurantLng = -75.6919;
            }
        }
        // Last resort: Use default coordinates but warn user
        else {
            console.warn('No restaurant location or address available, using default coordinates');
            alert('Restaurant location not set. Please update your restaurant profile with the correct location for accurate delivery calculations.');
            restaurantLat = 45.4215;
            restaurantLng = -75.6919;
        }

        // Calculate distance using Haversine formula
        const distance = calculateDistance(
            restaurantLat,
            restaurantLng,
            userLocation.lat,
            userLocation.lng
        );

        setDeliveryDistance(distance);

        // Calculate delivery charge based on restaurant settings
        const charge = calculateDeliveryCharge(distance);

        if (charge === -1) {
            // Delivery not available - outside maximum radius
            alert(`Delivery is not available to this location. Maximum delivery radius is ${restaurantDetails.maxDeliveryRadius || 10} km from the restaurant.`);
            setDeliveryCharge(0);
            setSelectedLocation(null);
            setDeliveryAddress('');
            return;
        }

        setDeliveryCharge(charge);

        // Store delivery charge and distance in localStorage
        localStorage.setItem('deliveryCharge', charge.toString());
        localStorage.setItem('deliveryDistance', distance.toString());
    };

    // Function to calculate bounds based on center and zoom - Updated for global use
    const calculateBounds = (center: { lat: number, lng: number }, zoom: number) => {
        // More precise degree span calculation based on zoom level for global use
        const zoomFactor = Math.pow(2, zoom);
        const latSpan = 180 / zoomFactor;
        const lngSpan = 360 / zoomFactor;

        // Ensure bounds don't exceed world limits
        const north = Math.min(85, center.lat + latSpan / 2);
        const south = Math.max(-85, center.lat - latSpan / 2);
        const east = center.lng + lngSpan / 2;
        const west = center.lng - lngSpan / 2;

        return {
            north,
            south,
            east,
            west
        };
    };

    // Function to update map
    const updateMap = (center?: { lat: number, lng: number }, zoom?: number) => {
        const newCenter = center || mapCenter;
        const newZoom = zoom !== undefined ? zoom : mapZoom;
        const newBounds = calculateBounds(newCenter, newZoom);

        setMapCenter(newCenter);
        setMapZoom(newZoom);
        setMapBounds(newBounds);
        setIsMapLoaded(false); // Reset loading state
    };

    // Zoom in function
    const handleZoomIn = () => {
        if (mapZoom < 18) {
            const newZoom = mapZoom + 1;
            const center = selectedLocation || mapCenter;
            updateMap(center, newZoom);
        }
    };

    // Zoom out function
    const handleZoomOut = () => {
        if (mapZoom > 3) {
            const newZoom = mapZoom - 1;
            const center = selectedLocation || mapCenter;
            updateMap(center, newZoom);
        }
    };

    // Reset view function
    const handleResetView = () => {
        const defaultCenter = { lat: 45.4, lng: -75.7 };
        updateMap(defaultCenter, 12);
    };

    // Current location function
    const handleCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    const newLocation = { lat: latitude, lng: longitude };

                    setSelectedLocation(newLocation);
                    // Immediately persist selected location
                    localStorage.setItem('selectedLocation', JSON.stringify(newLocation));

                    try {
                        const address = await reverseGeocode(latitude, longitude);
                        setDeliveryAddress(address);
                        // Persist delivery address
                        localStorage.setItem('deliveryAddress', address);

                        // Calculate delivery charge
                        await updateDeliveryCharge(newLocation);

                        // console.log('Current location set and persisted:', newLocation);
                    } catch (error) {
                        console.error('Error processing current location:', error);
                    }
                },
                (error) => {
                    alert('Unable to get your location. Please enter address manually.');
                    console.error('Geolocation error:', error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 600000
                }
            );
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    };

    // Location search function using Nominatim API - Global search
    const handleLocationSearch = async () => {
        if (!locationSearchQuery.trim()) return;

        setIsSearching(true);
        try {
            // Using Nominatim geocoding API with global search (removed country restriction)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearchQuery)}&limit=5&addressdetails=1&extratags=1`
            );

            const data = await response.json();

            if (data && data.length > 0) {
                // If multiple results, use the first one (most relevant)
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);
                const newLocation = { lat, lng };

                setSelectedLocation(newLocation);
                setDeliveryAddress(result.display_name);
                updateMap(newLocation, 15);

                // Calculate delivery charge
                await updateDeliveryCharge(newLocation);

                setShowLocationInput(false);
                setLocationSearchQuery('');
            } else {
                alert('Location not found. Please try a different search term or select manually on the map.');
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            alert('Error searching for location. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    // Reverse geocoding function using Nominatim API
    const reverseGeocode = async (lat: number, lng: number) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            if (data.display_name) {
                return data.display_name;
            }
            return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
    };

    // Handle location selection from map click
    const handleLocationSelect = async (lat: number, lng: number) => {
        const newLocation = { lat, lng };
        setSelectedLocation(newLocation);

        // Immediately persist selected location
        localStorage.setItem('selectedLocation', JSON.stringify(newLocation));

        try {
            // Get address for the selected location
            const address = await reverseGeocode(lat, lng);
            setDeliveryAddress(address);

            // Persist delivery address
            localStorage.setItem('deliveryAddress', address);

            // Calculate and persist delivery charge
            await updateDeliveryCharge(newLocation);

            // Update map to center on selected location
            updateMap(newLocation, mapZoom);

            // console.log('Location selected and persisted:', { lat, lng, address });
        } catch (error) {
            console.error('Error processing location selection:', error);
        }
    };

    // Initialize map when dialog opens
    useEffect(() => {
        if (isMapDialogOpen) {
            setIsMapLoaded(false);
            // Reset to default view when opening
            const defaultCenter = selectedLocation || { lat: 45.4, lng: -75.7 };
            updateMap(defaultCenter, selectedLocation ? 15 : 12);
        }
    }, [isMapDialogOpen]);

    // Clean up when dialog closes
    useEffect(() => {
        if (!isMapDialogOpen) {
            setShowLocationInput(false);
            setLocationSearchQuery('');
            setIsSearching(false);
        }
    }, [isMapDialogOpen]);

    // Add effect to validate persisted data on component mount
    useEffect(() => {
        const cartDataTimestamp = localStorage.getItem('cartDataTimestamp');
        if (cartDataTimestamp) {
            const timestamp = parseInt(cartDataTimestamp);
            const hoursSinceLastSave = (Date.now() - timestamp) / (1000 * 60 * 60);
            if (hoursSinceLastSave > 2) {
                localStorage.removeItem('selectedService');
                localStorage.removeItem('deliveryAddress');
                localStorage.removeItem('selectedLocation');
                localStorage.removeItem('deliveryCharge');
                localStorage.removeItem('deliveryDistance');
                localStorage.removeItem('selectedTableNumber');
                localStorage.removeItem('selectedRoomNumber');
                localStorage.removeItem('tipAmount');
                localStorage.removeItem('cartDataTimestamp');
            }
        }
    }, []);

    // Handler for cooking requests
    const handleCookingRequestOpen = (itemId: string) => {
        setCurrentItemId(itemId)
        setIsCookingRequestOpen(true)
    }

    const handleTakeawayOpen = (itemId: string) => {
        const item = cartItems.find(item => item._id === itemId);
        if (item) {
            setCurrentItemId(itemId);
            setSelectedTakeawayQuantity(item.takeawayQuantity || 1);
            setIsTakeawayDialogOpen(true);
        }
    };

    const handleTakeawayQuantitySave = () => {
        if (currentItemId) {
            updateTakeaway(currentItemId, true, selectedTakeawayQuantity);
        }
        setIsTakeawayDialogOpen(false);
        setCurrentItemId(null);
    };

    const handleTakeawayCancellation = () => {
        if (currentItemId) {
            updateTakeaway(currentItemId, false, 0);
        }
        setIsTakeawayDialogOpen(false);
        setCurrentItemId(null);
    };

    const handleCookingRequestSave = (request: string) => {
        if (currentItemId) {
            updateCookingRequest(currentItemId, request)
        }
        setIsCookingRequestOpen(false)
        setCurrentItemId(null)
    }

    const handleTakeawayToggle = (itemId: string) => {
        const item = cartItems.find(item => item._id === itemId)
        if (item) {
            updateTakeaway(itemId, !item.isTakeaway)
        }
    }

    // Handle room number change - NEW
    const handleRoomNumberChange = (value: string) => {
        setRoomNumber(value);
        localStorage.setItem('selectedRoomNumber', value);
    };

    // Handle service selection
    const handleServiceSelect = (service: 'dine-in' | 'home-delivery' | 'room-service') => {
        if (service === 'home-delivery' && !isDeliveryAvailable) {
            alert(`Delivery is not available. ${deliveryUnavailableReason}`);
            return;
        }
        if (service === 'room-service' && !isRoomServiceAvailable) {
            alert(`Room service is not available. ${roomServiceUnavailableReason}`);
            return;
        }

        setSelectedService(service);
        setIsServiceDialogOpen(false);
        localStorage.setItem('selectedService', service);

        // Reset table number when switching to home delivery or room service
        if (service === 'home-delivery' || service === 'room-service') {
            setTableNumber(null);
            setLocalTableNumber('');
        }

        // Reset room number when switching away from room service
        if (service !== 'room-service') {
            setRoomNumber('');
            localStorage.removeItem('selectedRoomNumber');
        }

        // Reset delivery-related data when switching to dine-in or room service
        if (service === 'dine-in' || service === 'room-service') {
            setDeliveryAddress('');
            setSelectedLocation(null);
            setDeliveryCharge(0);
            setDeliveryDistance(0);
            localStorage.removeItem('deliveryAddress');
            localStorage.removeItem('selectedLocation');
            localStorage.removeItem('deliveryCharge');
            localStorage.removeItem('deliveryDistance');
        }
    };

    // Function to check if item can be increased based on inventory
    const canIncreaseQuantity = (cartItem: any) => {
        if (!cartItem) return false;

        const availableInventory = getAvailableInventory(cartItem);
        if (availableInventory === 0) return true; // If no inventory data, allow increase

        // For custom pricing items, we need to check total quantity across all variants
        const [categoryId, fullItemName] = cartItem._id.split('-', 2);
        const baseItemName = fullItemName.includes('(')
            ? fullItemName.substring(0, fullItemName.lastIndexOf('(')).trim()
            : fullItemName;

        // Calculate total quantity for this base item across all variants
        const totalQuantityForItem = cartItems
            .filter(item => {
                const [itemCategoryId, itemFullName] = item._id.split('-', 2);
                const itemBaseName = itemFullName.includes('(')
                    ? itemFullName.substring(0, itemFullName.lastIndexOf('(')).trim()
                    : itemFullName;
                return itemCategoryId === categoryId && itemBaseName === baseItemName;
            })
            .reduce((total, item) => total + item.quantity, 0);

        return totalQuantityForItem < availableInventory;
    };

    const hasInsufficientInventory = () => {
        // Group cart items by base item name to check inventory limits
        const itemGroups = new Map();

        cartItems.forEach(cartItem => {
            const [categoryId, fullItemName] = cartItem._id.split('-', 2);
            const baseItemName = fullItemName.includes('(')
                ? fullItemName.substring(0, fullItemName.lastIndexOf('(')).trim()
                : fullItemName;

            const key = `${categoryId}-${baseItemName}`;

            if (!itemGroups.has(key)) {
                itemGroups.set(key, {
                    categoryId,
                    baseItemName,
                    totalQuantity: 0,
                    items: []
                });
            }

            const group = itemGroups.get(key);
            group.totalQuantity += cartItem.quantity;
            group.items.push(cartItem);
        });

        // Check each group against inventory - FIXED VERSION
        let hasInsufficientStock = false;
        itemGroups.forEach((group, key) => {
            const category = menuItems.find(cat => cat._id === group.categoryId);
            if (!category) return;

            const menuItem = category.items.find((item: any) => item.name === group.baseItemName);
            const availableInventory = menuItem?.itemcount || 0;

            if (availableInventory > 0 && group.totalQuantity > availableInventory) {
                hasInsufficientStock = true;
            }
        });

        if (hasInsufficientStock) return true;

        return false;
    };

    // Get the available inventory for an item
    const getAvailableInventory = (cartItem: any) => {
        if (!cartItem) return 0;

        // Extract categoryId and base item name from cartItem._id
        const [categoryId, fullItemName] = cartItem._id.split('-', 2);

        // For custom pricing items, extract the base item name (before the parentheses)
        const baseItemName = fullItemName.includes('(')
            ? fullItemName.substring(0, fullItemName.lastIndexOf('(')).trim()
            : fullItemName;

        const category = menuItems.find(cat => cat._id === categoryId);
        if (!category) return 0;

        // Find the menu item using the base name
        const menuItem = category.items.find((item: any) => item.name === baseItemName);
        return menuItem?.itemcount || 0;
    };

    // Check and adjust cart quantities based on inventory
    const adjustCartToInventory = () => {
        const adjustedItemNames: string[] = [];
        let anyAdjustments = false;

        // Group items by base name to check inventory
        const itemGroups = new Map();

        cartItems.forEach(cartItem => {
            const [categoryId, fullItemName] = cartItem._id.split('-', 2);
            const baseItemName = fullItemName.includes('(')
                ? fullItemName.substring(0, fullItemName.lastIndexOf('(')).trim()
                : fullItemName;

            const key = `${categoryId}-${baseItemName}`;

            if (!itemGroups.has(key)) {
                itemGroups.set(key, {
                    categoryId,
                    baseItemName,
                    items: []
                });
            }

            itemGroups.get(key).items.push(cartItem);
        });

        // Check and adjust each group - FIXED VERSION
        itemGroups.forEach((group, key) => {
            const category = menuItems.find(cat => cat._id === group.categoryId);
            if (!category) return;

            const menuItem = category.items.find((item: any) => item.name === group.baseItemName);
            const availableInventory = menuItem?.itemcount || 0;

            if (availableInventory > 0) {
                const totalQuantity = group.items.reduce((sum: number, item: any) => sum + item.quantity, 0);

                if (totalQuantity > availableInventory) {
                    // Need to reduce quantities proportionally
                    let remainingInventory = availableInventory;

                    // Sort items by quantity (descending) to adjust larger quantities first
                    group.items.sort((a: any, b: any) => b.quantity - a.quantity);

                    group.items.forEach((cartItem: any) => {
                        if (remainingInventory <= 0) {
                            // Remove item completely
                            updateQuantity(cartItem._id, 0);
                            adjustedItemNames.push(cartItem.name);
                            anyAdjustments = true;
                        } else if (cartItem.quantity > remainingInventory) {
                            // Reduce quantity to remaining inventory
                            updateQuantity(cartItem._id, remainingInventory);
                            adjustedItemNames.push(cartItem.name);
                            anyAdjustments = true;
                            remainingInventory = 0;
                        } else {
                            // Keep current quantity
                            remainingInventory -= cartItem.quantity;
                        }
                    });
                }
            }
        });

        if (anyAdjustments) {
            setAdjustedItems(adjustedItemNames);
            setShowAdjustmentNotice(true);
            setTimeout(() => setShowAdjustmentNotice(false), 5000);
        }
    };

    // Fetch menu items to get item counts
    // Fetch menu items to get item counts
    const fetchMenuItems = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menu/${restaurantId}`);
            if (response.ok) {
                const data = await response.json();
                setMenuItems(data);
                return data; // NEW: return fresh data to caller
            }
        } catch (error) {
            console.error("Error fetching menu items:", error);
        }
        return null;
    };

    useEffect(() => {
        fetchMenuItems().then(() => {
            setTimeout(() => adjustCartToInventory(), 300);
        });
    }, [restaurantId]);

    // Fetch restaurant details to get table count, tax rates, and delivery settings
    useEffect(() => {
        const fetchRestaurantDetails = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/restaurant/${restaurantId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data[0]) {
                        const restaurant = data[0];
                        setRestaurantDetails(restaurant);

                        // Check delivery availability
                        checkDeliveryAvailability(restaurant);
                        // Check room service availability - NEW
                        checkRoomServiceAvailability(restaurant);

                        // Set table count
                        if (restaurant.tableCount) {
                            setTableCount(restaurant.tableCount);

                            // If only one table, set it automatically
                            if (restaurant.tableCount === 1) {
                                setTableNumber(1);
                            }
                        }

                        // Set tax rates if available
                        if (restaurant.cgstPercentage !== undefined) {
                            setCgstRate(restaurant.cgstPercentage);
                        }

                        if (restaurant.sgstPercentage !== undefined) {
                            setSgstRate(restaurant.sgstPercentage);
                        }

                        if (restaurant.platformPercentage !== undefined) {
                            setPlatformRate(restaurant.platformPercentage);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching restaurant details:", error);
            }
        };

        fetchRestaurantDetails();
    }, [restaurantId, setTableNumber]);

    useEffect(() => {
        if (restaurantDetails) {
            loadPersistedData();
        }
    }, [restaurantDetails, isDeliveryAvailable, isRoomServiceAvailable]); // Add isDeliveryAvailable as dependency



    const loadPersistedData = async () => {
        try {
            const storedService = localStorage.getItem('selectedService') as 'dine-in' | 'home-delivery' | 'room-service' | null;
            if (storedService) {
                if (storedService === 'home-delivery') {
                    if (isDeliveryAvailable) {
                        setSelectedService(storedService);
                    } else {
                        setSelectedService('dine-in');
                        localStorage.setItem('selectedService', 'dine-in');
                    }
                } else if (storedService === 'room-service') {
                    if (isRoomServiceAvailable) {
                        setSelectedService(storedService);
                    } else {
                        setSelectedService('dine-in');
                        localStorage.setItem('selectedService', 'dine-in');
                    }
                } else {
                    setSelectedService(storedService);
                }
            } else {
                setSelectedService('dine-in');
                localStorage.setItem('selectedService', 'dine-in');
            }

            if (storedService === 'home-delivery' && isDeliveryAvailable) {
                const storedDeliveryAddress = localStorage.getItem('deliveryAddress');
                if (storedDeliveryAddress) setDeliveryAddress(storedDeliveryAddress);
                const storedLocation = localStorage.getItem('selectedLocation');
                if (storedLocation) {
                    try {
                        const parsedLocation = JSON.parse(storedLocation);
                        if (parsedLocation?.lat && parsedLocation?.lng) {
                            setSelectedLocation(parsedLocation);
                            await updateDeliveryCharge(parsedLocation);
                        }
                    } catch (error) {
                        localStorage.removeItem('selectedLocation');
                    }
                }
            } else if (storedService === 'room-service' && isRoomServiceAvailable) {
                const storedRoomNumber = localStorage.getItem('selectedRoomNumber');
                if (storedRoomNumber) setRoomNumber(storedRoomNumber);
            }

            const storedTipAmount = localStorage.getItem('tipAmount');
            if (storedTipAmount) setTipAmount(parseFloat(storedTipAmount));
        } catch (error) {
            setSelectedService('dine-in');
            localStorage.setItem('selectedService', 'dine-in');
        }
    };


    useEffect(() => {
        if (tableNumber !== null) {
            setLocalTableNumber(tableNumber.toString());
            // Persist table number when it changes
            if (selectedService === 'dine-in') {
                localStorage.setItem('selectedTableNumber', tableNumber.toString());
            }
        } else {
            // Try to load persisted table number
            const storedTableNumber = localStorage.getItem('selectedTableNumber');
            if (storedTableNumber && selectedService === 'dine-in') {
                const parsedTableNumber = parseInt(storedTableNumber);
                if (!isNaN(parsedTableNumber) && parsedTableNumber >= 1 && parsedTableNumber <= tableCount) {
                    setTableNumber(parsedTableNumber);
                    setLocalTableNumber(storedTableNumber);
                }
            }
        }
    }, [tableNumber, selectedService, tableCount, setTableNumber]);

    const handleProceedToCheckout = async () => {
        // NEW: Fetch the latest inventory from the API before checking stock
        const freshMenuItems = await fetchMenuItems();
        const menuItemsToCheck = freshMenuItems || menuItems; // fall back to cached data if fetch fails

        // Check for items with zero inventory using the freshly fetched data
        const outOfStockItems: string[] = [];

        cartItems.forEach((cartItem) => {
            const [categoryId, fullItemName] = cartItem._id.split('-', 2);
            const baseItemName = fullItemName.includes('(')
                ? fullItemName.substring(0, fullItemName.lastIndexOf('(')).trim()
                : fullItemName;

            const category = menuItemsToCheck.find((cat: any) => cat._id === categoryId);
            if (!category) return; // no menu data available, skip check

            const menuItem = category.items.find((mi: any) => mi.name === baseItemName);
            if (menuItem && menuItem.itemcount === 0) {
                outOfStockItems.push(cartItem.name);
                removeFromCart(cartItem._id);
            }
        });

        if (outOfStockItems.length > 0) {
            alert(`The following item(s) are out of stock and have been removed from your cart: ${outOfStockItems.join(', ')}. Please review your cart and try again.`);
            return;
        }

        if (selectedService === 'dine-in') {
            if (tableCount === 1 && !tableNumber) setTableNumber(1);
            if (tableCount > 1 && !tableNumber) {
                alert('Please select a table number');
                return;
            }
        } else if (selectedService === 'home-delivery') {
            if (!isDeliveryAvailable) {
                alert(`Delivery is not available. ${deliveryUnavailableReason}`);
                return;
            }
            if (!deliveryAddress.trim()) {
                alert('Please enter delivery address');
                return;
            }
            if (!selectedLocation) {
                alert('Please select delivery location on map');
                return;
            }
        } else if (selectedService === 'room-service') {
            if (!isRoomServiceAvailable) {
                alert(`Room service is not available. ${roomServiceUnavailableReason}`);
                return;
            }
            if (!roomNumber.trim()) {
                alert('Please enter room number');
                return;
            }
        }

        try {
            const currentSubtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
            localStorage.setItem('paymentSubtotal', currentSubtotal.toString());
            localStorage.setItem('paymentCartItems', JSON.stringify(cartItems.map(item => ({
                _id: item._id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                categoryId: item.categoryId,
                isVeg: item.isVeg,
                cookingRequest: item.cookingRequest,
                isTakeaway: item.isTakeaway,
                takeawayQuantity: item.takeawayQuantity
            }))));
            localStorage.setItem('selectedService', selectedService);

            if (selectedService === 'home-delivery' && isDeliveryAvailable) {
                localStorage.setItem('deliveryAddress', deliveryAddress);
                localStorage.setItem('deliveryCharge', deliveryCharge.toString());
                localStorage.setItem('deliveryDistance', deliveryDistance.toString());
                if (selectedLocation) localStorage.setItem('selectedLocation', JSON.stringify(selectedLocation));
            } else {
                localStorage.removeItem('deliveryAddress');
                localStorage.removeItem('selectedLocation');
                localStorage.removeItem('deliveryCharge');
                localStorage.removeItem('deliveryDistance');
            }

            if (selectedService === 'room-service' && roomNumber) {
                localStorage.setItem('selectedRoomNumber', roomNumber);
            } else {
                localStorage.removeItem('selectedRoomNumber');
            }

            if (selectedService === 'dine-in' && tableNumber) {
                localStorage.setItem('selectedTableNumber', tableNumber.toString());
            } else {
                localStorage.removeItem('selectedTableNumber');
            }

            if (tipAmount > 0) localStorage.setItem('tipAmount', tipAmount.toString());
            else localStorage.removeItem('tipAmount');

            localStorage.setItem('cgstRate', cgstRate.toString());
            localStorage.setItem('sgstRate', sgstRate.toString());
            localStorage.setItem('platformRate', platformRate.toString());
            localStorage.setItem('cartDataTimestamp', Date.now().toString());
            localStorage.setItem('restaurantId', restaurantId);
        } catch (error) {
            console.error('Error persisting data before checkout:', error);
        }

        router.push(`/restaurant/${restaurantId}/payment`);
    };

    const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
    // const platformFee = (subtotal * platformRate) / 100
    const platformFee = platformRate
    const cgstAmount = (subtotal * cgstRate) / 100
    const sgstAmount = (subtotal * sgstRate) / 100
    const total = subtotal + tipAmount + platformFee + cgstAmount + sgstAmount + (selectedService === 'home-delivery' && isDeliveryAvailable ? deliveryCharge : 0)

    const handleTableNumberChange = (value: string) => {
        setLocalTableNumber(value)
        setTableNumber(parseInt(value))
    }

    const handleDotClick = (index: number) => {
        setCurrentSlide(index)
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                left: index * 300,
                behavior: "smooth",
            })
        }
    }

    const handleCashPayment = () => {
        setIsCashPaymentPending(true)
        setIsPaymentDialogOpen(false)
        setTimeout(() => {
            setIsCashPaymentPending(false)
            setIsCashPaymentVerified(true)
        }, 5000)
    }

    // Handle quantity update with item count check
    const handleQuantityUpdate = (itemId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            updateQuantity(itemId, newQuantity);
            return;
        }

        const cartItem = cartItems.find(item => item._id === itemId);
        if (!cartItem) return;

        const [categoryId, fullItemName] = cartItem._id.split('-', 2);
        const baseItemName = fullItemName.includes('(')
            ? fullItemName.substring(0, fullItemName.lastIndexOf('(')).trim()
            : fullItemName;

        const availableInventory = getAvailableInventory(cartItem);

        // NEW: zero stock means no increase at all, regardless of current cart quantity
        if (availableInventory === 0) {
            setLimitWarningItem(baseItemName);
            setShowLimitWarning(true);
            setTimeout(() => setShowLimitWarning(false), 3000);
            return;
        }

        const currentTotalQuantity = cartItems
            .filter(item => {
                const [itemCategoryId, itemFullName] = item._id.split('-', 2);
                const itemBaseName = itemFullName.includes('(')
                    ? itemFullName.substring(0, itemFullName.lastIndexOf('(')).trim()
                    : itemFullName;
                return itemCategoryId === categoryId && itemBaseName === baseItemName;
            })
            .reduce((total, item) => total + (item._id === itemId ? 0 : item.quantity), 0);

        const newTotalQuantity = currentTotalQuantity + newQuantity;

        if (newTotalQuantity > availableInventory) {
            const maxQuantityForThisItem = Math.max(0, availableInventory - currentTotalQuantity);
            updateQuantity(itemId, maxQuantityForThisItem);

            setLimitWarningItem(baseItemName);
            setShowLimitWarning(true);
            setTimeout(() => setShowLimitWarning(false), 3000);
        } else {
            updateQuantity(itemId, newQuantity);
        }
    };

    // Filter out items whose available inventory is exactly zero (out of stock)
    const visibleCartItems = cartItems.filter((item) => {
        const [categoryId, fullItemName] = item._id.split('-', 2);
        const baseItemName = fullItemName.includes('(')
            ? fullItemName.substring(0, fullItemName.lastIndexOf('(')).trim()
            : fullItemName;

        const category = menuItems.find(cat => cat._id === categoryId);
        if (!category) return true; // no menu data yet, don't hide

        const menuItem = category.items.find((mi: any) => mi.name === baseItemName);
        if (!menuItem || menuItem.itemcount === undefined) return true; // not inventory-tracked

        return menuItem.itemcount !== 0; // hide only when explicitly out of stock
    });

    if (visibleCartItems.length === 0) {
        return <p className="text-center text-gray-500 my-8">Your cart is empty.</p>
    }

    if (cartItems.length === 0) {
        return <p className="text-center text-gray-500 my-8">Your cart is empty.</p>
    }

    // Generate table options for dropdown
    const tableOptions = Array.from({ length: tableCount }, (_, i) => i + 1);

    // Display GST details if restaurant has a GST number
    const showGstDetails = restaurantDetails?.gstNumber;

    return (
        <div className={cn(
            "min-h-screen font-[Inter] overflow-y-auto",
            "bg-white text-zinc-900",
            "dark:bg-zinc-900 dark:text-white"
        )}>
            <div className="max-w-4xl mx-auto space-y-5 mb-32">
                {/* Cart Items */}
                <div className="space-y-4">
                    {visibleCartItems.map((item) => {
                        const availableInventory = getAvailableInventory(item);
                        const isAtMaxInventory = availableInventory === 0 || (item.quantity >= availableInventory && availableInventory > 0);

                        return (
                            <Card key={item._id} className={cn(
                                "overflow-hidden relative", // Add relative positioning
                                "bg-white dark:bg-zinc-800",
                                "border dark:border-zinc-700"
                            )}>
                                {/* Add X button at top right */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeFromCart(item._id)}
                                    className={cn(
                                        "absolute top-2 right-2 z-10",
                                        "h-4 w-4",
                                        "bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm",
                                        "hover:bg-red-100 dark:hover:bg-red-900/20",
                                        "rounded-full",
                                        "border border-zinc-200 dark:border-zinc-700"
                                    )}
                                >
                                    <X className="h-4 w-4 text-red-500 dark:text-red-500" />
                                </Button>

                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-start gap-3">
                                            <div className="relative w-16 h-16 bg-gray-200 dark:bg-zinc-700 rounded-lg overflow-hidden">
                                                {item.image && (
                                                    <Image
                                                        src={`https://server.oderapp.com/images/${item.image}`}
                                                        alt={item.name}
                                                        layout="fill"
                                                        objectFit="cover"
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-5 w-5 bg-red-50 dark:bg-red-900/20 rounded flex items-center justify-center">
                                                        {item.isVeg ? <VegIcon /> : <NonVegIcon />}
                                                    </div>
                                                    <h3 className="text-sm sm:text-base font-medium dark:text-white">{item.name}</h3>
                                                </div>
                                                <p className="text-base sm:text-lg font-semibold text-blue-600 dark:text-blue-400">{currency}{item.price}</p>
                                                {/* Show inventory warning when close to limits */}
                                                {availableInventory > 0 && availableInventory <= 5 && (
                                                    <p className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1 mt-1">
                                                        <AlertCircle className="h-3 w-3" />
                                                        Only {availableInventory} available
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3">
                                            <div className="flex items-center gap-3 bg-gray-50 dark:bg-zinc-700 rounded-full px-4 py-2">
                                                <CircleMinus
                                                    className="h-6 w-6 cursor-pointer"
                                                    onClick={() => handleQuantityUpdate(item._id, item.quantity - 1)}
                                                />
                                                <span className="w-8 text-center">{item.quantity}</span>
                                                <CirclePlus
                                                    className={cn(
                                                        "h-6 w-6",
                                                        isAtMaxInventory
                                                            ? "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                                            : "cursor-pointer"
                                                    )}
                                                    onClick={() => handleQuantityUpdate(item._id, item.quantity + 1)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "text-sm h-9 dark:border-zinc-700 w-full sm:w-auto",
                                                item.cookingRequest && "border-blue-500 text-blue-600"
                                            )}
                                            onClick={() => handleCookingRequestOpen(item._id)}
                                        >
                                            <ScrollText className="h-4 w-4 mr-2" />
                                            {item.cookingRequest ? 'Request Added' : 'Cooking requests'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "text-sm h-9 dark:border-zinc-700 w-full sm:w-auto",
                                                item.isTakeaway && "border-green-500 text-green-600"
                                            )}
                                            onClick={() => handleTakeawayOpen(item._id)}
                                        >
                                            <TakeawayIcon className="h-4 w-4 mr-2" />
                                            {item.isTakeaway
                                                ? `Takeaway (${item.takeawayQuantity || 1} of ${item.quantity})`
                                                : 'Takeaway'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Add More Items Button */}
                <Button variant="outline"
                    className="w-full text-lg h-12 flex items-center justify-center gap-2"
                    onClick={() => router.back()}
                >
                    <CirclePlus className="h-5 w-5" />
                    Add More Items
                </Button>

                {/* Services Section */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                                {selectedService === 'dine-in' ? (
                                    <Utensils className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                ) : selectedService === 'home-delivery' ? (
                                    <Truck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                ) : (
                                    <BedDouble className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                )}
                            </div>
                            <div className="flex-1">
                                <Label className="text-sm font-medium">
                                    Service Type
                                </Label>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "mt-1 h-10 w-full justify-between",
                                        "bg-white border border-gray-200",
                                        "dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                    )}
                                    onClick={() => setIsServiceDialogOpen(true)}
                                >
                                    <div className="flex items-center gap-2">
                                        {selectedService === 'dine-in' ? (
                                            <>
                                                <Utensils className="h-4 w-4" />
                                                <span>Dine In</span>
                                            </>
                                        ) : selectedService === 'home-delivery' ? (
                                            <>
                                                <Truck className="h-4 w-4" />
                                                <span>Home Delivery</span>
                                            </>
                                        ) : (
                                            <>
                                                <BedDouble className="h-4 w-4" />
                                                <span>Room Service</span>
                                            </>
                                        )}
                                    </div>
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Show delivery availability info if delivery is not available */}
                        {/* {!isDeliveryAvailable && (
                            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                                    <div className="text-sm text-amber-700 dark:text-amber-300">
                                        <p className="font-medium">Delivery not available</p>
                                        <p className="text-xs mt-1">{deliveryUnavailableReason}</p>
                                    </div>
                                </div>
                            </div>
                        )} */}
                    </CardContent>
                </Card>

                {/* Services Dialog */}
                <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
                    <DialogContent className="bg-white dark:bg-zinc-800 dark:text-white">
                        <DialogHeader>
                            <DialogTitle>Services</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                            {/* Dine In Option */}
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full h-14 justify-start gap-3",
                                    selectedService === 'dine-in' && "border-green-500 bg-green-50 dark:bg-green-900/20"
                                )}
                                onClick={() => handleServiceSelect('dine-in')}
                            >
                                <Utensils className="h-5 w-5 text-orange-600" />
                                <span>Dine In</span>
                                {selectedService === 'dine-in' && (
                                    <div className="ml-auto w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                        <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </Button>

                            {/* Room Service Option - NEW */}
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full h-14 justify-start gap-3",
                                    selectedService === 'room-service' && "border-green-500 bg-green-50 dark:bg-green-900/20",
                                    !isRoomServiceAvailable && "opacity-50 cursor-not-allowed"
                                )}
                                onClick={() => handleServiceSelect('room-service')}
                                disabled={!isRoomServiceAvailable}
                            >
                                <BedDouble className="h-5 w-5 text-purple-600" />
                                <div className="flex flex-col items-start">
                                    <span>Room Service</span>
                                    {!isRoomServiceAvailable && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Not available</span>
                                    )}
                                </div>
                                {selectedService === 'room-service' && isRoomServiceAvailable && (
                                    <div className="ml-auto w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                        <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </Button>

                            {/* Home Delivery Option */}
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full h-14 justify-start gap-3",
                                    selectedService === 'home-delivery' && "border-green-500 bg-green-50 dark:bg-green-900/20",
                                    !isDeliveryAvailable && "opacity-50 cursor-not-allowed"
                                )}
                                onClick={() => handleServiceSelect('home-delivery')}
                                disabled={!isDeliveryAvailable}
                            >
                                <Truck className="h-5 w-5 text-red-600" />
                                <div className="flex flex-col items-start">
                                    <span>Home Delivery</span>
                                    {!isDeliveryAvailable && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Not available</span>
                                    )}
                                </div>
                                {selectedService === 'home-delivery' && isDeliveryAvailable && (
                                    <div className="ml-auto w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                        <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Table Number or Delivery Address - conditional based on service type */}
                {selectedService === 'dine-in' && tableCount > 1 && (
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                                    <Utensils className="h-5 w-5 text-purple-600" />
                                </div>
                                <div className="flex-1">
                                    <Label htmlFor="table" className="text-sm font-medium">
                                        Table Number
                                    </Label>
                                    <Select
                                        value={tableNumber?.toString() || ""}
                                        onValueChange={handleTableNumberChange}
                                    >
                                        <SelectTrigger
                                            className={cn(
                                                "mt-1 h-10 w-full",
                                                "bg-white border border-gray-200",
                                                "dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            )}
                                        >
                                            <SelectValue placeholder="Select a table" />
                                        </SelectTrigger>
                                        <SelectContent
                                            className={cn(
                                                "bg-white border border-gray-200",
                                                "dark:bg-zinc-800 dark:border-zinc-700 dark:text-white",
                                                tableCount > 6 && "max-h-[200px] overflow-y-auto"
                                            )}
                                        >
                                            <SelectGroup>
                                                {tableOptions.map((tableNum) => (
                                                    <SelectItem
                                                        key={tableNum}
                                                        value={tableNum.toString()}
                                                        className="hover:bg-gray-100 dark:hover:bg-zinc-700"
                                                    >
                                                        Table {tableNum}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Room Number - only for Room Service - NEW */}
                {selectedService === 'room-service' && isRoomServiceAvailable && (
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                                    <BedDouble className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="flex-1">
                                    <Label htmlFor="room-number" className="text-sm font-medium">Room Number</Label>
                                    <Input
                                        id="room-number"
                                        placeholder="Enter your room number"
                                        className={cn(
                                            "mt-1 h-10",
                                            "bg-white border border-gray-200",
                                            "dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                        )}
                                        value={roomNumber}
                                        onChange={(e) => handleRoomNumberChange(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {selectedService === 'home-delivery' && isDeliveryAvailable && (
                    <Card>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                                        <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1">
                                        <Label htmlFor="delivery-address" className="text-sm font-medium">
                                            Delivery Address
                                        </Label>
                                        <Textarea
                                            id="delivery-address"
                                            placeholder="Enter Delivery Address"
                                            className={cn(
                                                "mt-1 min-h-[80px] resize-none",
                                                "bg-white border border-gray-200",
                                                "dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            )}
                                            value={deliveryAddress}
                                            onChange={(e) => setDeliveryAddress(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Delivery Charge Information */}
                                {selectedLocation && deliveryDistance > 0 && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                                        <div className="flex items-start gap-3">
                                            <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                                            <div className="flex-1">
                                                <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Delivery Information</h4>
                                                <div className="space-y-1 text-sm text-blue-700 dark:text-blue-400">
                                                    <p>Distance: {deliveryDistance.toFixed(1)} km</p>
                                                    {restaurantDetails?.freeDeliveryRadius > 0 && (
                                                        <p>Free delivery within: {restaurantDetails.freeDeliveryRadius} km</p>
                                                    )}
                                                    {deliveryCharge > 0 ? (
                                                        <p className="font-medium">Delivery charge: {currency}{deliveryCharge.toFixed(2)}</p>
                                                    ) : (
                                                        <p className="font-medium text-green-600 dark:text-green-400">Free delivery!</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Location Options */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        <MapPin className="h-4 w-4" />
                                        <span>Location</span>
                                    </div>
                                    <div className="space-y-2">
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full h-12 justify-start gap-3",
                                                "bg-gray-50 dark:bg-zinc-700/50 border-gray-200 dark:border-zinc-600",
                                                "hover:bg-gray-100 dark:hover:bg-zinc-700"
                                            )}
                                            onClick={handleCurrentLocation}
                                        >
                                            <div className="h-6 w-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                                                <MapPin className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <span className="text-zinc-700 dark:text-zinc-300">Use My Current Location</span>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full h-12 justify-start gap-3",
                                                "bg-gray-50 dark:bg-zinc-700/50 border-gray-200 dark:border-zinc-600",
                                                "hover:bg-gray-100 dark:hover:bg-zinc-700"
                                            )}
                                            onClick={() => setIsMapDialogOpen(true)}
                                        >
                                            <div className="h-6 w-6 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                                                <MapPin className="h-3 w-3 text-green-600 dark:text-green-400" />
                                            </div>
                                            <span className="text-zinc-700 dark:text-zinc-300">Select Location on Map</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Tip Selection */}
                {/* <Card>
                    <CardContent className="p-6">
                        <h3 className="text-base sm:text-lg font-medium mb-4">Add a Tip (Optional)</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:flex gap-2">
                            {[0, 5, 10, 20, 50].map((amount) => (
                                <Button
                                    key={amount}
                                    variant={tipAmount === amount ? "default" : "outline"}
                                    onClick={() => setTipAmount(amount)}
                                    className={cn(
                                        "text-xs sm:text-sm md:text-base w-full md:flex-1",
                                        tipAmount === amount && "bg-[#FF4B55] hover:bg-[#FF4B55]/90"
                                    )}
                                >
                                    {amount === 0 ? "No Tip" : `${currency}${amount}`}
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card> */}

                {/* Cooking Request Dialog */}
                <Dialog open={isCookingRequestOpen} onOpenChange={setIsCookingRequestOpen}>
                    <DialogContent className="bg-white dark:bg-zinc-800 dark:text-white">
                        <DialogHeader>
                            <DialogTitle>Add Cooking Request</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <Textarea
                                placeholder="Enter your cooking preferences or special requests..."
                                className="min-h-[100px] dark:bg-zinc-900 dark:border-zinc-700"
                                defaultValue={currentItemId ? cartItems.find(item => item._id === currentItemId)?.cookingRequest || '' : ''}
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsCookingRequestOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        const textareaValue = (document.querySelector('textarea') as HTMLTextAreaElement)?.value || ''
                                        handleCookingRequestSave(textareaValue)
                                    }}
                                >
                                    Save Request
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={isTakeawayDialogOpen} onOpenChange={setIsTakeawayDialogOpen}>
                    <DialogContent className="bg-white dark:bg-zinc-800 dark:text-white">
                        <DialogHeader>
                            <DialogTitle>Takeaway Options</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            {/* Check if item is already marked as takeaway */}
                            {currentItemId && cartItems.find(item => item._id === currentItemId)?.isTakeaway ? (
                                <div className="space-y-4">
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                                            <span className="text-green-700 dark:text-green-300 font-medium">
                                                Currently marked as takeaway
                                            </span>
                                        </div>
                                        <p className="text-sm text-green-600 dark:text-green-400">
                                            Quantity: {cartItems.find(item => item._id === currentItemId)?.takeawayQuantity || 1} of {cartItems.find(item => item._id === currentItemId)?.quantity || 1}
                                        </p>
                                    </div>

                                    <div>
                                        <Label className="block mb-2">Update takeaway quantity</Label>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                disabled={selectedTakeawayQuantity <= 1}
                                                onClick={() => setSelectedTakeawayQuantity(prev => Math.max(1, prev - 1))}
                                            >
                                                <CircleMinus className="h-4 w-4" />
                                            </Button>
                                            <span className="w-10 text-center">{selectedTakeawayQuantity}</span>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                disabled={!!currentItemId && selectedTakeawayQuantity >=
                                                    (cartItems.find(item => item._id === currentItemId)?.quantity || 1)}
                                                onClick={() => {
                                                    if (currentItemId) {
                                                        const maxQuantity = cartItems.find(item => item._id === currentItemId)?.quantity || 1;
                                                        setSelectedTakeawayQuantity(prev => Math.min(maxQuantity, prev + 1));
                                                    }
                                                }}
                                            >
                                                <CirclePlus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        {currentItemId && (
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                                                Maximum: {cartItems.find(item => item._id === currentItemId)?.quantity || 1}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex justify-between gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={handleTakeawayCancellation}
                                            className="flex-1 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                                        >
                                            Cancel Takeaway
                                        </Button>
                                        <Button
                                            onClick={handleTakeawayQuantitySave}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            Update Takeaway
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <Label className="block mb-2">Select quantity for takeaway</Label>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                disabled={selectedTakeawayQuantity <= 1}
                                                onClick={() => setSelectedTakeawayQuantity(prev => Math.max(1, prev - 1))}
                                            >
                                                <CircleMinus className="h-4 w-4" />
                                            </Button>
                                            <span className="w-10 text-center">{selectedTakeawayQuantity}</span>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                disabled={!!currentItemId && selectedTakeawayQuantity >=
                                                    (cartItems.find(item => item._id === currentItemId)?.quantity || 1)}
                                                onClick={() => {
                                                    if (currentItemId) {
                                                        const maxQuantity = cartItems.find(item => item._id === currentItemId)?.quantity || 1;
                                                        setSelectedTakeawayQuantity(prev => Math.min(maxQuantity, prev + 1));
                                                    }
                                                }}
                                            >
                                                <CirclePlus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        {currentItemId && (
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                                                Maximum: {cartItems.find(item => item._id === currentItemId)?.quantity || 1}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setIsTakeawayDialogOpen(false);
                                                setCurrentItemId(null);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleTakeawayQuantitySave}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            Confirm Takeaway
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Map Selection Dialog - Only show if delivery is available */}
                {isDeliveryAvailable && (
                    <Dialog open={isMapDialogOpen} onOpenChange={setIsMapDialogOpen}>
                        <DialogContent className="bg-white dark:bg-zinc-800 dark:text-white max-w-5xl w-full h-[90vh]">
                            <DialogHeader>
                                <DialogTitle>Select Location on Map</DialogTitle>
                            </DialogHeader>
                            <div className="flex-1 relative">
                                <div className="w-full h-[50vh] bg-gray-100 dark:bg-zinc-700 rounded-lg overflow-hidden relative">
                                    {/* OpenStreetMap Container */}
                                    <div
                                        id="delivery-map"
                                        className="w-full h-full rounded-lg relative"
                                    >
                                        {/* OpenStreetMap iframe */}
                                        <iframe
                                            key={`map-${mapCenter.lat}-${mapCenter.lng}-${mapZoom}`}
                                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapBounds.west},${mapBounds.south},${mapBounds.east},${mapBounds.north}&layer=mapnik${selectedLocation ? `&marker=${selectedLocation.lat},${selectedLocation.lng}` : ''}&zoom=${mapZoom}`}
                                            width="100%"
                                            height="100%"
                                            style={{
                                                border: 0,
                                                pointerEvents: 'none' // Disable iframe interaction
                                            }}
                                            allowFullScreen
                                            loading="lazy"
                                            referrerPolicy="no-referrer-when-downgrade"
                                            className="rounded-lg"
                                            title="Interactive delivery location map"
                                            onLoad={() => setIsMapLoaded(true)}
                                        />

                                        {/* Click overlay for location selection */}
                                        <div
                                            className="absolute inset-0 cursor-crosshair z-10 bg-transparent"
                                            style={{ pointerEvents: 'auto' }}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const x = e.clientX - rect.left;
                                                const y = e.clientY - rect.top;

                                                // Calculate coordinates based on current map bounds
                                                const mapWidth = rect.width;
                                                const mapHeight = rect.height;

                                                const lng = mapBounds.west + (x / mapWidth) * (mapBounds.east - mapBounds.west);
                                                const lat = mapBounds.north - (y / mapHeight) * (mapBounds.north - mapBounds.south);

                                                // Update selected location
                                                handleLocationSelect(lat, lng);
                                            }}
                                        />

                                        {/* Custom marker overlay for selected location */}
                                        {selectedLocation && (
                                            <div
                                                className="absolute pointer-events-none z-20"
                                                style={{
                                                    left: `${((selectedLocation.lng - mapBounds.west) / (mapBounds.east - mapBounds.west)) * 100}%`,
                                                    top: `${((mapBounds.north - selectedLocation.lat) / (mapBounds.north - mapBounds.south)) * 100}%`,
                                                    transform: 'translate(-50%, -100%)',
                                                    transition: 'all 0.3s ease'
                                                }}
                                            >
                                                <div className="relative">
                                                    <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-pulse">
                                                        <MapPin className="h-3 w-3 text-white" />
                                                    </div>
                                                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                                        Delivery Location
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Loading overlay */}
                                        <div
                                            className={`absolute inset-0 bg-gray-100 dark:bg-zinc-700 flex items-center justify-center transition-opacity duration-500 z-30 ${isMapLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                                        >
                                            <div className="text-center">
                                                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">Loading map...</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Map Controls */}
                                    <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
                                        <div className="bg-white dark:bg-zinc-700 rounded-lg shadow-lg p-2">
                                            <div className="flex flex-col gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-zinc-600"
                                                    onClick={handleZoomIn}
                                                    disabled={mapZoom >= 18}
                                                    title="Zoom in"
                                                >
                                                    <span className="text-lg font-bold">+</span>
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-zinc-600"
                                                    onClick={handleZoomOut}
                                                    disabled={mapZoom <= 3}
                                                    title="Zoom out"
                                                >
                                                    <span className="text-lg font-bold">−</span>
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Current location button */}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-10 w-10 p-0 bg-white dark:bg-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-600"
                                            onClick={handleCurrentLocation}
                                            title="Use current location"
                                        >
                                            <MapPin className="h-4 w-4" />
                                        </Button>

                                        {/* Search location button */}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-10 px-3 bg-white dark:bg-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-600"
                                            onClick={() => setShowLocationInput(true)}
                                            title="Search location"
                                        >
                                            <span className="text-xs">Search</span>
                                        </Button>

                                        {/* Reset view button */}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-10 px-2 bg-white dark:bg-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-600"
                                            onClick={handleResetView}
                                            title="Reset view"
                                        >
                                            <Home className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Location Search Input */}
                                {showLocationInput && (
                                    <div className="mt-4 p-4 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
                                        <div className="space-y-2">
                                            <Label htmlFor="location-search" className="text-sm font-medium">
                                                Search for a location
                                            </Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="location-search"
                                                    placeholder="Enter address, city, or landmark"
                                                    value={locationSearchQuery}
                                                    onChange={(e) => setLocationSearchQuery(e.target.value)}
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleLocationSearch();
                                                        }
                                                    }}
                                                    className="flex-1"
                                                />

                                            </div>
                                            <Button
                                                onClick={handleLocationSearch}
                                                disabled={!locationSearchQuery.trim() || isSearching}
                                                className="bg-blue-600 hover:bg-blue-700 mr-2"
                                            >
                                                {isSearching ? 'Searching...' : 'Search'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setShowLocationInput(false);
                                                    setLocationSearchQuery('');
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Action buttons */}
                                <div className="flex justify-between items-center gap-4 mt-6">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setIsMapDialogOpen(false);
                                            setSelectedLocation(null);
                                            setShowLocationInput(false);
                                            setLocationSearchQuery('');
                                            handleResetView();
                                        }}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            if (selectedLocation) {
                                                setIsMapDialogOpen(false);
                                                setShowLocationInput(false);
                                                setLocationSearchQuery('');
                                            } else {
                                                alert('Please select a location on the map first');
                                            }
                                        }}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                        disabled={!selectedLocation}
                                    >
                                        {selectedLocation ? 'Confirm Location' : 'Select Location First'}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

                {/* Payment Section */}
                <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-800 border-t dark:border-zinc-700 p-2">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-2">
                            <div className="w-full sm:w-auto text-center sm:text-left">
                                <div className="flex items-center justify-center sm:justify-start gap-2">
                                    {/* Total display can be added here if needed */}
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="border-zinc-200 dark:border-zinc-700 w-full sm:w-auto"
                                        >
                                            View Detailed Bill
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-white dark:bg-zinc-800 dark:text-white">
                                        <DialogHeader>
                                            <DialogTitle>Bill Details</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                {cartItems.map((item) => (
                                                    <div key={item._id}>
                                                        <div className="flex justify-between text-sm dark:text-zinc-300">
                                                            <span>{item.name} x{item.quantity}</span>
                                                            <span>{currency}{(item.price * item.quantity).toFixed(2)}</span>
                                                        </div>
                                                        {(item.cookingRequest || item.isTakeaway) && (
                                                            <div className="text-xs text-zinc-500 dark:text-zinc-400 pl-4">
                                                                {item.cookingRequest && (
                                                                    <p>Request: {item.cookingRequest}</p>
                                                                )}
                                                                {item.isTakeaway && (
                                                                    <p>Takeaway: {item.takeawayQuantity || 1} of {item.quantity}</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <Separator className="dark:bg-zinc-700" />
                                            <div className="space-y-2">
                                                <div className="flex justify-between dark:text-zinc-300">
                                                    <span>Item Total</span>
                                                    <span>{currency}{subtotal.toFixed(2)}</span>
                                                </div>

                                                {/* Delivery Charge */}
                                                {selectedService === 'home-delivery' && isDeliveryAvailable && deliveryCharge > 0 && (
                                                    <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                                                        <span>Delivery Charge ({deliveryDistance.toFixed(1)} km)</span>
                                                        <span>+{currency}{deliveryCharge.toFixed(2)}</span>
                                                    </div>
                                                )}

                                                {/* GST Details Section */}
                                                {showGstDetails && (
                                                    <>
                                                        <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                                                            <span>CGST ({cgstRate}%)</span>
                                                            <span>+{currency}{cgstAmount.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                                                            <span>SGST ({sgstRate}%)</span>
                                                            <span>+{currency}{sgstAmount.toFixed(2)}</span>
                                                        </div>
                                                    </>
                                                )}

                                                {tipAmount > 0 && (
                                                    <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                                                        <span>Tip</span>
                                                        <span>+{currency}{tipAmount}</span>
                                                    </div>
                                                )}
                                                {platformRate > 0 && (
                                                    <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                                                        <span>Platform Fee ({platformRate.toString()}%)</span>
                                                        <span>+{currency}{platformFee.toFixed(2)}</span>
                                                    </div>
                                                )}

                                                <Separator className="dark:bg-zinc-700" />
                                                <div className="flex justify-between font-bold dark:text-white">
                                                    <span>Grand Total</span>
                                                    <span>{currency}{total.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            {/* Show GST details if present */}
                                            {showGstDetails && (
                                                <div className="mt-4 pt-2 border-t border-gray-200 dark:border-zinc-700">
                                                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                                        <p className="mb-1">Restaurant GST: {restaurantDetails?.gstNumber}</p>
                                                        {restaurantDetails?.address && (
                                                            <p>{restaurantDetails.address}{restaurantDetails?.pincode ? `, ${restaurantDetails.pincode}` : ''}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                                <Button
                                    className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                                    disabled={
                                        (selectedService === 'dine-in' && tableCount > 1 && !tableNumber) ||
                                        (selectedService === 'home-delivery' && isDeliveryAvailable && (!deliveryAddress.trim() || !selectedLocation)) ||
                                        (selectedService === 'home-delivery' && !isDeliveryAvailable) ||
                                        (selectedService === 'room-service' && (!roomNumber.trim() || !isRoomServiceAvailable)) || // NEW
                                        hasInsufficientInventory()
                                    }
                                    onClick={handleProceedToCheckout}
                                >
                                    {hasInsufficientInventory()
                                        ? "Insufficient stock item"
                                        : selectedService === 'dine-in'
                                            ? (tableCount === 1 || tableNumber)
                                                ? `Proceed to Pay (${currency}${total.toFixed(2)})`
                                                : `Select table number (${currency}${total.toFixed(2)})`
                                            : selectedService === 'home-delivery'
                                                ? (!isDeliveryAvailable)
                                                    ? `Delivery not available (${currency}${total.toFixed(2)})`
                                                    : (!deliveryAddress.trim())
                                                        ? `Enter delivery address (${currency}${total.toFixed(2)})`
                                                        : (!selectedLocation)
                                                            ? `Select location on map (${currency}${total.toFixed(2)})`
                                                            : `Proceed to Pay (${currency}${total.toFixed(2)})`
                                                : selectedService === 'room-service' // NEW
                                                    ? (!isRoomServiceAvailable)
                                                        ? `Room service not available (${currency}${total.toFixed(2)})`
                                                        : (!roomNumber.trim())
                                                            ? `Enter room number (${currency}${total.toFixed(2)})`
                                                            : `Proceed to Pay (${currency}${total.toFixed(2)})`
                                                    : `Proceed to Pay (${currency}${total.toFixed(2)})`}
                                </Button>
                            </div>
                        </div>
                        {isCashPaymentPending && (
                            <p className="text-yellow-600 text-center">Pending verification from counter...</p>
                        )}
                        {isCashPaymentVerified && (
                            <div className="text-center">
                                <p className="text-green-600 mb-2">Payment verified!</p>
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                    <Download className="h-4 w-4 mr-2" />
                                    Download Bill
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Item Limit Warning Toast */}
            {showLimitWarning && (
                <div className="fixed bottom-20 left-4 right-4 bg-yellow-600 text-white p-4 rounded-lg animate-slide-up z-50">
                    {limitWarningItem
                        ? `Maximum available quantity reached for ${limitWarningItem}!`
                        : `Maximum available quantity reached!`}
                </div>
            )}

            {/* Adjustment Notice Toast */}
            {showAdjustmentNotice && (
                <div className="fixed bottom-20 left-4 right-4 bg-orange-600 text-white p-4 rounded-lg animate-slide-up z-50">
                    <div className="text-sm">
                        <p className="font-medium mb-1">Cart quantities adjusted due to inventory limits:</p>
                        <p className="text-xs">{adjustedItems.join(', ')}</p>
                    </div>
                </div>
            )}
        </div>
    )
}