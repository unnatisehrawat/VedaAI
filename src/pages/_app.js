import "@/styles/globals.css";
import { Bricolage_Grotesque } from "next/font/google";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});

export default function App({ Component, pageProps }) {
  return (
    <div className={`${bricolage.variable} font-sans`}>
      <Component {...pageProps} />
    </div>
  );
}
