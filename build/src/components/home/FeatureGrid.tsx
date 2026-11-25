import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    title: "Real-Time Check-in Tracking",
    description:
      "Monitor attendee check-ins in real time and prevent duplicate check-ins to maintain accurate attendance records",
  },
  {
    title: "AI-Powered Event Summaries",
    description:
      "Get AI-generated executive summaries after each event, along with recommendations based on event results",
  },
  {
    title: "Promotional Source Attribution",
    description:
      "Identify where event registrations come from by tracking promotional sources such as email, social media, and referrals",
  },
  {
    title: "Multi-Event Benchmarking",
    description:
      "Compare historical performance across multiple events using benchmark data to evaluate and understand event results",
  },
];

export const FeatureGrid = () => (
  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
    {features.map(({ title, description }) => (
      <Card
        key={title}
        size="sm"
        className="gap-1 py-0 border border-border/70 bg-card shadow-none ring-0"
      >
        <CardHeader className="px-3 pt-3 pb-0">
          <CardTitle className="text-xs leading-tight font-extrabold text-card-foreground">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pt-0 pb-3">
          <CardDescription className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </CardDescription>
        </CardContent>
      </Card>
    ))}
  </div>
);
