import "./globals.css";

export const metadata = {
  title: "FUSE",
  description: "First day of speech feedback!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  );
}
