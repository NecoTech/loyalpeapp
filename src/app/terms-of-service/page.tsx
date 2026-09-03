'use client'

import Link from 'next/link';
import Head from 'next/head';
import { useState, useEffect } from 'react';

export default function TermsOfService() {
    const [darkMode, setDarkMode] = useState(false);

    // Check for saved theme preference or default to light mode
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
                <title>Terms of Service | OderApp</title>
                <meta name="description" content="Terms of Service for OderApp restaurant ordering platform" />
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
                            <Link href="/privacy-policy" className="text-slate-700 dark:text-slate-300 font-medium hover:text-orange-500 transition-colors">
                                Privacy Policy
                            </Link>
                            <Link href="/refund-cancellation-policy" className="text-slate-700 dark:text-slate-300 font-medium hover:text-orange-500 transition-colors">
                                Refund Policy
                            </Link>
                            {/* Theme Toggle Button */}
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
                        <h1 className="text-4xl font-bold text-slate-700 dark:text-slate-200 mb-8">Terms of Service</h1>
                        <p className="text-slate-600 dark:text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

                        <div className="prose prose-lg max-w-none">
                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">About Our Company</h2>
                                <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg mb-6">
                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                                        <strong>OderApp</strong> is a product and service offered by <strong>Ceesent Private Limited</strong>,
                                        a company incorporated under the laws of India.
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                        Throughout these Terms of Service, &quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; and &quot;our&quot; refer to
                                        Ceesent Private Limited and its subsidiary services including OderApp.
                                    </p>
                                </div>

                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                                    These Terms and Conditions (&quot;Terms&quot;) constitute a binding agreement between
                                    Ceesent Private Limited, operating through OderApp (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) and you (&quot;you&quot; or &quot;your&quot;),
                                    governing your use of our website and/or purchase of goods/services from us (collectively, &quot;Services&quot;).
                                </p>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                    By using our website and/or making a purchase from us, you expressly agree to the
                                    following Terms.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">1. Use of Services</h2>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                                    <li>You shall not use our website and/or Services for any purpose that is unlawful, illegal or prohibited under Indian laws, or any other local laws that might apply to you.</li>
                                    <li>It is your responsibility to ensure that any goods, services, or information available through our website meet your specific requirements.</li>
                                    <li>You must be at least 18 years old to use our services and place orders.</li>
                                    <li>You are responsible for maintaining the confidentiality of your account information and password.</li>
                                    <li>All services provided under the OderApp brand are operated and managed by Ceesent Private Limited.</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">2. Orders & Availability</h2>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                                    <li>You agree to provide accurate and complete information for order fulfillment and service delivery. Ceesent Private Limited shall not be liable for issues resulting from incorrect or incomplete information you provide to us.</li>
                                    <li>All purchases/orders are subject to availability.</li>
                                    <li>We reserve the right to cancel orders at our discretion, including but not limited to cases of non-availability of goods you wish to purchase from us or if the order is suspected of fraud.</li>
                                    <li>Order confirmation does not guarantee availability until payment is processed and confirmed.</li>
                                    <li>All orders placed through OderApp are processed by Ceesent Private Limited&apos;s systems and infrastructure.</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">3. Payments</h2>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                                    <li>Payments must be made in full at the time of purchase unless otherwise agreed upon by Ceesent Private Limited.</li>
                                    <li>You must ensure that the payment details provided are valid and belong to you.</li>
                                    <li>All prices are listed in Indian Rupees (INR) unless otherwise specified.</li>
                                    <li>Payment processing fees may apply and will be clearly indicated during checkout.</li>
                                    <li>We accept various payment methods including credit/debit cards, digital wallets, and cash payments.</li>
                                    <li>All financial transactions are processed through Ceesent Private Limited&apos;s authorized payment gateways and merchant accounts.</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">4. Liability</h2>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                                    <li>Ceesent Private Limited shall not be liable for any loss or damage arising from the use of our Services, whether direct, indirect, or consequential.</li>
                                    <li>We shall not be liable for any loss or damage arising directly or indirectly from the decline of authorization for any transaction due to the Cardholder exceeding the preset limit mutually agreed upon with our acquiring bank.</li>
                                    <li>Our total liability to you for any damages shall not exceed the amount paid by you for the specific service or product.</li>
                                    <li>We are not responsible for any damages to your device or data loss resulting from the use of our platform.</li>
                                    <li>The liability limitations apply to both Ceesent Private Limited and all its subsidiary services including OderApp.</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">5. Governing Law & Disputes</h2>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                    Any dispute arising out of the use of our website, purchase from us, or any
                                    engagement with Ceesent Private Limited or OderApp shall be subject to the laws of India.
                                </p>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                    All disputes shall be resolved through binding arbitration in accordance with the
                                    Indian Arbitration and Conciliation Act, 2015, conducted in India.
                                </p>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                    The jurisdiction for any legal proceedings shall be the courts in the city where
                                    Ceesent Private Limited is registered.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">6. Restaurant Partners</h2>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                                    <li>Restaurant partners must comply with all local health and safety regulations.</li>
                                    <li>Partners are responsible for the quality and safety of food products served through our platform.</li>
                                    <li>Menu information and pricing must be kept accurate and up-to-date.</li>
                                    <li>Partners must honor all orders received through the platform during operating hours.</li>
                                    <li>Commission and payment terms will be outlined in separate partnership agreements with Ceesent Private Limited.</li>
                                    <li>All restaurant partnerships are managed and executed by Ceesent Private Limited through the OderApp platform.</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">7. Intellectual Property</h2>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                                    <li>All content on our platform, including logos, trademarks, and software, is the property of Ceesent Private Limited or licensed to us.</li>
                                    <li>The &quot;OderApp&quot; brand and all related trademarks are owned by Ceesent Private Limited.</li>
                                    <li>You may not reproduce, distribute, or create derivative works from our content without written permission from Ceesent Private Limited.</li>
                                    <li>Restaurant partners retain ownership of their menu content and brand materials.</li>
                                    <li>By using our platform, you grant Ceesent Private Limited a license to use feedback and suggestions you provide.</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">8. Privacy & Data Protection</h2>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                                    <li>Your privacy is important to us. Please review our Privacy Policy for details on data collection and use by Ceesent Private Limited.</li>
                                    <li>We implement appropriate security measures to protect your personal information.</li>
                                    <li>You consent to the collection and use of your data as outlined in our Privacy Policy.</li>
                                    <li>Ceesent Private Limited may use your information to improve our services and communicate with you about orders and updates.</li>
                                    <li>All data processing activities comply with applicable Indian data protection laws and regulations.</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">9. Modifications to Terms</h2>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                    Ceesent Private Limited reserves the right to modify these Terms at any time. Changes will be effective
                                    immediately upon posting on our website.
                                </p>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Continued use of our services after any modifications constitutes acceptance of the
                                    updated Terms.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">10. Contact Information</h2>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                    If you have any questions regarding these Terms, please contact us at:
                                </p>
                                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                                    <p className="text-slate-700 dark:text-slate-300 font-medium">Ceesent Private Limited</p>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">(Operating as OderApp)</p>

                                    <div className="mb-4">
                                        <p className="text-slate-700 dark:text-slate-300 font-medium mb-1">Registered Address:</p>
                                        <p className="text-slate-600 dark:text-slate-400">Kodikulam P.O, Thodupuzha</p>
                                        <p className="text-slate-600 dark:text-slate-400">Kerala, Pin: 685582</p>
                                        <p className="text-slate-600 dark:text-slate-400">India</p>
                                    </div>

                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <p className="text-slate-700 dark:text-slate-300 font-medium mb-2">Contact Information:</p>
                                        <p className="text-slate-600 dark:text-slate-400">Email: odertechnology@gmail.com</p>
                                        <p className="text-slate-600 dark:text-slate-400">Phone: 7736570463</p>
                                        <p className="text-slate-600 dark:text-slate-400">Support Hours: 24/7</p>
                                    </div>
                                </div>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">11. Food Safety & Quality</h2>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                                    <li>All restaurant partners are required to maintain food safety standards as per FSSAI guidelines.</li>
                                    <li>Ceesent Private Limited reserves the right to suspend or terminate restaurant partners who fail to maintain quality standards.</li>
                                    <li>Customers should report any food safety concerns immediately through our support channels.</li>
                                    <li>We facilitate communication between customers and restaurants but are not directly responsible for food preparation.</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">12. Delivery Services</h2>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                                    <li>Delivery times are estimates and may vary based on various factors including weather, traffic, and order volume.</li>
                                    <li>Customers must be available at the delivery address during the estimated delivery window.</li>
                                    <li>Ceesent Private Limited is not responsible for orders that cannot be delivered due to incorrect address information or customer unavailability.</li>
                                    <li>Delivery charges, if applicable, will be clearly displayed before order confirmation.</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">13. User Conduct</h2>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                                    <li>Users must not misuse our platform for any fraudulent activities or spam.</li>
                                    <li>Abusive behavior towards restaurant staff or delivery personnel will result in account suspension.</li>
                                    <li>Users are prohibited from sharing login credentials with unauthorized parties.</li>
                                    <li>Any attempt to manipulate reviews or ratings is strictly prohibited.</li>
                                    <li>Violation of these conduct rules may result in immediate termination of services by Ceesent Private Limited.</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">14. Corporate Structure</h2>
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                        <strong>Ceesent Private Limited</strong> is the parent company that owns and operates
                                        the OderApp platform and all related services.
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                        All business operations, legal obligations, and customer relationships are managed
                                        under the umbrella of Ceesent Private Limited.
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                        Any legal notices, communications, or business correspondence should be addressed
                                        to Ceesent Private Limited.
                                    </p>
                                </div>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">15. Severability</h2>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                    If any provision of these Terms is found to be unenforceable or invalid,
                                    the remaining provisions will continue to be valid and enforceable.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">16. Entire Agreement</h2>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                    These Terms constitute the entire agreement between you and Ceesent Private Limited
                                    regarding the use of our Services and supersede all prior and contemporaneous agreements and understandings.
                                </p>
                            </section>
                        </div>

                        {/* <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                            <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-300 mb-2">Important Notice</h3>
                                <p className="text-sm text-orange-700 dark:text-orange-400 mb-3">
                                    These Terms of Service are effective as of {new Date().toLocaleDateString()} and were last updated on {new Date().toLocaleDateString()}.
                                    By continuing to use our services, you acknowledge that you have read, understood, and agree to be bound by these Terms.
                                </p>
                                <p className="text-sm text-orange-700 dark:text-orange-400">
                                    <strong>Corporate Entity:</strong> All services are provided by Ceesent Private Limited, 
                                    and all legal obligations and rights are governed under this corporate entity.
                                </p>
                            </div>
                        </div> */}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-slate-800 dark:bg-gray-900 text-white py-8 transition-colors duration-300">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-gray-300 dark:text-gray-400">
                        &copy; {new Date().getFullYear()} Ceesent Private Limited. All rights reserved.
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                        Operating as OderApp
                    </p>
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