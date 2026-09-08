export const CITY_NAMES = [
    'Bengaluru',
    'Mumbai',
    'Delhi NCR',
    'Hyderabad',
    'Pune',
    'Kolkata',
    'Chennai',
    'Ahmedabad',
] as const

export type CityName = typeof CITY_NAMES[number]
