"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Users } from "lucide-react";

interface NameEntryProps {
  onJoin: (name: string) => void;
}

export function NameEntry({ onJoin }: NameEntryProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Location Share</h1>
          <p className="text-muted-foreground">
            Share your real-time location with others on a live map
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-foreground">
              Display Name
            </label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12"
              autoFocus
              autoComplete="off"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12"
            disabled={!name.trim()}
          >
            <Users className="w-4 h-4 mr-2" />
            Join Map
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          You&apos;ll be asked for location permission after joining
        </p>
      </div>
    </div>
  );
}
