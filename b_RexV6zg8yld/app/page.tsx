"use client";

import { useState } from "react";
import { NameEntry } from "@/components/name-entry";
import { LocationMap } from "@/components/location-map";

export default function Home() {
  const [userName, setUserName] = useState<string | null>(null);

  const handleJoin = (name: string) => {
    setUserName(name);
  };

  const handleLeave = () => {
    setUserName(null);
  };

  if (!userName) {
    return <NameEntry onJoin={handleJoin} />;
  }

  return <LocationMap userName={userName} onLeave={handleLeave} />;
}
