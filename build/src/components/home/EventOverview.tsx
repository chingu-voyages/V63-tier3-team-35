import { Badge } from "@/components/ui/badge";
import { FeatureGrid } from "./FeatureGrid";

export const EventOverview = () => (
  <div className="min-w-0">
    <Badge
      variant="outline"
      className="mb-2 h-auto rounded-md border-primary/30 bg-primary/10 px-2 py-1 text-primary"
    >
      AI-Powered Event Intelligence
    </Badge>
    <h1 className="m-0 max-w-[680px] text-[28px] leading-[1.2] font-black tracking-tight text-foreground sm:text-[34px] lg:text-[36px]">
      Turn Event Attendance Into Actionable Growth Analytics
    </h1>
    <p className="my-4 mb-6 max-w-[662px] border-l-2 py-0.5 pl-3 text-muted-foreground sm:text-xs">
      An end-to-end event planning and post-event analytics web application that
      uses AI to uncover attendance patterns, evaluate promotional channel
      performance, and optimize marketing strategies
    </p>
    <FeatureGrid />
  </div>
);
