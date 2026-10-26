import { House } from "lucide-react";
import Link from "next/link";
import { NotFoundArt } from "@/components/art/not-found";
import { AnimateIn } from "@/components/motion/animate-in";
import { Button } from "@/components/ui/button";

// Exported as 404.html; GoDaddy serves it for unknown addresses (.htaccess).
export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center p-6">
      <AnimateIn preset="notFound" className="flex max-w-md flex-col items-center gap-6 text-center">
        <div data-anim="art">
          <NotFoundArt className="h-48 sm:h-60" />
        </div>
        <div data-anim="text" className="space-y-2">
          <p className="text-sm font-medium text-primary">404</p>
          <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
          <p className="text-sm text-muted-foreground text-pretty">
            This page doesn&rsquo;t exist or has moved. Check the address, or go back to the CRM.
          </p>
        </div>
        <Button asChild data-anim="action">
          <Link href="/dashboard/">
            <House /> Go to the dashboard
          </Link>
        </Button>
      </AnimateIn>
    </main>
  );
}
