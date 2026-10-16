import React from "react";
import { Button } from "@/components/ui/button";
import * as Dialog from "@/components/ui/dialog";
import * as Alert from "@/components/ui/alert-dialog";
import * as Drawer from "@/components/ui/drawer";
import * as Sheet from "@/components/ui/sheet";
import * as Popover from "@/components/ui/popover";
import * as Tooltip from "@/components/ui/tooltip";
import * as Hover from "@/components/ui/hover-card";
import * as Dropdown from "@/components/ui/dropdown-menu";
import * as Context from "@/components/ui/context-menu";
import * as Toast from "@/components/ui/toast";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";
import { Box } from "./controls";

export function Overlay({kind}:{kind:string}) {
  React.useEffect(() => {
    if (kind === "toaster") toast({title:"Synthetic error",description:"Disposable fixture only",variant:"destructive",duration:Infinity});
  }, []);
  const trigger = <Button data-action="open">Open {kind}</Button>;
  return <Box name={kind}>{
    kind === "dialog" ? <Dialog.Dialog><Dialog.DialogTrigger asChild>{trigger}</Dialog.DialogTrigger>
      <Dialog.DialogContent><Dialog.DialogHeader><Dialog.DialogTitle>Synthetic dialog</Dialog.DialogTitle>
        <Dialog.DialogDescription>Only local fixture state</Dialog.DialogDescription></Dialog.DialogHeader>
        <input aria-label="Dialog field" defaultValue="Synthetic" /><Dialog.DialogFooter>
          <Dialog.DialogClose asChild><Button>Close dialog</Button></Dialog.DialogClose></Dialog.DialogFooter>
      </Dialog.DialogContent></Dialog.Dialog> :
    kind === "alert-dialog" ? <Alert.AlertDialog><Alert.AlertDialogTrigger asChild>{trigger}</Alert.AlertDialogTrigger>
      <Alert.AlertDialogContent><Alert.AlertDialogHeader><Alert.AlertDialogTitle>Confirm synthetic action</Alert.AlertDialogTitle>
        <Alert.AlertDialogDescription>No external operation</Alert.AlertDialogDescription></Alert.AlertDialogHeader>
        <Alert.AlertDialogFooter><Alert.AlertDialogCancel>Cancel</Alert.AlertDialogCancel>
          <Alert.AlertDialogAction>Confirm</Alert.AlertDialogAction></Alert.AlertDialogFooter>
      </Alert.AlertDialogContent></Alert.AlertDialog> :
    kind === "drawer" ? <Drawer.Drawer><Drawer.DrawerTrigger asChild>{trigger}</Drawer.DrawerTrigger>
      <Drawer.DrawerContent><Drawer.DrawerHeader><Drawer.DrawerTitle>Synthetic drawer</Drawer.DrawerTitle>
        <Drawer.DrawerDescription>Local content</Drawer.DrawerDescription></Drawer.DrawerHeader>
        <Drawer.DrawerFooter><Drawer.DrawerClose asChild><Button>Close drawer</Button></Drawer.DrawerClose></Drawer.DrawerFooter>
      </Drawer.DrawerContent></Drawer.Drawer> :
    kind === "sheet" ? <Sheet.Sheet><Sheet.SheetTrigger asChild>{trigger}</Sheet.SheetTrigger>
      <Sheet.SheetContent><Sheet.SheetHeader><Sheet.SheetTitle>Synthetic sheet</Sheet.SheetTitle>
        <Sheet.SheetDescription>Local content</Sheet.SheetDescription></Sheet.SheetHeader>
        <Sheet.SheetFooter><Sheet.SheetClose asChild><Button>Close sheet</Button></Sheet.SheetClose></Sheet.SheetFooter>
      </Sheet.SheetContent></Sheet.Sheet> :
    kind === "popover" ? <Popover.Popover><Popover.PopoverTrigger asChild>{trigger}</Popover.PopoverTrigger>
      <Popover.PopoverContent><p>Synthetic popover</p><input aria-label="Popover field" /></Popover.PopoverContent></Popover.Popover> :
    kind === "tooltip" ? <Tooltip.TooltipProvider delayDuration={0}><Tooltip.Tooltip>
      <Tooltip.TooltipTrigger asChild>{trigger}</Tooltip.TooltipTrigger><Tooltip.TooltipContent>Synthetic tooltip</Tooltip.TooltipContent>
    </Tooltip.Tooltip></Tooltip.TooltipProvider> :
    kind === "hover-card" ? <Hover.HoverCard openDelay={0}><Hover.HoverCardTrigger asChild>{trigger}</Hover.HoverCardTrigger>
      <Hover.HoverCardContent>Synthetic hover card</Hover.HoverCardContent></Hover.HoverCard> :
    kind === "dropdown-menu" ? <Dropdown.DropdownMenu><Dropdown.DropdownMenuTrigger asChild>{trigger}</Dropdown.DropdownMenuTrigger>
      <Dropdown.DropdownMenuContent><Dropdown.DropdownMenuLabel>Actions</Dropdown.DropdownMenuLabel>
        <Dropdown.DropdownMenuItem>Enabled</Dropdown.DropdownMenuItem><Dropdown.DropdownMenuItem disabled>Disabled</Dropdown.DropdownMenuItem>
        <Dropdown.DropdownMenuSeparator /><Dropdown.DropdownMenuCheckboxItem checked>Checked</Dropdown.DropdownMenuCheckboxItem>
      </Dropdown.DropdownMenuContent></Dropdown.DropdownMenu> :
    kind === "context-menu" ? <Context.ContextMenu><Context.ContextMenuTrigger data-action="context">Right click synthetic area</Context.ContextMenuTrigger>
      <Context.ContextMenuContent><Context.ContextMenuItem>Enabled</Context.ContextMenuItem>
        <Context.ContextMenuItem disabled>Disabled</Context.ContextMenuItem></Context.ContextMenuContent></Context.ContextMenu> :
    kind === "toast" ? <Toast.ToastProvider><Toast.Toast defaultOpen duration={Infinity} variant="destructive">
      <Toast.ToastTitle>Synthetic error</Toast.ToastTitle><Toast.ToastDescription>No real action</Toast.ToastDescription>
      <Toast.ToastAction altText="Retry synthetic action">Retry</Toast.ToastAction><Toast.ToastClose /></Toast.Toast>
      <Toast.ToastViewport /></Toast.ToastProvider> :
    kind === "toaster" ? <Toaster /> : null
  }</Box>;
}
