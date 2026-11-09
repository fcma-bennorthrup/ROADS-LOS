import { useState } from "react";
import { useSearch } from "wouter";
import { SideNav } from "@/components/loan/SideNav";
import { ClosingContent } from "@/components/loan/ClosingContent";
import { BookingContent } from "@/components/loan/BookingContent";

const CLOSING_BOOKING_NAV_ITEMS = ["Closing", "Booking"];
export default function LoanClosingBookingPage() {
  const search = useSearch();
  const [activeNavItem, setActiveNavItem] = useState(() => {
    const section = new URLSearchParams(search).get("section") ?? "";
    return CLOSING_BOOKING_NAV_ITEMS.includes(section) ? section : "Closing";
  });
  return <>
    <SideNav activeItem={activeNavItem} onItemChange={setActiveNavItem} items={CLOSING_BOOKING_NAV_ITEMS} />
    <div className="flex flex-1 flex-col overflow-y-auto" style={{ minWidth: 0, paddingBottom: "36px" }}>
      {activeNavItem === "Closing" ? <ClosingContent /> : <BookingContent />}
    </div>
  </>;
}
