import Link from "next/link";
import { NavItem } from "./NavItem";
import { Workspace } from "@/lib/types";

export function AppHeader({ workspace }: { workspace: any }) {
  return (
    <header className="app-header">
      <Link href="/events" className="brand">[App name]</Link>
      {/* <WorkspaceSwitcher name={workspace.name} /> */}
      {workspace.hasSampleData && <span className="badge badge--warn">Sample data</span>}

      <nav aria-label="Main" className="main-nav">
        <NavItem href="/events" className="nav-link">Events</NavItem>
        <NavItem href="/compare" className="nav-link">Compare</NavItem>
      </nav>

      <div className="app-header__right">
        {workspace.isGuest && <button className="btn">Save workspace</button>}
        <button className="avatar" aria-label="Account menu">KA</button>
      </div>
    </header>
  );
}