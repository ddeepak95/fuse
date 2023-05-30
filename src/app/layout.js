import "./globals.css";
import Header from "./(site)/components/Header";
import Footer from "./(site)/components/Footer";

export const metadata = {
  title: "FUSE",
  description: "First day of speech feedback!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
