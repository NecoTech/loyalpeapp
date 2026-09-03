'use client'

import Link from 'next/link';
import Head from 'next/head';
import { useState, useEffect } from 'react';

type ContactDetails = {
    companyName: string;
    brandName: string;
    email: string;
    phone: string;
    address: string;
    supportHours: string;
    dpoName: string;
    website: string;
    displayName: string;
    isRestaurant: boolean;
    restaurantId: string | null;
    restaurantName: string | null;
};

const FALLBACK_CONTACT: ContactDetails = {
    companyName: 'Ceesent Private Limited',
    brandName: 'OderApp',
    email: 'odertechnology@gmail.com',
    phone: '7736570463',
    address: 'Kerala, India',
    supportHours: '24/7',
    dpoName: 'Data Protection Officer',
    website: 'https://oderapp.com',
    displayName: 'Ceesent Private Limited',
    isRestaurant: false,
    restaurantId: null,
    restaurantName: null,
};

function ContactSkeleton() {
    return (
        <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            ))}
        </div>
    );
}

export default function PrivacyPolicy() {
    const [darkMode, setDarkMode] = useState(false);
    const [contact, setContact] = useState<ContactDetails>(FALLBACK_CONTACT);
    const [contactLoading, setContactLoading] = useState(true);

    // Theme preference
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            setDarkMode(true);
            document.documentElement.classList.add('dark');
        } else {
            setDarkMode(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);


    // Read restaurantId from localStorage then fetch and decrypt contact details
    useEffect(() => {
        const SECRET_KEY = "/sK:>}K=*NW*)NN46RW=?}KqS6J&s{K.";

        const decryptResponse = (encryptedData: string): ContactDetails | null => {
            try {
                // CryptoJS is available via the crypto-js npm package
                const CryptoJS = require("crypto-js");
                const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
                const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
                if (!decryptedString) return null;
                return JSON.parse(decryptedString) as ContactDetails;
            } catch (err) {
                console.warn("Failed to decrypt contact response:", err);
                return null;
            }
        };

        const storedRestaurantId =
            localStorage.getItem("restaurantId") ||
            localStorage.getItem("lastVisitedRestaurantId") ||
            null;

        const fetchContact = async () => {
            try {
                const url = storedRestaurantId
                    ? `${process.env.NEXT_PUBLIC_API_URL}/api/platform/contact?restaurantId=${encodeURIComponent(storedRestaurantId)}`
                    : `${process.env.NEXT_PUBLIC_API_URL}/api/platform/contact`;

                const res = await fetch(url);
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.encryptedResponse) {
                        const decrypted = decryptResponse(json.encryptedResponse);
                        if (decrypted) setContact(decrypted);
                    }
                }
            } catch (err) {
                console.warn("Could not fetch contact details, using fallback:", err);
                // FALLBACK_CONTACT already set as default state
            } finally {
                setContactLoading(false);
            }
        };

        fetchContact();
    }, []);


    const toggleTheme = () => {
        const newTheme = !darkMode;
        setDarkMode(newTheme);
        localStorage.setItem('theme', newTheme ? 'dark' : 'light');

        if (newTheme) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
            <Head>
                <title>Privacy Policy | OderApp</title>
                <meta name="description" content="Privacy Policy for OderApp restaurant ordering platform" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-md transition-colors duration-300">
                <div className="container mx-auto px-4 py-4">
                    <nav className="flex justify-between items-center">
                        <Link href="/" className="text-2xl font-bold text-orange-500">
                            Oder<span className="text-slate-700 dark:text-slate-300">App</span>
                        </Link>
                        <div className="flex items-center space-x-4">
                            <Link href="/" className="text-slate-700 dark:text-slate-300 font-medium hover:text-orange-500 transition-colors">
                                Home
                            </Link>
                            <Link href="/terms-of-service" className="text-slate-700 dark:text-slate-300 font-medium hover:text-orange-500 transition-colors">
                                Terms of Service
                            </Link>
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                aria-label="Toggle theme"
                            >
                                {darkMode ? (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </nav>
                </div>
            </header>

            <main className="flex-1">
                <div className="container mx-auto px-4 py-12">
                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-4xl font-bold text-slate-700 dark:text-slate-200 mb-8">Privacy Policy</h1>
                        <p className="text-slate-600 dark:text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

                        <div className="prose prose-lg max-w-none">

                            {/* Company Info Banner */}
                            {/* <section className="mb-8">
                                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-6 rounded-lg">
                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-2">
                                        <strong>OderApp</strong> is a product of <strong>Ceesent Private Limited</strong>, a company incorporated under the laws of India.
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                        Throughout this Privacy Policy, &quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; and &quot;our&quot; refer to Ceesent Private Limited, operating the OderApp platform.
                                    </p>
                                </div>
                            </section> */}

                            {/* <section className="mb-8">
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                                    At OderApp, we are committed to protecting your privacy and ensuring the security of your personal information.
                                    This Privacy Policy explains how Ceesent Private Limited collects, uses, discloses, and safeguards your information when you use our
                                    restaurant ordering platform and services.
                                </p>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                    By using our services, you consent to the collection and use of your information as described in this policy.
                                </p>
                            </section> */}

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">1. Information We Collect</h2>

                                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-3">Personal Information</h3>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400 mb-4">
                                    <li>Name, email address, and phone number</li>
                                    <li>Delivery address and location data</li>
                                    <li>Payment information (processed securely through third-party providers)</li>
                                    <li>Order history and preferences</li>
                                    <li>Account credentials and profile information</li>
                                </ul>

                                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-3">Automatically Collected Information</h3>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400 mb-4">
                                    <li>Device information (IP address, browser type, operating system)</li>
                                    <li>Usage data (pages visited, time spent, click patterns)</li>
                                    <li>Location data (when you enable location services)</li>
                                    <li>Cookies and similar tracking technologies</li>
                                </ul>

                                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-3">Restaurant Partner Information</h3>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                                    <li>Business registration details and tax information</li>
                                    <li>Menu items, pricing, and restaurant information</li>
                                    <li>Banking details for payment processing</li>
                                    <li>Staff contact information</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">2. How We Use Your Information</h2>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                                    <li><strong>Order Processing:</strong> To process and fulfill your food orders, including payment processing and delivery coordination</li>
                                    <li><strong>Customer Service:</strong> To respond to your inquiries, provide support, and resolve issues</li>
                                    <li><strong>Communication:</strong> To send order confirmations, updates, and important service notifications</li>
                                    <li><strong>Personalization:</strong> To customize your experience and provide relevant recommendations</li>
                                    <li><strong>Analytics:</strong> To analyze usage patterns and improve our services</li>
                                    <li><strong>Marketing:</strong> To send promotional offers and updates (with your consent)</li>
                                    <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
                                    <li><strong>Security:</strong> To protect against fraud and unauthorized access</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">3. Information Sharing and Disclosure</h2>

                                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-3">We may share your information with:</h3>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400 mb-4">
                                    <li><strong>Restaurant Partners:</strong> Order details necessary for food preparation and delivery</li>
                                    <li><strong>Delivery Partners:</strong> Contact and address information for order delivery</li>
                                    <li><strong>Payment Processors:</strong> Financial information necessary for payment processing</li>
                                    <li><strong>Service Providers:</strong> Third-party vendors who assist with our operations</li>
                                    <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
                                </ul>

                                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-3">We do not:</h3>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                                    <li>Sell your personal information to third parties</li>
                                    <li>Share your information for marketing purposes without consent</li>
                                    <li>Disclose sensitive information unnecessarily</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">4. Data Security</h2>
                                {/* <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                    Ceesent Private Limited implements comprehensive security measures to protect your personal information:
                                </p> */}
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                                    <li>SSL encryption for data transmission</li>
                                    <li>Secure servers and databases with restricted access</li>
                                    <li>Regular security audits and updates</li>
                                    <li>Employee training on data protection</li>
                                    <li>PCI DSS compliance for payment processing</li>
                                    <li>Multi-factor authentication for admin accounts</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">5. Cookies and Tracking Technologies</h2>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                    We use cookies and similar technologies to enhance your experience:
                                </p>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400 mb-4">
                                    <li><strong>Essential Cookies:</strong> Required for basic website functionality</li>
                                    <li><strong>Performance Cookies:</strong> Help us understand how you use our website</li>
                                    <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
                                    <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements</li>
                                </ul>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                    You can manage cookie preferences through your browser settings, though disabling certain cookies may affect website functionality.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">6. Your Rights and Choices</h2>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">You have the following rights regarding your personal information:</p>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                                    <li><strong>Access:</strong> Request access to your personal information</li>
                                    <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                                    <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                                    <li><strong>Portability:</strong> Request a copy of your data in a portable format</li>
                                    <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                                    <li><strong>Restrict Processing:</strong> Limit how we use your information</li>
                                    <li><strong>Account Deletion:</strong> Delete your account and associated data</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">7. Data Retention</h2>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">We retain your information for as long as necessary to:</p>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                                    <li>Provide our services and support</li>
                                    <li>Comply with legal obligations</li>
                                    <li>Resolve disputes and enforce agreements</li>
                                    <li>Improve our services and user experience</li>
                                </ul>
                                {/* <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-4">
                                    Typically, Ceesent Private Limited retains personal information for 3-7 years after account closure,
                                    unless a longer retention period is required by law.
                                </p> */}
                            </section>

                            {/* <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">9. Children&apos;s Privacy</h2>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                    OderApp is not intended for children under 13 years of age. Ceesent Private Limited does not knowingly
                                    collect personal information from children under 13.
                                </p>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                    If we become aware that we have collected personal information from a child under 13,
                                    we will take steps to delete such information promptly.
                                </p>
                            </section> */}
                            {/* 
                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">10. Third-Party Links</h2>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                    OderApp may contain links to third-party websites or services. Ceesent Private Limited is not responsible
                                    for the privacy practices of these external sites. We encourage you to review their privacy
                                    policies before providing any personal information.
                                </p>
                            </section> */}

                            {/* <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">11. Updates to This Policy</h2>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                    Ceesent Private Limited may update this Privacy Policy from time to time to reflect changes in our practices
                                    or applicable laws. We will notify you of any material changes by:
                                </p>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                                    <li>Posting the updated policy on our website</li>
                                    <li>Sending email notifications for significant changes</li>
                                    <li>Displaying prominent notices on our platform</li>
                                </ul>
                            </section> */}

                            {/* ── Section 12: Contact — dynamically populated from MongoDB ── */}
                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">
                                    {contactLoading
                                        ? '12. Contact Us'
                                        : contact.isRestaurant
                                            ? `12. Contact ${contact.restaurantName}`
                                            : '12. Contact Us'}
                                </h2>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                    If you have any questions, concerns, or requests regarding this Privacy Policy or our
                                    data practices, please contact us:
                                </p>

                                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                                    {contactLoading ? (
                                        <ContactSkeleton />
                                    ) : (
                                        <div className="space-y-1">
                                            {/* Restaurant name shown prominently when in restaurant context */}
                                            {contact.isRestaurant && contact.restaurantName && (
                                                <p className="text-slate-700 dark:text-slate-300 font-semibold text-lg">
                                                    {contact.restaurantName}
                                                </p>
                                            )}

                                            {/* <p className="text-slate-700 dark:text-slate-300 font-medium">
                                                {contact.dpoName}
                                            </p> */}
                                            {/* <p className="text-slate-700 dark:text-slate-300 font-medium">
                                                {contact.companyName}
                                            </p> */}

                                            {/* {!contact.isRestaurant && (
                                                <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                                                    (Operating as OderApp)
                                                </p>
                                            )} */}

                                            {contact.address && (
                                                <p className="text-slate-600 dark:text-slate-400">
                                                    Address: {contact.address}
                                                </p>
                                            )}

                                            {contact.email && (
                                                <p className="text-slate-600 dark:text-slate-400">
                                                    Email:{' '}
                                                    <a
                                                        href={`mailto:${contact.email}`}
                                                        className="text-orange-500 hover:underline"
                                                    >
                                                        {contact.email}
                                                    </a>
                                                </p>
                                            )}

                                            {contact.phone && (
                                                <p className="text-slate-600 dark:text-slate-400">
                                                    Phone:{' '}
                                                    <a
                                                        href={`tel:${contact.phone}`}
                                                        className="text-orange-500 hover:underline"
                                                    >
                                                        {contact.phone}
                                                    </a>
                                                </p>
                                            )}

                                            {/* <p className="text-slate-600 dark:text-slate-400">
                                                Support Hours: {contact.supportHours}
                                            </p> */}

                                            {/* Platform attribution when showing restaurant contact */}
                                            {/* {contact.isRestaurant && (
                                                <p className="text-slate-500 dark:text-slate-500 text-sm mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                    Platform operated by {contact.companyName} · OderApp
                                                </p>
                                            )} */}

                                            {/* <p className="text-slate-600 dark:text-slate-400 mt-2">
                                                <strong>Response Time:</strong> We aim to respond to all privacy inquiries within 30 days.
                                            </p> */}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">14. Governing Law</h2>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                    This Privacy Policy is governed by the laws of India. Any disputes arising from this policy
                                    will be subject to the exclusive jurisdiction of the courts in India, where Ceesent Private Limited is registered.
                                </p>
                            </section> */}

                            {/* <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">15. Consent</h2>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                    By using OderApp, you consent to the collection, use, and sharing of your information
                                    by Ceesent Private Limited as described in this Privacy Policy. If you do not agree with any part of this policy,
                                    please do not use our services.
                                </p>
                            </section> */}
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-slate-800 dark:bg-gray-900 text-white py-8 transition-colors duration-300">
                <div className="container mx-auto px-4 text-center">
                    {/* <p className="text-gray-300 dark:text-gray-400">
                        &copy; {new Date().getFullYear()} Ceesent Private Limited. All rights reserved.
                    </p> */}
                    {/* <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Operating as OderApp</p> */}
                    <div className="flex justify-center space-x-6 mt-4">
                        <Link href="/" className="text-gray-300 dark:text-gray-400 hover:text-orange-500 transition-colors">
                            Home
                        </Link>
                        <Link href="/privacy-policy" className="text-gray-300 dark:text-gray-400 hover:text-orange-500 transition-colors">
                            Privacy Policy
                        </Link>
                        <Link href="/terms-of-service" className="text-gray-300 dark:text-gray-400 hover:text-orange-500 transition-colors">
                            Terms of Service
                        </Link>
                        <Link href="/refund-cancellation-policy" className="text-gray-300 dark:text-gray-400 hover:text-orange-500 transition-colors">
                            Refund Policy
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
