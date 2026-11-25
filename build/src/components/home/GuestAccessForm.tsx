"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useHomePage } from "./hooks/useHomePage";

export const GuestAccessForm = () => {
  const {
    organization,
    setOrganization,
    role,
    setRole,
    dataset,
    setDataset,
    handleSubmit,
  } = useHomePage();

  return (
    <Card id="guest-access" className="w-full bg-card py-0">
      <CardHeader className="gap-0 px-5 pt-5 pb-0 sm:px-6 sm:pt-6">
        <CardTitle className="text-sm leading-tight font-black">
          Instant Guest Access
        </CardTitle>
        <CardDescription className="mt-1 border-b border-border pb-3 text-xs leading-relaxed">
          No credit card or permanent signup required for trial
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 pt-4 pb-4 sm:px-6">
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <Label htmlFor="organization" className="text-xs font-bold">
              Organization Name
            </Label>
            <Input
              id="organization"
              name="organization"
              value={organization}
              onChange={(event) => setOrganization(event.target.value)}
              placeholder="Acme Tech Corp"
              className="h-9 rounded-md bg-background px-2.5 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="role" className="text-xs font-bold">
              Your Role
            </Label>
            <Select
              name="role"
              value={role}
              onValueChange={(value) => setRole(value ?? "")}
            >
              <SelectTrigger
                id="role"
                className="h-9 w-full rounded-md bg-background px-2.5 text-xs"
              >
                <SelectValue placeholder="Marketing Lead / Organizer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Marketing Lead">Marketing Lead</SelectItem>
                <SelectItem value="Organizer">Organizer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs leading-tight font-bold">
              Trial Dataset Option
            </p>
            <RadioGroup
              aria-label="Trial Dataset Option"
              value={dataset}
              onValueChange={(value) => setDataset(value ?? "sample")}
              className="gap-1"
            >
              <Label
                htmlFor="dataset-sample"
                className="flex cursor-pointer items-center gap-2 text-xs leading-relaxed text-muted-foreground has-[[data-checked]]:text-foreground"
              >
                <RadioGroupItem id="dataset-sample" value="sample" />
                <span>Pre-load sample tech summit data (350+ attendees)</span>
              </Label>
              <Label
                htmlFor="dataset-empty"
                className="flex cursor-pointer items-center gap-2 text-xs leading-relaxed text-muted-foreground has-[[data-checked]]:text-foreground"
              >
                <RadioGroupItem id="dataset-empty" value="empty" />
                <span>Start with empty workspace</span>
              </Label>
            </RadioGroup>
          </div>

          <Button type="submit" size="lg" className="h-10 w-full text-xs">
            CONTINUE AS GUEST
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
