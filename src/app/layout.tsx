import type {Metadata} from "next";
import {Inter} from "next/font/google";
import "./globals.css";
import Link from 'next/link';
import {ReactNode} from 'react';
import {Menu, Music} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Sheet, SheetContent, SheetTrigger} from "@/components/ui/sheet";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Moca Music",
  description: "As app for personal use",
};

// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   return (
//     <html lang="en">
//       <body className={inter.className}>{children}</body>
//     </html>
//   );
// }

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  return (
      <html lang="en">
      <body>
      <div>
        <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          <nav
              className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
            <Link
                href="#"
                className="flex items-center gap-2 text-lg font-semibold md:text-base"
            >
              <Music className="h-6 w-6"/>
              <span className="sr-only">Moca Music</span>
            </Link>
            <h1>Moca Music Desktop 1.0</h1>
          </nav>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5"/>
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <nav className="grid gap-6 text-lg font-medium">
                <Link
                    href="#"
                    className="flex items-center gap-2 text-lg font-semibold"
                >
                  <Music className="h-6 w-6"/>
                  <span className="sr-only">Acme Inc</span>
                </Link>
                <Link
                    href="/"
                    className="hover:text-foreground"
                >
                  Baixar nova música
                </Link>
                <Link
                    href="/configs"
                    className="text-muted-foreground hover:text-foreground"
                >
                  Configurações
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </header>
        <main>
          {children}
        </main>
      </div>
      </body>
      </html>
  );
};

export default Layout;
