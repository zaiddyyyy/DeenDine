"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { HalalStatus, Restaurant } from "@/lib/restaurants";

const STATUS_COLOR: Record<HalalStatus, string> = {
  zabiha: "#0f7254",
  halal: "#1da774",
  "select-items": "#c98a1f",
};

const PIN_PATH =
  "M3 2v7c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V2 M7 2v20 M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7";

function buildRestaurantIcon(status: HalalStatus, active: boolean) {
  const size = active ? 42 : 32;
  const color = active ? "#071c17" : STATUS_COLOR[status];
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 8px 20px rgba(7,28,23,.35);display:flex;align-items:center;justify-content:center;">
      <svg width="${Math.round(size * 0.42)}" height="${Math.round(size * 0.42)}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="${PIN_PATH}"/></svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 2],
  });
}

function buildUserIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:24px;height:24px;">
      <div class="halaly-user-pulse" style="position:absolute;inset:-11px;border-radius:9999px;background:rgba(11,92,255,.28);"></div>
      <div style="position:relative;width:24px;height:24px;border-radius:9999px;background:#0b5cff;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,.35);"></div>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export interface FlyTarget {
  center: [number, number];
  zoom: number;
  token: number;
}

interface HalalMapProps {
  restaurants: Restaurant[];
  activeId: string | null;
  onSelect: (id: string) => void;
  userLocation: { lat: number; lng: number } | null;
  initialCenter: [number, number];
  initialZoom: number;
  flyTarget: FlyTarget;
  scrollWheelZoom?: boolean;
}

export default function HalalMap({
  restaurants,
  activeId,
  onSelect,
  userLocation,
  initialCenter,
  initialZoom,
  flyTarget,
  scrollWheelZoom = true,
}: HalalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const lastFlyToken = useRef(flyTarget.token);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      scrollWheelZoom,
    }).setView(initialCenter, initialZoom);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      },
    ).addTo(map);

    mapRef.current = map;
    const markers = markersRef.current;

    return () => {
      map.remove();
      mapRef.current = null;
      markers.clear();
      userMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    restaurants.forEach((restaurant) => {
      const marker = L.marker([restaurant.lat, restaurant.lng], {
        icon: buildRestaurantIcon(restaurant.halalStatus, restaurant.id === activeId),
      });
      marker.on("click", () => onSelectRef.current(restaurant.id));
      marker.bindTooltip(restaurant.name, {
        direction: "top",
        offset: [0, -18],
        className: "halaly-tooltip",
      });
      marker.addTo(map);
      markersRef.current.set(restaurant.id, marker);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurants]);

  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const restaurant = restaurants.find((item) => item.id === id);
      if (!restaurant) return;
      marker.setIcon(buildRestaurantIcon(restaurant.halalStatus, id === activeId));
      marker.setZIndexOffset(id === activeId ? 500 : 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    if (userLocation) {
      const marker = L.marker([userLocation.lat, userLocation.lng], {
        icon: buildUserIcon(),
        zIndexOffset: 1000,
      });
      marker.bindTooltip("You are here", {
        direction: "top",
        offset: [0, -16],
        className: "halaly-tooltip",
      });
      marker.addTo(map);
      userMarkerRef.current = marker;
    }
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (flyTarget.token === lastFlyToken.current) return;
    lastFlyToken.current = flyTarget.token;
    map.flyTo(flyTarget.center, flyTarget.zoom, { duration: 1 });
  }, [flyTarget]);

  return <div ref={containerRef} className="size-full" />;
}
