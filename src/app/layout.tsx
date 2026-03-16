import type {Metadata} from "next";
import {Inter} from "next/font/google";
import "./globals.css";
import {ReactNode} from 'react';
import {Music} from "lucide-react";
import DisplayVersion from "@/components/internal/display-version";
import ObservabilityProvider from "@/components/internal/observability-provider";
import ErrorBoundary from "@/components/internal/error-boundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Moca Music",
  description: "As app for personal use",
};

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  return (
      <html lang="en">
      <body>
      <div>
        <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-white px-4 shadow-sm">
          <nav className="flex w-full items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-[#ff0000]">
                <Music className="h-4 w-4 text-white"/>
              </div>
              <span className="text-base font-semibold tracking-tight text-[#0f0f0f]">Moca<span className="text-[#ff0000]">Music</span></span>
            </div>
            <div className="ml-auto">
              <DisplayVersion />
            </div>
          </nav>
        </header>
        <main>
          <ObservabilityProvider>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </ObservabilityProvider>
        </main>
      </div>
      </body>
      </html>
  );
};

export default Layout;
