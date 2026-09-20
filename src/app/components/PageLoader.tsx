export default function PageLoader() {
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center overflow-hidden bg-white text-[#111111]"
            role="status"
            aria-label="Loading"
        >
            <div className="flex flex-col items-center justify-center p-6 select-none">
                <div className="relative w-80 h-80 flex items-center justify-center">
                    <svg width="320" height="320" viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <g transform="translate(130, 275)">
                            <circle className="stamp-dot-1" cx="12" cy="0" r="5.5" fill="#111111" />
                            <circle className="stamp-dot-2" cx="30" cy="0" r="5.5" fill="#2563eb" />
                            <circle className="stamp-dot-3" cx="48" cy="0" r="5.5" fill="#facc15" stroke="#111111" strokeWidth="1.5" />
                        </g>
                    </svg>
                </div>
            </div>
        </div>
    )
}
