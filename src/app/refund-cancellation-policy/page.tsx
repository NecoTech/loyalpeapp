
'use client'

import Link from 'next/link';
import Head from 'next/head';
import { useState, useEffect } from 'react';

export default function RefundCancellationPolicy() {
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
                <title>Refund and Cancellation Policy | OderApp</title>
                <meta name="description" content="Refund and Cancellation Policy for OderApp restaurant ordering platform" />
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
                            <Link href="/terms-of-service" className="text-slate-700 dark:text-slate-300 font-medium hover:text-orange-500 transition-colors">
                                Terms of Service
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
                        <h1 className="text-4xl font-bold text-slate-700 dark:text-slate-200 mb-8">Refund and Cancellation Policy</h1>
                        <p className="text-slate-600 dark:text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

                        <div className="prose prose-lg max-w-none">
                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">About Our Company</h2>
                                <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg mb-6">
                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                                        This Refund and Cancellation Policy is applicable to services provided by <strong>Ceesent Private Limited</strong>,
                                        operating through the <strong>OderApp</strong> platform.
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                        Throughout this policy, &quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; and &quot;our&quot; refer to
                                        Ceesent Private Limited and its OderApp service.
                                    </p>
                                </div>

                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                                    At OderApp, operated by Ceesent Private Limited, we strive to provide the best food ordering experience. This policy outlines
                                    our procedures for order cancellations, refunds, and replacements to ensure fair treatment
                                    for both customers and restaurant partners.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">Order Cancellation by Customers</h2>

                                <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-6 mb-6">
                                    <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">Before Restaurant Confirmation</h3>
                                    <ul className="list-disc list-inside space-y-2 text-green-700 dark:text-green-400">
                                        <li>Orders can be cancelled within <strong>5 minutes</strong> of placing the order</li>
                                        <li>Full refund will be processed within 3-5 business days</li>
                                        <li>No cancellation charges apply</li>
                                    </ul>
                                </div>

                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-6 mb-6">
                                    <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300 mb-2">After Restaurant Confirmation</h3>
                                    <ul className="list-disc list-inside space-y-2 text-yellow-700 dark:text-yellow-400">
                                        <li>Cancellation may be subject to restaurant&apos;s discretion</li>
                                        <li>Partial refund may apply (excluding preparation costs)</li>
                                        <li>Refund amount will be communicated before cancellation confirmation</li>
                                    </ul>
                                </div>

                                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-6">
                                    <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">After Food Preparation</h3>
                                    <ul className="list-disc list-inside space-y-2 text-red-700 dark:text-red-400">
                                        <li>Orders cannot be cancelled once food preparation has started</li>
                                        <li>No refund will be provided for customer-initiated cancellations</li>
                                        <li>Replacement or credit may be offered for quality issues</li>
                                    </ul>
                                </div>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">Order Cancellation by Restaurants</h2>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                    Restaurants may cancel orders in the following circumstances:
                                </p>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400 mb-4">
                                    <li>Item unavailability or out of stock</li>
                                    <li>Kitchen closure due to unforeseen circumstances</li>
                                    <li>Inability to deliver to the specified location</li>
                                    <li>Technical issues or system errors</li>
                                </ul>
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                                    <h3 className="text-blue-800 dark:text-blue-300 font-semibold mb-2">Customer Protection</h3>
                                    <p className="text-blue-700 dark:text-blue-400">
                                        <strong>Full refund guaranteed</strong> when restaurants cancel orders.
                                        Refunds will be processed by Ceesent Private Limited within 3-5 business days.
                                    </p>
                                </div>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">Refund Policy</h2>

                                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-3">Eligible for Full Refund</h3>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400 mb-4">
                                    <li>Order cancelled by restaurant</li>
                                    <li>Wrong order delivered</li>
                                    <li>Missing items in the order</li>
                                    <li>Food quality issues (spoiled, contaminated, or unsafe)</li>
                                    <li>Significant delivery delays (beyond estimated time by 60+ minutes)</li>
                                    <li>Order not delivered</li>
                                </ul>

                                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-3">Eligible for Partial Refund</h3>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400 mb-4">
                                    <li>Customer cancellation after restaurant confirmation</li>
                                    <li>Partial missing items</li>
                                    <li>Food quality not meeting expectations (case-by-case basis)</li>
                                    <li>Minor delivery delays</li>
                                </ul>

                                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-3">Not Eligible for Refund</h3>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                                    <li>Change of mind after food preparation</li>
                                    <li>Incorrect address provided by customer</li>
                                    <li>Customer unavailable for delivery</li>
                                    <li>Taste preferences or subjective food quality issues</li>
                                    <li>Orders placed during promotional periods (unless specified)</li>
                                </ul>

                                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mt-4">
                                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                                        <strong>Note:</strong> All refund decisions are made by Ceesent Private Limited and are final.
                                        Refunds are processed through the original payment method used for the order.
                                    </p>
                                </div>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">Replacement Policy</h2>

                                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-3">When We Offer Replacements</h3>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400 mb-4">
                                    <li>Wrong items delivered</li>
                                    <li>Missing items from the order</li>
                                    <li>Food quality issues that can be rectified</li>
                                    <li>Damaged packaging affecting food quality</li>
                                </ul>

                                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-3">Replacement Process</h3>
                                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                                    <ol className="list-decimal list-inside space-y-2 text-slate-600 dark:text-slate-400">
                                        <li>Report the issue within <strong>30 minutes</strong> of delivery</li>
                                        <li>Provide order details and description of the problem</li>
                                        <li>Photo evidence may be requested for quality issues</li>
                                        <li>Replacement will be prepared and delivered at no extra cost</li>
                                        <li>Estimated replacement delivery time: 30-45 minutes</li>
                                    </ol>
                                </div>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">Refund Processing Times</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">Digital Payments</h3>
                                        <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                                            <li><strong>Credit/Debit Cards:</strong> 3-5 business days</li>
                                            <li><strong>Digital Wallets:</strong> 1-3 business days</li>
                                            <li><strong>UPI:</strong> 1-2 business days</li>
                                            <li><strong>Net Banking:</strong> 3-5 business days</li>
                                        </ul>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">Cash Payments</h3>
                                        <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                                            <li><strong>Cash on Delivery:</strong> No refund required (payment not made)</li>
                                            <li><strong>Advance Cash Payment:</strong> Refund via bank transfer within 5-7 business days</li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                                        <strong>Note:</strong> Refund processing times may vary depending on your bank or payment provider.
                                        Ceesent Private Limited initiates refunds immediately upon approval, but actual credit to your account depends on your financial institution.
                                    </p>
                                </div>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">Special Circumstances</h2>

                                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-3">Weather-Related Delays</h3>
                                <p className="text-slate-600 dark:text-slate-400 mb-4">
                                    During adverse weather conditions, delivery times may be extended. We will provide regular updates
                                    and offer the option to cancel with full refund if delays exceed 90 minutes.
                                </p>

                                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-3">Festival/Holiday Orders</h3>
                                <p className="text-slate-600 dark:text-slate-400 mb-4">
                                    During peak seasons, delivery times may be longer than usual. Special cancellation terms
                                    may apply, which will be communicated during order placement.
                                </p>

                                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-3">Bulk Orders</h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Orders above ₹2,000 may have different cancellation terms due to preparation requirements.
                                    These will be specified during order confirmation.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">Contact Information</h2>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                    For any cancellation, refund, or return requests, please contact us:
                                </p>
                                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                                    <p className="text-slate-700 dark:text-slate-300 font-medium mb-3">Ceesent Private Limited</p>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">(Operating as OderApp)</p>

                                    <div className="mb-6">
                                        <p className="text-slate-700 dark:text-slate-300 font-medium mb-1">Registered Address:</p>
                                        <p className="text-slate-600 dark:text-slate-400">Kodikulam P.O, Thodupuzha</p>
                                        <p className="text-slate-600 dark:text-slate-400">Kerala, Pin: 685582</p>
                                        <p className="text-slate-600 dark:text-slate-400">India</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <div>
                                            <h3 className="text-slate-700 dark:text-slate-300 font-semibold mb-2">Customer Support</h3>
                                            <p className="text-slate-600 dark:text-slate-400">Phone: 7736570463</p>
                                            <p className="text-slate-600 dark:text-slate-400">Email: odertechnology@gmail.com</p>
                                            <p className="text-slate-600 dark:text-slate-400">Hours: 24/7</p>
                                        </div>
                                        <div>
                                            <h3 className="text-slate-700 dark:text-slate-300 font-semibold mb-2">Refund Queries</h3>
                                            <p className="text-slate-600 dark:text-slate-400">Email: odertechnology@gmail.com</p>
                                            <p className="text-slate-600 dark:text-slate-400">Response Time: Within 24 hours</p>
                                            <p className="text-slate-600 dark:text-slate-400">Status Updates: Via SMS/Email</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">Dispute Resolution</h2>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                    In case of disputes regarding refunds or cancellations:
                                </p>
                                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400 mb-4">
                                    <li>First level resolution through customer support team</li>
                                    <li>Escalation to management team if not resolved within 48 hours</li>
                                    <li>Final decisions rest with Ceesent Private Limited management</li>
                                    <li>Legal disputes shall be subject to the jurisdiction of Kerala courts</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">Policy Updates</h2>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Ceesent Private Limited reserves the right to modify this Refund and Cancellation Policy at any time.
                                    Changes will be effective immediately upon posting on our website. Continued use of our
                                    services after any modifications constitutes acceptance of the updated policy.
                                </p>
                            </section>
                        </div>

                        {/* <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                            <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-300 mb-2">Important Reminder</h3>
                                <p className="text-sm text-orange-700 dark:text-orange-400 mb-3">
                                    This Refund and Cancellation Policy is effective as of {new Date().toLocaleDateString()} and was last updated on {new Date().toLocaleDateString()}.
                                    For the most current version of this policy, please visit our website regularly.
                                </p>
                                <p className="text-sm text-orange-700 dark:text-orange-400">
                                    <strong>Corporate Entity:</strong> All refund and cancellation services are provided by Ceesent Private Limited,
                                    and all related obligations are governed under this corporate entity.
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