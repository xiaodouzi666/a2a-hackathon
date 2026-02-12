import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "A2A Bargain Arena",
    description: "SecondMe 双 AI 自动砍价擂台",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body>{children}</body>
        </html>
    );
}
