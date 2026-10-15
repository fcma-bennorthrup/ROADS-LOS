// Synthetic, isolated consumers of unchanged shared controls. No App import.
import React from "react";
import { useForm } from "react-hook-form";
import * as B from "@/components/ui/button";
import * as I from "@/components/ui/input";
import * as L from "@/components/ui/label";
import * as T from "@/components/ui/textarea";
import * as Check from "@/components/ui/checkbox";
import * as Radio from "@/components/ui/radio-group";
import * as Switch from "@/components/ui/switch";
import * as Slider from "@/components/ui/slider";
import * as Select from "@/components/ui/select";
import * as Toggle from "@/components/ui/toggle";
import * as Toggles from "@/components/ui/toggle-group";
import * as OTP from "@/components/ui/input-otp";
import * as Form from "@/components/ui/form";
import * as Calendar from "@/components/ui/calendar";
import * as Accordion from "@/components/ui/accordion";
import * as Collapsible from "@/components/ui/collapsible";
import * as Tabs from "@/components/ui/tabs";
import * as Card from "@/components/ui/card";
import * as Badge from "@/components/ui/badge";
import * as Alert from "@/components/ui/alert";
import * as Avatar from "@/components/ui/avatar";
import * as Aspect from "@/components/ui/aspect-ratio";
import * as Separator from "@/components/ui/separator";
import * as Progress from "@/components/ui/progress";
import * as Skeleton from "@/components/ui/skeleton";
import * as Scroll from "@/components/ui/scroll-area";
import * as Resize from "@/components/ui/resizable";
import * as Carousel from "@/components/ui/carousel";
import * as Table from "@/components/ui/table";
import * as Breadcrumb from "@/components/ui/breadcrumb";
import * as Pagination from "@/components/ui/pagination";
import * as Navigation from "@/components/ui/navigation-menu";
import * as Menu from "@/components/ui/menubar";
import * as Command from "@/components/ui/command";
import * as Sidebar from "@/components/ui/sidebar";
import * as Chart from "@/components/ui/chart";
import { RoadsDropdown } from "@/components/loan/RoadsDropdown";
import { RoadsDatePicker } from "@/components/loan/RoadsDatePicker";

export function Box({ name, children }: React.PropsWithChildren<{name:string}>) {
  return <section data-control={name} style={{marginBottom:24, minWidth:0}}>
    <h2 className="headline-300">{name}</h2>{children}
  </section>;
}
export function Forms() {
  const form = useForm({defaultValues:{name:""}});
  React.useEffect(() => {form.setError("name", {message:"Synthetic required field"});}, []);
  const [date, setDate] = React.useState("10/14/2026");
  const [choice, setChoice] = React.useState("");
  return <>
    <Box name="button"><div style={{display:"flex",flexWrap:"wrap",gap:8}}>
      {(["default","secondary","outline","ghost","destructive"] as const).map(variant =>
        <B.Button key={variant} variant={variant}>{variant}</B.Button>)}
      <B.Button disabled>Disabled action</B.Button>
      <B.Button size="sm">Small</B.Button><B.Button size="lg">Large</B.Button>
    </div></Box>
    <Box name="input"><I.Input aria-label="Editable field" defaultValue="Synthetic text" />
      <I.Input aria-label="Disabled field" disabled value="Disabled" readOnly />
      <I.Input aria-label="Invalid field" aria-invalid="true" defaultValue="Invalid sample" /></Box>
    <Box name="label"><L.Label htmlFor="fixture-textarea">Synthetic label</L.Label></Box>
    <Box name="textarea"><T.Textarea id="fixture-textarea" defaultValue="Multiline synthetic text" />
      <T.Textarea aria-label="Disabled multiline" disabled value="Disabled" readOnly /></Box>
    <Box name="checkbox"><Check.Checkbox aria-label="Checkbox" defaultChecked />
      <Check.Checkbox aria-label="Disabled checkbox" disabled /></Box>
    <Box name="radio-group"><Radio.RadioGroup defaultValue="a" aria-label="Radio selection">
      <Radio.RadioGroupItem value="a" aria-label="Option A" />
      <Radio.RadioGroupItem value="b" aria-label="Option B" />
      <Radio.RadioGroupItem value="c" aria-label="Disabled option" disabled />
    </Radio.RadioGroup></Box>
    <Box name="switch"><Switch.Switch aria-label="Switch" defaultChecked />
      <Switch.Switch aria-label="Disabled switch" disabled /></Box>
    <Box name="slider"><Slider.Slider aria-label="Slider" defaultValue={[40]} />
      <Slider.Slider aria-label="Disabled slider" defaultValue={[20]} disabled /></Box>
    <Box name="select"><Select.Select defaultValue="a"><Select.SelectTrigger aria-label="Select option">
      <Select.SelectValue /></Select.SelectTrigger><Select.SelectContent>
      <Select.SelectItem value="a">Synthetic A</Select.SelectItem>
      <Select.SelectItem value="b">Synthetic B</Select.SelectItem>
      <Select.SelectItem disabled value="c">Disabled C</Select.SelectItem>
      </Select.SelectContent></Select.Select></Box>
    <Box name="toggle"><Toggle.Toggle aria-label="Toggle">Toggle</Toggle.Toggle>
      <Toggle.Toggle disabled>Disabled toggle</Toggle.Toggle></Box>
    <Box name="toggle-group"><Toggles.ToggleGroup type="single" defaultValue="a">
      <Toggles.ToggleGroupItem value="a">One</Toggles.ToggleGroupItem>
      <Toggles.ToggleGroupItem value="b">Two</Toggles.ToggleGroupItem>
      <Toggles.ToggleGroupItem value="c" disabled>Disabled</Toggles.ToggleGroupItem>
    </Toggles.ToggleGroup></Box>
    <Box name="input-otp"><OTP.InputOTP maxLength={4} value="1234" aria-label="Code">
      <OTP.InputOTPGroup>{[0,1,2,3].map(index=><OTP.InputOTPSlot key={index} index={index} />)}</OTP.InputOTPGroup>
    </OTP.InputOTP></Box>
    <Box name="form"><Form.Form {...form}><Form.FormField control={form.control} name="name"
      render={({field})=><Form.FormItem><Form.FormLabel>Name</Form.FormLabel>
        <Form.FormControl><I.Input {...field} /></Form.FormControl>
        <Form.FormDescription>Synthetic helper</Form.FormDescription><Form.FormMessage />
      </Form.FormItem>} /></Form.Form></Box>
    <Box name="calendar"><Calendar.Calendar mode="single" defaultMonth={new Date("2026-10-14T12:00:00Z")}
      selected={new Date("2026-10-14T12:00:00Z")} disabled={new Date("2026-10-15T12:00:00Z")} /></Box>
    <Box name="RoadsDropdown"><RoadsDropdown testId="roads-choice" value={choice} onChange={setChoice}
      options={[{value:"a",label:"Synthetic A"},{value:"b",label:"Synthetic B"}]} /></Box>
    <Box name="RoadsDatePicker"><RoadsDatePicker testId="roads-date" value={date} onChange={setDate} />
      <RoadsDatePicker testId="roads-date-disabled" value={date} onChange={setDate} disabled /></Box>
  </>;
}
export function Collections() {
  return <>
    <Box name="accordion"><Accordion.Accordion type="single" collapsible defaultValue="a">
      <Accordion.AccordionItem value="a"><Accordion.AccordionTrigger>Accordion heading</Accordion.AccordionTrigger>
        <Accordion.AccordionContent>Expanded synthetic content</Accordion.AccordionContent></Accordion.AccordionItem>
    </Accordion.Accordion></Box>
    <Box name="collapsible"><Collapsible.Collapsible defaultOpen>
      <Collapsible.CollapsibleTrigger>Collapsible heading</Collapsible.CollapsibleTrigger>
      <Collapsible.CollapsibleContent>Collapsible content</Collapsible.CollapsibleContent>
    </Collapsible.Collapsible></Box>
    <Box name="tabs"><Tabs.Tabs defaultValue="one"><Tabs.TabsList>
      <Tabs.TabsTrigger value="one">First</Tabs.TabsTrigger><Tabs.TabsTrigger value="two">Second</Tabs.TabsTrigger>
      <Tabs.TabsTrigger value="three" disabled>Disabled</Tabs.TabsTrigger></Tabs.TabsList>
      <Tabs.TabsContent value="one">First content</Tabs.TabsContent><Tabs.TabsContent value="two">Second content</Tabs.TabsContent>
    </Tabs.Tabs></Box>
    <Box name="card"><Card.Card><Card.CardHeader><Card.CardTitle>Synthetic card</Card.CardTitle>
      <Card.CardDescription>Description</Card.CardDescription></Card.CardHeader>
      <Card.CardContent>Card content</Card.CardContent><Card.CardFooter>Footer</Card.CardFooter></Card.Card></Box>
    <Box name="badge">{(["default","secondary","outline","destructive"] as const).map(variant=>
      <Badge.Badge key={variant} variant={variant}>{variant}</Badge.Badge>)}</Box>
    <Box name="alert"><Alert.Alert variant="destructive"><Alert.AlertTitle>Synthetic error</Alert.AlertTitle>
      <Alert.AlertDescription>No real operation occurred</Alert.AlertDescription></Alert.Alert></Box>
    <Box name="avatar"><Avatar.Avatar><Avatar.AvatarFallback>SY</Avatar.AvatarFallback></Avatar.Avatar></Box>
    <Box name="aspect-ratio"><div style={{width:160}}><Aspect.AspectRatio ratio={16/9}>
      <span>Aspect content</span></Aspect.AspectRatio></div></Box>
    <Box name="separator"><Separator.Separator /></Box>
    <Box name="progress"><Progress.Progress value={45} aria-label="Synthetic progress" /></Box>
    <Box name="skeleton"><Skeleton.Skeleton style={{width:160,height:24}} /></Box>
    <Box name="scroll-area"><Scroll.ScrollArea style={{height:90,width:"100%"}}>
      {Array.from({length:12},(_,i)=><p key={i}>Synthetic scroll row {i+1}</p>)}
    </Scroll.ScrollArea></Box>
    <Box name="resizable"><Resize.ResizablePanelGroup direction="horizontal" style={{height:80}}>
      <Resize.ResizablePanel>Left</Resize.ResizablePanel><Resize.ResizableHandle withHandle />
      <Resize.ResizablePanel>Right</Resize.ResizablePanel></Resize.ResizablePanelGroup></Box>
    <Box name="carousel"><div style={{margin:"0 40px"}}><Carousel.Carousel>
      <Carousel.CarouselContent>{["First slide","Second slide"].map(t=><Carousel.CarouselItem key={t}>{t}</Carousel.CarouselItem>)}</Carousel.CarouselContent>
      <Carousel.CarouselPrevious /><Carousel.CarouselNext /></Carousel.Carousel></div></Box>
    <Box name="table"><Table.Table><Table.TableCaption>Synthetic table</Table.TableCaption>
      <Table.TableHeader><Table.TableRow><Table.TableHead>Label</Table.TableHead><Table.TableHead>Value</Table.TableHead></Table.TableRow></Table.TableHeader>
      <Table.TableBody><Table.TableRow><Table.TableCell>Sample</Table.TableCell><Table.TableCell>42</Table.TableCell></Table.TableRow></Table.TableBody>
      <Table.TableFooter><Table.TableRow><Table.TableCell colSpan={2}>Footer</Table.TableCell></Table.TableRow></Table.TableFooter>
    </Table.Table></Box>
    <Box name="chart"><Chart.ChartContainer id="synthetic-chart" config={{sample:{label:"Synthetic",color:"#005b94"}}}
      style={{height:60,width:240}}><svg role="img" aria-label="Empty chart container"><text x="5" y="25">Container only; no data chart</text></svg></Chart.ChartContainer></Box>
  </>;
}
export function NavigationControls() {
  return <>
    <Box name="breadcrumb"><Breadcrumb.Breadcrumb><Breadcrumb.BreadcrumbList>
      <Breadcrumb.BreadcrumbItem><Breadcrumb.BreadcrumbLink href="#fixture">Home</Breadcrumb.BreadcrumbLink></Breadcrumb.BreadcrumbItem>
      <Breadcrumb.BreadcrumbSeparator /><Breadcrumb.BreadcrumbItem><Breadcrumb.BreadcrumbPage>Current</Breadcrumb.BreadcrumbPage></Breadcrumb.BreadcrumbItem>
    </Breadcrumb.BreadcrumbList></Breadcrumb.Breadcrumb></Box>
    <Box name="pagination"><Pagination.Pagination><Pagination.PaginationContent>
      <Pagination.PaginationItem><Pagination.PaginationPrevious href="#fixture" /></Pagination.PaginationItem>
      <Pagination.PaginationItem><Pagination.PaginationLink href="#fixture" isActive>1</Pagination.PaginationLink></Pagination.PaginationItem>
      <Pagination.PaginationItem><Pagination.PaginationEllipsis /></Pagination.PaginationItem>
      <Pagination.PaginationItem><Pagination.PaginationNext href="#fixture" /></Pagination.PaginationItem>
    </Pagination.PaginationContent></Pagination.Pagination></Box>
    <Box name="navigation-menu"><Navigation.NavigationMenu><Navigation.NavigationMenuList>
      <Navigation.NavigationMenuItem><Navigation.NavigationMenuTrigger>Navigation</Navigation.NavigationMenuTrigger>
        <Navigation.NavigationMenuContent><Navigation.NavigationMenuLink href="#fixture">Synthetic destination</Navigation.NavigationMenuLink></Navigation.NavigationMenuContent>
      </Navigation.NavigationMenuItem></Navigation.NavigationMenuList></Navigation.NavigationMenu></Box>
    <Box name="menubar"><Menu.Menubar><Menu.MenubarMenu><Menu.MenubarTrigger>Menu</Menu.MenubarTrigger>
      <Menu.MenubarContent><Menu.MenubarItem>Enabled item</Menu.MenubarItem><Menu.MenubarItem disabled>Disabled item</Menu.MenubarItem></Menu.MenubarContent>
    </Menu.MenubarMenu></Menu.Menubar></Box>
    <Box name="command"><Command.Command><Command.CommandInput placeholder="Find synthetic option" />
      <Command.CommandList><Command.CommandEmpty>No results</Command.CommandEmpty><Command.CommandGroup heading="Options">
        <Command.CommandItem>Alpha</Command.CommandItem><Command.CommandItem disabled>Disabled</Command.CommandItem>
      </Command.CommandGroup></Command.CommandList></Command.Command></Box>
  </>;
}
export function SidebarControl() {
  return <Box name="sidebar"><Sidebar.SidebarProvider>
    <Sidebar.Sidebar><Sidebar.SidebarHeader>Fixture navigation</Sidebar.SidebarHeader>
      <Sidebar.SidebarContent><Sidebar.SidebarGroup><Sidebar.SidebarGroupLabel>Group</Sidebar.SidebarGroupLabel>
        <Sidebar.SidebarMenu><Sidebar.SidebarMenuItem><Sidebar.SidebarMenuButton isActive>Current</Sidebar.SidebarMenuButton></Sidebar.SidebarMenuItem>
          <Sidebar.SidebarMenuItem><Sidebar.SidebarMenuButton disabled>Disabled</Sidebar.SidebarMenuButton></Sidebar.SidebarMenuItem></Sidebar.SidebarMenu>
      </Sidebar.SidebarGroup></Sidebar.SidebarContent><Sidebar.SidebarFooter>Footer</Sidebar.SidebarFooter></Sidebar.Sidebar>
      <Sidebar.SidebarInset><Sidebar.SidebarTrigger /><p>Synthetic sidebar content</p></Sidebar.SidebarInset>
    </Sidebar.SidebarProvider></Box>;
}
