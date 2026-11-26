import { EventOverview } from "./EventOverview";
import { GuestAccessForm } from "./GuestAccessForm";

export const HomePage = () => (
  <section
    className="flex w-full flex-1 items-center bg-muted/40 px-5 py-10 sm:px-8 lg:px-10 lg:py-12"
    aria-label="Event intelligence overview"
  >
    <div className="mx-auto grid w-full max-w-[1168px] grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:gap-10 xl:grid-cols-[minmax(0,672px)_476px] xl:gap-5">
      <EventOverview />
      <GuestAccessForm />
    </div>
  </section>
);
