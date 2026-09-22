"use client";

import { FormEvent, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  LocateFixed,
  Loader2,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Utensils,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { FlyTarget } from "@/components/map/halal-map";
import { cn } from "@/lib/utils";
import { formatDistance, haversineMiles } from "@/lib/geo";
import {
  CHICAGOLAND_CENTER,
  CHICAGOLAND_ZOOM,
  REGIONS,
  restaurants,
  type Region,
} from "@/lib/restaurants";
import { STATUS_DOT, STATUS_LABEL } from "@/lib/status";

const HalalMap = dynamic(() => import("@/components/map/halal-map"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center bg-[#dce4dc] text-sm font-semibold text-[#5c746c]">
      Loading map…
    </div>
  ),
});

type Preference = "zabiha" | "halal" | "both";
type GeoStatus = "idle" | "loading" | "granted" | "denied" | "error";

function regionChipClass(active: boolean) {
  return cn(
    "rounded-full border px-4 py-2 text-sm font-bold transition-colors",
    active
      ? "border-[#071c17] bg-[#071c17] text-white"
      : "border-[#dde5e1] bg-white text-[#153f32] hover:border-[#0f7254]/40 hover:bg-[#e7f4ee]",
  );
}

export default function Home() {
  const [preference, setPreference] = useState<Preference>("both");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<Region | "all">("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [flyTarget, setFlyTarget] = useState<FlyTarget>({
    center: CHICAGOLAND_CENTER,
    zoom: CHICAGOLAND_ZOOM,
    token: 0,
  });

  function flyTo(lat: number, lng: number, zoom: number) {
    setFlyTarget((prev) => ({ center: [lat, lng], zoom, token: prev.token + 1 }));
  }

  function scrollToMap() {
    document.getElementById("map")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const filtered = useMemo(() => {
    let list = restaurants;

    if (selectedRegion !== "all") {
      list = list.filter((r) => r.region === selectedRegion);
    }

    if (preference === "zabiha") {
      list = list.filter((r) => r.halalStatus === "zabiha");
    } else if (preference === "halal") {
      list = list.filter((r) => r.halalStatus === "zabiha" || r.halalStatus === "halal");
    }

    const q = submittedQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.neighborhood.toLowerCase().includes(q) ||
          r.cuisine.toLowerCase().includes(q) ||
          r.region.toLowerCase().includes(q),
      );
    }

    const withDistance = list.map((r) => ({
      ...r,
      distance: userLocation
        ? haversineMiles(userLocation.lat, userLocation.lng, r.lat, r.lng)
        : null,
    }));

    withDistance.sort((a, b) => {
      if (a.distance != null && b.distance != null) return a.distance - b.distance;
      return b.rating - a.rating;
    });

    return withDistance;
  }, [selectedRegion, preference, submittedQuery, userLocation]);

  const activeRestaurant = filtered.find((r) => r.id === activeId) ?? filtered[0] ?? null;

  function selectRestaurant(id: string) {
    setActiveId(id);
    const restaurant = restaurants.find((r) => r.id === id);
    if (restaurant) flyTo(restaurant.lat, restaurant.lng, 14);
  }

  function selectRegion(region: Region | "all") {
    setSelectedRegion(region);
    setActiveId(null);
    if (region === "all") {
      flyTo(CHICAGOLAND_CENTER[0], CHICAGOLAND_CENTER[1], CHICAGOLAND_ZOOM);
    } else {
      const match = REGIONS.find((r) => r.id === region);
      if (match) flyTo(match.center[0], match.center[1], match.zoom);
    }
    scrollToMap();
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(query);
    setActiveId(null);
    scrollToMap();
  }

  function useMyLocation() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeoStatus("error");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(loc);
        setGeoStatus("granted");
        setSelectedRegion("all");
        setActiveId(null);
        flyTo(loc.lat, loc.lng, 12);
      },
      (error) => {
        setGeoStatus(error.code === error.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const locationLabel = userLocation
    ? "Your current location"
    : submittedQuery || (selectedRegion !== "all" ? REGIONS.find((r) => r.id === selectedRegion)?.label : "Chicagoland");

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <nav className="relative z-40 border-b border-white/10 bg-[#071c17]/95 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a href="#top" className="group flex items-center gap-3" aria-label="Halaly home">
            <span className="grid size-10 place-items-center rounded-[14px] bg-[#c9f15a] text-[#071c17] shadow-[0_0_0_1px_rgba(255,255,255,.14)] transition-transform group-hover:-rotate-3">
              <MapPin className="size-5" strokeWidth={2.5} />
            </span>
            <span className="text-[1.35rem] font-black tracking-[-0.045em]">Halaly</span>
          </a>

          <div className="hidden items-center gap-8 text-sm font-semibold text-white/72 md:flex">
            <a className="transition-colors hover:text-white" href="#map">Discover</a>
            <a className="transition-colors hover:text-white" href="#verification">How we verify</a>
            <a className="transition-colors hover:text-white" href="#coverage">Areas</a>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild className="hidden h-10 rounded-full bg-white px-5 font-bold text-[#071c17] hover:bg-[#c9f15a] sm:inline-flex">
              <a href="#map">Find halal food</a>
            </Button>
            <Button aria-label="Open navigation" className="size-10 rounded-full bg-white/10 text-white hover:bg-white/15 md:hidden" size="icon">
              <Menu />
            </Button>
          </div>
        </div>
      </nav>

      <section id="top" className="relative bg-[#071c17] text-white">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:52px_52px]" />
        <div className="pointer-events-none absolute -left-40 top-8 size-[500px] rounded-full bg-[#1da774]/20 blur-[120px]" />
        <div className="pointer-events-none absolute right-[-10%] top-[-20%] size-[560px] rounded-full bg-[#c9f15a]/10 blur-[100px]" />

        <div className="relative mx-auto grid max-w-[1440px] gap-12 px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:grid-cols-[minmax(0,.88fr)_minmax(560px,1.12fr)] lg:gap-10 lg:px-12 lg:pb-28 lg:pt-24">
          <div className="flex flex-col justify-center">
            <Badge className="mb-7 w-fit border border-[#c9f15a]/20 bg-[#c9f15a]/10 px-3 py-1.5 text-[.7rem] font-extrabold uppercase tracking-[.15em] text-[#dfff89]">
              <ShieldCheck className="size-3.5" />
              Built for halal confidence
            </Badge>

            <h1 className="max-w-[720px] text-balance text-[clamp(3.4rem,7vw,6.8rem)] font-black leading-[.88] tracking-[-.075em]">
              Good food.
              <span className="mt-2 block text-[#c9f15a]">Clear answers.</span>
            </h1>
            <p className="mt-7 max-w-[610px] text-balance text-lg leading-8 text-white/65 sm:text-xl">
              Find halal restaurants across Chicagoland with the details that matter—certification, Zabiha options, and whether the whole menu is halal.
            </p>

            <form id="discover" onSubmit={submitSearch} className="mt-9 max-w-[700px] rounded-[28px] border border-white/12 bg-white p-2.5 text-[#071c17] shadow-[0_30px_90px_rgba(0,0,0,.28)]">
              <div className="flex items-center gap-2 px-3">
                <Search className="size-5 shrink-0 text-[#527068]" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-14 flex-1 border-0 bg-transparent px-1 text-base font-semibold shadow-none placeholder:text-[#789089] focus-visible:ring-0"
                  placeholder="Neighborhood, suburb, or restaurant"
                  aria-label="Search a Chicago neighborhood, suburb, or restaurant"
                />
                <Button
                  type="button"
                  aria-label="Use my location"
                  variant="ghost"
                  size="icon"
                  onClick={useMyLocation}
                  className="hidden size-11 rounded-full text-[#1c6b54] hover:bg-[#e7f5ef] sm:inline-flex"
                >
                  {geoStatus === "loading" ? <Loader2 className="size-5 animate-spin" /> : <LocateFixed className="size-5" />}
                </Button>
                <Button className="h-12 rounded-[18px] bg-[#0f7254] px-5 font-extrabold text-white hover:bg-[#095c43] sm:px-7">
                  Search <ArrowRight className="size-4" />
                </Button>
              </div>

              <div className="flex flex-col gap-3 border-t border-[#dce6e2] px-3 pb-1 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-bold text-[#496159]">Show me</span>
                <ToggleGroup
                  type="single"
                  value={preference}
                  onValueChange={(value) => value && setPreference(value as Preference)}
                  variant="outline"
                  className="w-full overflow-hidden rounded-full border border-[#dce6e2] bg-[#f3f7f5] p-1 sm:w-auto"
                  aria-label="Halal preference"
                >
                  <ToggleGroupItem className="flex-1 rounded-full border-0 px-4 text-sm font-bold data-[state=on]:bg-[#071c17] data-[state=on]:text-white sm:flex-none" value="zabiha">Zabiha</ToggleGroupItem>
                  <ToggleGroupItem className="flex-1 rounded-full border-0 px-4 text-sm font-bold data-[state=on]:bg-[#071c17] data-[state=on]:text-white sm:flex-none" value="halal">Halal</ToggleGroupItem>
                  <ToggleGroupItem className="flex-1 rounded-full border-0 px-4 text-sm font-bold data-[state=on]:bg-[#071c17] data-[state=on]:text-white sm:flex-none" value="both">Both</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold text-white/55">
              <span className="flex items-center gap-2"><Check className="size-4 text-[#c9f15a]" /> Chicago & suburbs</span>
              <span className="flex items-center gap-2"><Check className="size-4 text-[#c9f15a]" /> Verification details</span>
              <span className="flex items-center gap-2"><Check className="size-4 text-[#c9f15a]" /> Menu-level clarity</span>
            </div>
          </div>

          <div className="relative min-h-[570px] lg:min-h-[660px]">
            <div className="absolute inset-0 overflow-hidden rounded-[34px] border border-white/10 bg-[#dce4dc] shadow-[0_45px_120px_rgba(0,0,0,.36)]">
              <div className="absolute inset-0 isolate">
                <HalalMap
                  restaurants={filtered}
                  activeId={activeRestaurant?.id ?? null}
                  onSelect={selectRestaurant}
                  userLocation={userLocation}
                  initialCenter={CHICAGOLAND_CENTER}
                  initialZoom={CHICAGOLAND_ZOOM}
                  flyTarget={flyTarget}
                  scrollWheelZoom={false}
                />
              </div>

              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-5">
                <Badge className="pointer-events-auto border border-white/70 bg-white/90 px-3 py-1.5 font-extrabold text-[#153f32] shadow-sm backdrop-blur">
                  <Sparkles className="size-3.5 text-[#0f7254]" /> Live map · {filtered.length} spots
                </Badge>
                <button
                  type="button"
                  onClick={useMyLocation}
                  className="pointer-events-auto grid size-10 place-items-center rounded-full bg-white text-[#153f32] shadow-md transition hover:bg-[#e7f4ee]"
                  aria-label="Center on my location"
                >
                  {geoStatus === "loading" ? <Loader2 className="size-4.5 animate-spin" /> : <LocateFixed className="size-4.5" />}
                </button>
              </div>

              {activeRestaurant && (
                <div className="absolute bottom-5 left-5 right-5 overflow-hidden rounded-[26px] border border-white/60 bg-white/95 p-3.5 text-[#071c17] shadow-[0_20px_55px_rgba(7,28,23,.2)] backdrop-blur-xl sm:left-auto sm:w-[390px]">
                  <div className="flex gap-4">
                    <div
                      className="h-[114px] w-[112px] shrink-0 rounded-[18px] bg-cover bg-center"
                      role="img"
                      aria-label={activeRestaurant.name}
                      style={{ backgroundImage: `url('${activeRestaurant.image}')` }}
                    />
                    <div className="min-w-0 flex-1 py-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[.14em] text-[#678078]">
                          {activeRestaurant.distance != null ? `${formatDistance(activeRestaurant.distance)} away` : activeRestaurant.priceLevel}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-extrabold">
                          <Star className="size-3.5 fill-[#f5b942] text-[#f5b942]" /> {activeRestaurant.rating.toFixed(1)}
                          <span className="font-semibold text-[#8a9a93]">({activeRestaurant.reviewCount.toLocaleString()})</span>
                        </span>
                      </div>
                      <h2 className="mt-1 truncate text-lg font-black tracking-[-.03em]">{activeRestaurant.name}</h2>
                      <p className="mt-1 text-xs font-semibold text-[#60776f]">{activeRestaurant.cuisine} · {activeRestaurant.neighborhood}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-extrabold text-[#0f7254]">
                          <BadgeCheck className="size-4" /> {STATUS_LABEL[activeRestaurant.halalStatus]}
                        </span>
                        {activeRestaurant.googleMapsUri && (
                          <a
                            href={activeRestaurant.googleMapsUri}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 text-[10px] font-extrabold text-[#527068] underline underline-offset-2 hover:text-[#0f7254]"
                          >
                            Google reviews ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute -bottom-7 -left-4 rounded-[22px] border border-white/10 bg-[#11372c] px-5 py-4 shadow-2xl sm:-left-7">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#c9f15a]">
                {geoStatus === "denied" ? "Location blocked" : geoStatus === "granted" ? "Near you" : "Searching now"}
              </p>
              <p className="mt-1 max-w-[210px] truncate text-sm font-bold text-white">{locationLabel}</p>
              <p className="mt-1 text-xs font-semibold capitalize text-white/50">Preference: {preference} · {filtered.length} results</p>
            </div>
          </div>
        </div>
      </section>

      <section id="map" className="bg-[#eef4f1] py-20 sm:py-28">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="mb-10 flex flex-col gap-6 lg:mb-14 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-[#0f7254]">Live directory</p>
              <h2 className="mt-4 max-w-[560px] text-balance text-[clamp(2.4rem,4.5vw,3.6rem)] font-black leading-[.98] tracking-[-.05em] text-[#071c17]">
                Every certified spot, mapped.
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => selectRegion("all")} className={regionChipClass(selectedRegion === "all")}>
                All of Chicagoland
              </button>
              {REGIONS.map((region) => (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => selectRegion(region.id)}
                  className={regionChipClass(selectedRegion === region.id)}
                >
                  {region.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
            <div className="order-2 flex flex-col gap-3 lg:order-1">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#dde5e1] bg-white px-4 py-3">
                <span className="text-sm font-bold text-[#153f32]">
                  {filtered.length} {filtered.length === 1 ? "restaurant" : "restaurants"}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={useMyLocation}
                  className="h-8 rounded-full text-xs font-bold"
                >
                  {geoStatus === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <LocateFixed className="size-3.5" />}
                  {userLocation ? "Update location" : "Near me"}
                </Button>
              </div>

              {(geoStatus === "denied" || geoStatus === "error") && (
                <p className="rounded-xl bg-[#fdece7] px-4 py-3 text-xs font-semibold text-[#9a3412]">
                  {geoStatus === "denied"
                    ? "Location access was blocked. Enable it in your browser settings to see restaurants sorted by distance."
                    : "Couldn't get your location. You can still browse by neighborhood or suburb below."}
                </p>
              )}

              <div className="flex max-h-[640px] flex-col gap-3 overflow-y-auto scrollbar-thin pr-1">
                {filtered.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[#c7d3cd] bg-white/60 px-5 py-10 text-center text-sm font-semibold text-[#66766f]">
                    No matches yet — try widening your preference or clearing the search.
                  </div>
                )}
                {filtered.map((restaurant) => (
                  <button
                    key={restaurant.id}
                    type="button"
                    onClick={() => selectRestaurant(restaurant.id)}
                    className={cn(
                      "flex gap-3 rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(7,28,23,.1)]",
                      activeRestaurant?.id === restaurant.id
                        ? "border-[#0f7254] bg-[#e7f4ee]"
                        : "border-[#dde5e1] bg-white",
                    )}
                  >
                    <div
                      className="h-[72px] w-[72px] shrink-0 rounded-[14px] bg-cover bg-center"
                      style={{ backgroundImage: `url('${restaurant.image}')` }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-sm font-black text-[#071c17]">{restaurant.name}</h3>
                        <span className="flex shrink-0 items-center gap-1 text-xs font-extrabold text-[#071c17]">
                          <Star className="size-3 fill-[#f5b942] text-[#f5b942]" />
                          {restaurant.rating.toFixed(1)}
                          <span className="font-semibold text-[#9aa8a2]">({restaurant.reviewCount.toLocaleString()})</span>
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs font-semibold text-[#66766f]">
                        {restaurant.cuisine} · {restaurant.neighborhood}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white",
                            STATUS_DOT[restaurant.halalStatus],
                          )}
                        >
                          {STATUS_LABEL[restaurant.halalStatus]}
                        </span>
                        {restaurant.distance != null && (
                          <span className="shrink-0 text-[10px] font-bold text-[#0f7254]">
                            {formatDistance(restaurant.distance)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="order-1 h-[420px] isolate overflow-hidden rounded-[32px] border border-[#dde5e1] shadow-[0_30px_80px_rgba(7,28,23,.12)] lg:order-2 lg:h-[720px]">
              <HalalMap
                restaurants={filtered}
                activeId={activeRestaurant?.id ?? null}
                onSelect={selectRestaurant}
                userLocation={userLocation}
                initialCenter={CHICAGOLAND_CENTER}
                initialZoom={CHICAGOLAND_ZOOM}
                flyTarget={flyTarget}
              />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-5 rounded-2xl border border-[#dde5e1] bg-white px-5 py-4 text-xs font-bold text-[#50665f]">
            <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#0f7254]" /> Zabiha verified</span>
            <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#1da774]" /> Fully halal</span>
            <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#c98a1f]" /> Select items halal</span>
            <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#0b5cff]" /> Your location</span>
          </div>
        </div>
      </section>

      <section id="verification" className="bg-[#f4f1e8] py-20 sm:py-28">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-[#0f7254]">Know before you go</p>
              <h2 className="mt-4 max-w-[520px] text-balance text-[clamp(2.6rem,5vw,4.7rem)] font-black leading-[.96] tracking-[-.06em] text-[#071c17]">More than a halal pin.</h2>
              <p className="mt-6 max-w-[540px] text-lg leading-8 text-[#50665f]">Halaly is designed to show the evidence behind a listing, so you can decide with confidence—not guess from a menu label.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: BadgeCheck, number: "01", title: "Certification shown", copy: "See the certifier, verification method, and when the status was last checked." },
                { icon: Utensils, number: "02", title: "Menu status clarified", copy: "Know whether the full menu is halal or only specific dishes are available." },
                { icon: ShieldCheck, number: "03", title: "Your standard, first", copy: "Choose Zabiha, halal, or both and keep that preference visible in your results." },
                { icon: MapPin, number: "04", title: "Built around Chicagoland", copy: "Explore the city and surrounding suburbs in one focused regional map." },
              ].map((item) => (
                <article key={item.number} className="group rounded-[28px] border border-[#d8d8ca] bg-white/75 p-6 transition-all hover:-translate-y-1 hover:border-[#0f7254]/35 hover:bg-white hover:shadow-[0_22px_60px_rgba(7,28,23,.08)] sm:p-7">
                  <div className="flex items-center justify-between">
                    <span className="grid size-12 place-items-center rounded-[16px] bg-[#e4f0e9] text-[#0f7254]"><item.icon className="size-5" /></span>
                    <span className="text-sm font-black text-[#b6b8aa]">{item.number}</span>
                  </div>
                  <h3 className="mt-8 text-xl font-black tracking-[-.035em] text-[#071c17]">{item.title}</h3>
                  <p className="mt-3 leading-7 text-[#66766f]">{item.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="coverage" className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
          <div className="rounded-[34px] bg-[#0f7254] px-6 py-10 text-white sm:px-10 sm:py-14 lg:flex lg:items-center lg:justify-between lg:px-14">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[.2em] text-[#dfff89]">Launching across Chicagoland</p>
              <h2 className="mt-4 text-balance text-4xl font-black leading-tight tracking-[-.05em] sm:text-5xl">From Devon Avenue to the southwest suburbs.</h2>
            </div>
            <Button asChild className="mt-7 h-12 rounded-full bg-[#c9f15a] px-6 font-black text-[#071c17] hover:bg-white lg:mt-0">
              <a href="#map">Search your area <ChevronRight className="size-4" /></a>
            </Button>
          </div>

          <div className="mt-8 grid gap-px overflow-hidden rounded-[28px] border border-[#dde5e1] bg-[#dde5e1] sm:grid-cols-2 lg:grid-cols-3">
            {REGIONS.map((region) => (
              <button
                key={region.id}
                type="button"
                onClick={() => selectRegion(region.id)}
                className="group flex items-center justify-between bg-[#f7faf8] px-6 py-6 text-left font-extrabold text-[#153d31] transition-colors hover:bg-[#e7f4ee]"
              >
                <span className="flex items-center gap-3"><MapPin className="size-4 text-[#0f7254]" /> {region.label}</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#071c17] text-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-[12px] bg-[#c9f15a] text-[#071c17]"><MapPin className="size-4" strokeWidth={2.5} /></span>
            <span className="text-xl font-black tracking-[-.04em]">Halaly</span>
          </div>
          <p className="max-w-xl text-sm leading-6 text-white/52">A clearer way to discover halal food across Chicago and its suburbs. Halal status is our own editorial curation from public halal directories; photos, ratings, and addresses are verified against Google&apos;s live listings.</p>
          <p className="text-sm font-bold text-white/45">Chicago, Illinois</p>
        </div>
      </footer>
    </main>
  );
}
