// Cities/towns across Kerala's 14 districts — corporations, municipalities,
// and other well-known towns. Used as the searchable suggestion list for a
// restaurant's city field; admins can still type any city name, this is
// just what's offered while typing.
export const KERALA_CITIES = [
    // Thiruvananthapuram
    'Thiruvananthapuram', 'Neyyattinkara', 'Nedumangad', 'Attingal', 'Varkala',
    // Kollam
    'Kollam', 'Punalur', 'Karunagappally', 'Kottarakkara', 'Paravur',
    // Pathanamthitta
    'Pathanamthitta', 'Adoor', 'Pandalam', 'Thiruvalla', 'Konni', 'Mallappally',
    // Alappuzha
    'Alappuzha', 'Cherthala', 'Kayamkulam', 'Mavelikkara', 'Chengannur', 'Haripad',
    // Kottayam
    'Kottayam', 'Changanassery', 'Pala', 'Vaikom', 'Ettumanoor',
    // Idukki
    'Thodupuzha', 'Munnar', 'Kattappana', 'Idukki',
    // Ernakulam
    'Kochi', 'Aluva', 'Angamaly', 'Perumbavoor', 'Muvattupuzha', 'Kothamangalam', 'North Paravur', 'Thrippunithura', 'Kalamassery',
    // Thrissur
    'Thrissur', 'Guruvayur', 'Chalakudy', 'Irinjalakuda', 'Kunnamkulam', 'Kodungallur', 'Chavakkad', 'Wadakkanchery',
    // Palakkad
    'Palakkad', 'Ottapalam', 'Shoranur', 'Chittur', 'Mannarkkad', 'Cherpulassery', 'Pattambi',
    // Malappuram
    'Malappuram', 'Manjeri', 'Tirur', 'Ponnani', 'Perinthalmanna', 'Kottakkal', 'Nilambur', 'Kondotty', 'Tirurangadi',
    // Kozhikode
    'Kozhikode', 'Vadakara', 'Koyilandy', 'Ramanattukara', 'Feroke',
    // Wayanad
    'Kalpetta', 'Sulthan Bathery', 'Mananthavady',
    // Kannur
    'Kannur', 'Thalassery', 'Payyanur', 'Taliparamba', 'Mattannur', 'Iritty',
    // Kasaragod
    'Kasaragod', 'Kanhangad', 'Nileshwaram', 'Uppala',
] as const

export type KeralaCity = typeof KERALA_CITIES[number]
