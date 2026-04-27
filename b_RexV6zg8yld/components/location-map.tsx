"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import type { User, LocationStatus } from "@/lib/types";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { MapPin, MapPinOff, Users, Loader2 } from "lucide-react";



interface LocationMapProps {
  userName: string;
  onLeave: () => void;
}

const MARKER_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

function getMarkerColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MARKER_COLORS[Math.abs(hash) % MARKER_COLORS.length];
}

export function LocationMap({ userName, onLeave }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const markerLibRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const socketRef = useRef(getSocket());

  const [users, setUsers] = useState<User[]>([]);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [isSharing, setIsSharing] = useState(true);
  const [mySocketId, setMySocketId] = useState<string | null>(null);

      useEffect(() => {
  console.log("API KEY:", process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
}, []);

  // ✅ Initialize map (FIXED)
  const initMap = useCallback(async () => {
    if (!mapRef.current) return;

    setOptions({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: "weekly",
    });

    


    const { Map } = await importLibrary("maps");
    const { AdvancedMarkerElement } = await importLibrary("marker");

    markerLibRef.current = { AdvancedMarkerElement };

    googleMapRef.current = new Map(mapRef.current, {
      center: { lat: 0, lng: 0 },
      zoom: 2,
      mapId: "location-share-map",
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });
  }, []);

  // ✅ Update markers (FIXED)
  const updateMarkers = useCallback(
    (usersList: User[]) => {
      if (!googleMapRef.current || !markerLibRef.current) return;

      const { AdvancedMarkerElement } = markerLibRef.current;

      // Remove old markers
      const currentUserIds = new Set(usersList.map((u) => u.id));
      markersRef.current.forEach((marker, id) => {
        if (!currentUserIds.has(id)) {
          marker.map = null;
          markersRef.current.delete(id);
        }
      });

      // Add/update markers
      usersList.forEach((user) => {
        if (user.lat === 0 && user.lng === 0) return;

        const existingMarker = markersRef.current.get(user.id);
        const position = { lat: user.lat, lng: user.lng };

        if (existingMarker) {
          existingMarker.position = position;
        } else {
          const color = getMarkerColor(user.id);
          const isMe = user.id === mySocketId;

          const markerContent = document.createElement("div");
          markerContent.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-50%)">
              <div style="
                background:${isMe ? "#000" : "#fff"};
                color:${isMe ? "#fff" : "#000"};
                padding:4px 8px;
                border-radius:4px;
                font-size:12px;
                font-weight:600;
                white-space:nowrap;
                box-shadow:0 2px 6px rgba(0,0,0,0.2);
                margin-bottom:4px;">
                ${user.name}${isMe ? " (You)" : ""}
              </div>
              <svg width="24" height="32" viewBox="0 0 24 32">
                <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z" fill="${color}"/>
                <circle cx="12" cy="12" r="5" fill="white"/>
              </svg>
            </div>
          `;

          const marker = new AdvancedMarkerElement({
            map: googleMapRef.current,
            position,
            content: markerContent,
          });

          markersRef.current.set(user.id, marker);
        }
      });
    },
    [mySocketId]
  );

  // Location tracking
  const startWatchingLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }

    setStatus("requesting");

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setStatus("sharing");

        const { latitude, longitude } = position.coords;

        socketRef.current.emit("send-location", {
          lat: latitude,
          lng: longitude,
        });

        if (googleMapRef.current) {
          const center = googleMapRef.current.getCenter();
          if (center?.lat() === 0 && center?.lng() === 0) {
            googleMapRef.current.setCenter({ lat: latitude, lng: longitude });
            googleMapRef.current.setZoom(15);
          }
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setStatus("denied");
        } else {
          setStatus("error");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );
  }, []);

  const stopWatchingLocation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const toggleSharing = useCallback(() => {
    if (isSharing) {
      stopWatchingLocation();
      setStatus("idle");
    } else {
      startWatchingLocation();
    }
    setIsSharing(!isSharing);
  }, [isSharing, startWatchingLocation, stopWatchingLocation]);

  const handleLeave = useCallback(() => {
    stopWatchingLocation();
    disconnectSocket();
    onLeave();
  }, [stopWatchingLocation, onLeave]);

  // Init
  useEffect(() => {
    const socket = socketRef.current;

    socket.connect();
    socket.emit("join", { name: userName });

    socket.on("connect", () => {
      setMySocketId(socket.id || null);
    });

    socket.on("users-update", (usersList: User[]) => {
      setUsers(usersList);
    });

    initMap().then(startWatchingLocation);

    return () => {
      stopWatchingLocation();
      socket.off("connect");
      socket.off("users-update");
    };
  }, [userName, initMap, startWatchingLocation, stopWatchingLocation]);

  useEffect(() => {
    updateMarkers(users);
  }, [users, updateMarkers]);

  return (
    <div className="relative w-full h-screen">
      <div ref={mapRef} className="w-full h-full" />

      <div className="absolute top-4 left-4 right-4 flex justify-between">
        <div className="bg-white px-4 py-2 rounded shadow flex items-center gap-2">
          <Users className="w-4 h-4" />
          {users.length} users
        </div>

        <div className="bg-white px-4 py-2 rounded shadow flex items-center gap-2">
          {status === "sharing" && <span>Sharing</span>}
          {status === "denied" && <span>Denied</span>}
          {status === "error" && <span>Error</span>}
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
        <Button onClick={toggleSharing}>
          {isSharing ? <MapPinOff /> : <MapPin />}
        </Button>

        <Button variant="outline" onClick={handleLeave}>
          Leave
        </Button>
      </div>
    </div>
  );
}