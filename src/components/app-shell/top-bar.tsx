import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { Breadcrumbs } from "./breadcrumbs";

export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex-1">
        <Breadcrumbs />
      </div>
      <div className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center text-xs font-medium">
        TU
      </div>
    </header>
  );
}
