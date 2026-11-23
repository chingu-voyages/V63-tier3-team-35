import { AppHeader } from "@/components/workspace/AppHeader";


export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader workspace={"Sample Workspace"} />
      {children}
    </>
  );
}