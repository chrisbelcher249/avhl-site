import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata = {
  title: {
    default: "AVHL | American Virtual Hockey League",
    template: "%s | AVHL",
  },
  description: "The official home of the American Virtual Hockey League.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-[#000B36] antialiased">
        <SiteHeader />
        <div className="min-h-[70vh]">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
