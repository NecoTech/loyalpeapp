'use client'

import React, { useState, useRef } from 'react'
import { useAuth } from '..//context/AuthContext'
import { useTheme } from 'next-themes'
import { Input } from "..//components/ui/input"
import { Button } from "..//components/ui/button"
import Image from 'next/image'
import { cn } from '..//..//..//lib/utils'
import HCaptcha from '@hcaptcha/react-hcaptcha'

export default function Login() {
    const [fullname, setFullName] = useState('')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [phoneError, setPhoneError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [captchaToken, setCaptchaToken] = useState('')
    const [captchaError, setCaptchaError] = useState('')
    const captchaRef = useRef(null)
    const { login } = useAuth()
    const { theme } = useTheme()

    // Validate Indian phone number
    const validatePhone = (phone: any) => {
        // Indian phone number: 10 digits, may start with +91 or 0
        const indianPhoneRegex = /^(?:\+91|0)?[4-9]\d{9}$/;
        if (!indianPhoneRegex.test(phone)) {
            setPhoneError('Please enter a valid phone number');
            return false;
        }
        setPhoneError('');
        return true;
    };

    const handleCaptchaVerify = (token: any) => {
        setCaptchaToken(token);
        setCaptchaError('');
    };

    const handleCaptchaError = (error: any) => {
        console.error('hCaptcha error:', error);
        setCaptchaError('Failed to verify captcha. Please try again.');
    };

    const handleCaptchaExpire = () => {
        setCaptchaToken('');
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Validate phone number
        if (!validatePhone(phoneNumber)) {
            setIsSubmitting(false);
            return;
        }

        // Check if captcha is completed
        // if (!captchaToken) {
        //     setCaptchaError('Please complete the captcha verification');
        //     setIsSubmitting(false);
        //     return;
        // }

        // Format phone number (remove +91 prefix if exists)
        const formattedPhone = phoneNumber.replace(/^(\+91|0)/, '');

        // Proceed with login
        login({ fullname, phoneNumber: formattedPhone });
        setIsSubmitting(false);
    };

    const handlePhoneChange = (e: any) => {
        const value = e.target.value;
        setPhoneNumber(value);
        if (value.length > 0) {
            validatePhone(value);
        } else {
            setPhoneError('');
        }
    };

    return (
        <div className={cn(
            "min-h-screen flex flex-col items-center justify-center p-4",
            "bg-white text-zinc-900",
            "dark:bg-zinc-900 dark:text-white"
        )}>
            {/* Logo */}
            <div className="mb-4">
                <Image
                    src="/redfont.gif"
                    alt="Order Logo"
                    width={120}
                    height={50}
                    className={cn(
                        "h-40 w-80",
                        theme === "dark" ? "" : ""
                    )}
                    priority
                />
            </div>

            {/* Login Card */}
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#FF385C] mb-2">
                        Welcome
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        {/* Login to order from your favorite restaurant */}
                        Please provide details to order from your favorite restaurant
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Full Name
                        </label>
                        <Input
                            type="text"
                            placeholder="Enter your full name"
                            value={fullname}
                            onChange={(e) => setFullName(e.target.value)}
                            className={cn(
                                "h-12 px-4 text-base",
                                "bg-gray-50 dark:bg-zinc-800",
                                "border border-zinc-200 dark:border-zinc-700",
                                "rounded-xl"
                            )}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Phone Number
                        </label>
                        <Input
                            type="tel"
                            placeholder="Enter your phone number (e.g., 9876543210)"
                            value={phoneNumber}
                            onChange={handlePhoneChange}
                            className={cn(
                                "h-12 px-4 text-base",
                                "bg-gray-50 dark:bg-zinc-800",
                                "border border-zinc-200 dark:border-zinc-700",
                                phoneError ? "border-red-500" : "",
                                "rounded-xl"
                            )}
                            required
                        />
                        {phoneError && (
                            <p className="text-red-500 text-sm mt-1">{phoneError}</p>
                        )}
                    </div>

                    {/* <div className="flex justify-center">
                        <HCaptcha
                            sitekey="" // Replace with your actual hCaptcha sitekey
                            onVerify={handleCaptchaVerify}
                            onError={handleCaptchaError}
                            onExpire={handleCaptchaExpire}
                            ref={captchaRef}
                        />
                    </div>

                    {captchaError && (
                        <p className="text-red-500 text-sm text-center">{captchaError}</p>
                    )} */}

                    <Button
                        type="submit"
                        className={cn(
                            "w-full h-12 text-base font-medium",
                            "bg-[#FF385C] hover:bg-[#FF385C]/90",
                            "rounded-xl"
                        )}
                        // disabled={isSubmitting || !captchaToken}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Verifying...' : 'Open Menu'}
                    </Button>
                </form>

                <div className="mt-4 text-center">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        This site is protected by hCaptcha and its {' '}
                        <a href="https://www.hcaptcha.com/privacy" className="text-[#FF385C]">Privacy Policy</a> and {' '}
                        <a href="https://www.hcaptcha.com/terms" className="text-[#FF385C]">Terms of Service</a> apply.
                    </p>
                </div>
            </div>
        </div>
    )
}