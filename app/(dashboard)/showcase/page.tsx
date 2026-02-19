import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  BarChart3Icon,
  CheckSquareIcon,
  ChevronDownIcon,
  CircleIcon,
  GithubIcon,
  InfoIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground mb-3 text-sm font-medium">
      {children}
    </div>
  );
}

function ItemSection() {
  return (
    <div>
      <SectionLabel>Item</SectionLabel>
      <div className="flex flex-col gap-3">
        <Card size="sm">
          <CardContent className="flex items-center justify-between">
            <div>
              <CardTitle className="font-mono text-sm font-semibold">
                Two-factor authentication
              </CardTitle>
              <CardDescription>
                Verify via email or phone number.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              Enable
            </Button>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <CheckSquareIcon className="text-muted-foreground size-5" />
            <span className="text-sm">Your order has been shipped.</span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ButtonGroupSection() {
  return (
    <div>
      <SectionLabel>Button Group</SectionLabel>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon">
            <ArrowLeftIcon />
          </Button>
          <div className="flex">
            <Button variant="outline" className="rounded-none border-r-0">
              Archive
            </Button>
            <Button variant="outline" className="rounded-none">
              Report
            </Button>
          </div>
          <div className="flex">
            <Button variant="outline" className="rounded-none border-r-0">
              Snooze
            </Button>
            <Button variant="outline" size="icon" className="rounded-none">
              <ChevronDownIcon />
            </Button>
          </div>
          <div className="flex">
            <Button
              variant="outline"
              size="icon"
              className="rounded-none border-r-0"
            >
              <ArrowLeftIcon />
            </Button>
            <Button variant="outline" size="icon" className="rounded-none">
              <ArrowRightIcon />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex">
            <Button variant="outline" className="rounded-none border-r-0">
              1
            </Button>
            <Button variant="outline" className="rounded-none border-r-0">
              2
            </Button>
            <Button variant="outline" className="rounded-none">
              3
            </Button>
          </div>
          <div className="flex">
            <Button variant="outline" className="rounded-none border-r-0">
              Follow
            </Button>
            <Button variant="outline" size="icon" className="rounded-none">
              <ChevronDownIcon />
            </Button>
          </div>
          <div className="flex">
            <Button variant="outline" className="rounded-none border-r-0">
              <GithubIcon />
              Copilot
            </Button>
            <Button variant="outline" size="icon" className="rounded-none">
              <ChevronDownIcon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptySection() {
  return (
    <div>
      <SectionLabel>Empty</SectionLabel>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-4 flex -space-x-3">
            <div className="ring-background size-12 overflow-hidden rounded-full ring-2">
              <img
                src="https://i.pravatar.cc/48?img=11"
                alt="Avatar 1"
                className="size-full object-cover"
              />
            </div>
            <div className="ring-background size-12 overflow-hidden rounded-full ring-2">
              <img
                src="https://i.pravatar.cc/48?img=33"
                alt="Avatar 2"
                className="size-full object-cover"
              />
            </div>
            <div className="bg-primary ring-background flex size-12 items-center justify-center rounded-full ring-2">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-primary-foreground size-6"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
              </svg>
            </div>
          </div>
          <h3 className="mb-1 text-sm font-semibold">No Team Members</h3>
          <p className="text-muted-foreground mb-5 max-w-xs text-xs">
            Invite your team to collaborate on this project.
          </p>
          <div className="flex gap-2">
            <Button variant="outline">Show Dialog</Button>
            <Button>Connect Mouse</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InputGroupSection() {
  return (
    <div>
      <SectionLabel>Input Group</SectionLabel>
      <div className="flex flex-col gap-3">
        {/* Search with results count */}
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput placeholder="Search..." />
          <InputGroupAddon align="inline-end">
            <InputGroupText className="font-mono">12 results</InputGroupText>
          </InputGroupAddon>
        </InputGroup>

        {/* URL input with prefix text and info icon */}
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <InputGroupText className="font-mono">https://</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput placeholder="example.com" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton variant="ghost" size="icon-xs">
              <InfoIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>

        {/* Input with info icon prefix, https:// text, and star suffix */}
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <InfoIcon />
            <InputGroupText className="font-mono">https://</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput placeholder="" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton variant="ghost" size="icon-xs">
              <StarIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>

        {/* Message input with + button and audio icon */}
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <InputGroupButton variant="ghost" size="icon-xs">
              <PlusIcon />
            </InputGroupButton>
          </InputGroupAddon>
          <InputGroupInput placeholder="Send a message..." />
          <InputGroupAddon align="inline-end">
            <InputGroupButton variant="ghost" size="icon-xs">
              <BarChart3Icon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>

        {/* Textarea with footer */}
        <InputGroup className="h-auto flex-col">
          <InputGroupTextarea placeholder="Ask, Search or Chat..." />
          <InputGroupAddon
            align="block-end"
            className="flex items-center justify-between border-t"
          >
            <div className="flex items-center gap-2">
              <InputGroupButton variant="ghost" size="icon-xs">
                <PlusIcon />
              </InputGroupButton>
              <InputGroupText className="font-mono text-xs">
                Auto
              </InputGroupText>
            </div>
            <div className="flex items-center gap-2">
              <InputGroupText className="font-mono text-xs">
                52% used
              </InputGroupText>
              <InputGroupButton
                variant="default"
                size="icon-xs"
                className="bg-primary text-primary-foreground"
              >
                <ArrowUpIcon />
              </InputGroupButton>
            </div>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}

function SheetSection() {
  return (
    <div>
      <SectionLabel>Sheet</SectionLabel>
      <div className="flex gap-2">
        <Button variant="outline" className="w-28">
          Top
        </Button>
        <Button variant="outline" className="w-28">
          Right
        </Button>
        <Button variant="outline" className="w-28">
          Bottom
        </Button>
        <Button variant="outline" className="w-28">
          Left
        </Button>
      </div>
    </div>
  );
}

function BadgeSection() {
  return (
    <div>
      <SectionLabel>Badge</SectionLabel>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>
          <CircleIcon className="size-2.5" />
          Syncing
        </Badge>
        <Badge variant="outline">
          <CircleIcon className="size-2.5" />
          Updating
        </Badge>
        <Badge variant="secondary">
          <CircleIcon className="size-2.5" />
          Loading
        </Badge>
        <Badge variant="link">
          <CircleIcon className="size-2.5" />
          Link
        </Badge>
        <Badge>Preview</Badge>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8">
        <ItemSection />
        <ButtonGroupSection />
        <Separator className="col-span-2" />
        <EmptySection />
        <InputGroupSection />
        <Separator className="col-span-2" />
        <SheetSection />
        <BadgeSection />
      </div>
    </div>
  );
}
