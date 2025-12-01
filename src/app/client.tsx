"use client";

declare global {
  interface Window {
    _slideTimer?: ReturnType<typeof setTimeout>;
  }
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import {
  useMapFirstCore,
  useMapboxAttachment,
  useSmartFilterSearch,
  useMapFirstBoundsSearch,
  SmartFilter,
  Filter,
  processApiFilters,
  convertToApiFilters,
} from "@mapfirst.ai/react";
import type { MapboxNamespace } from "@mapfirst.ai/core";
import "mapbox-gl/dist/mapbox-gl.css";
import { InitialData } from "./page";
import PropertyCarousel from "../components/PropertyCarousel";

// Set your Mapbox token here
mapboxgl.accessToken =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "YOUR_MAPBOX_TOKEN";

export default function Home({ locationData }: { locationData: InitialData }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Filter[]>([]);

  const { mapFirst, state } = useMapFirstCore({
    initialLocationData: locationData,
  });

  const { search } = useSmartFilterSearch(mapFirst);

  const { performBoundsSearch, isSearching: isBoundsSearching } =
    useMapFirstBoundsSearch(mapFirst);

  const selectedMarker = state?.selectedPropertyId ?? null;
  const setSelectedMarker = useCallback(
    (id: number | null) => {
      if (mapFirst) {
        mapFirst.setSelectedMarker(id);
      }
    },
    [mapFirst]
  );

  // Get properties and other state
  const properties = useMemo(
    () => state?.properties ?? [],
    [state?.properties]
  );
  const isSearching = state?.isSearching || false;
  const pendingBounds = state?.pendingBounds || null;

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const mapInstance = new mapboxgl.Map({
      container: mapContainerRef.current,
      // style: "mapbox://styles/mapbox/streets-v12",
      center:
        locationData.latitude && locationData.latitude
          ? [locationData.longitude, locationData.latitude]
          : [2.3522, 48.8566], // Paris
      zoom: 12,
    });

    mapInstance.on("load", () => {
      setMap(mapInstance);
    });

    return () => {
      mapInstance.remove();
    };
  }, [locationData.latitude, locationData.longitude]);

  // Attach map to MapFirst SDK
  const mapboxNamespace = mapboxgl as unknown as MapboxNamespace;
  useMapboxAttachment({
    mapFirst,
    map,
    mapboxgl: mapboxNamespace,
    onMarkerClick: (marker) => {
      console.log("Marker clicked:", marker);
    },
  });

  const handleFlyTo = useCallback(
    (lon: number, lat: number) => {
      if (mapFirst) {
        mapFirst.flyMapTo(lon, lat, 14);
      }
    },
    [mapFirst]
  );

  // Handle search with SmartFilter
  const handleSearch = async (query: string, currentFilters?: Filter[]) => {
    if (!query.trim()) return;

    try {
      const apiFilters = currentFilters
        ? convertToApiFilters(currentFilters)
        : undefined;

      await search({
        query: query.trim(),
        filters: apiFilters,
        onProcessFilters: (responseFilters) => {
          // Process API response and convert to Filter objects
          const newFilters =
            currentFilters || processApiFilters(responseFilters);
          if (!currentFilters) {
            setFilters(newFilters);
          }
          return {
            smartFilters: convertToApiFilters(newFilters),
            price: responseFilters.price,
            limit: responseFilters.limit ?? 30,
            language: responseFilters.language,
          };
        },
      });
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  // Handle filter changes
  const handleFilterChange = async (updatedFilters: Filter[]) => {
    setFilters(updatedFilters);

    if (isSearching) {
      return;
    }

    // If we have a previous query, re-run the search with updated filters
    if (searchQuery) {
      await handleSearch(searchQuery, updatedFilters);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* SmartFilter Component */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4">
        <SmartFilter
          mapFirst={mapFirst}
          filters={filters}
          value={searchQuery}
          isSearching={state?.isSearching}
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          onValueChange={setSearchQuery}
          currency={locationData.currency || "USD"}
          // containerStyle={{
          //   backgroundColor: "transparent",
          // }}
        />
      </div>

      {/* Search this area button */}
      {pendingBounds && !state?.isSearching && !isBoundsSearching && (
        <div
          className="absolute left-1/2 transform -translate-x-1/2 z-60"
          style={{ top: "100px" }}
        >
          <button
            onClick={performBoundsSearch}
            disabled={isBoundsSearching}
            className="px-6 py-2 bg-white text-gray-900 font-semibold text-sm rounded-full shadow-lg border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBoundsSearching ? "Searching..." : "Search this area"}
          </button>
        </div>
      )}

      <PropertyCarousel
        properties={properties}
        selectedMarker={selectedMarker}
        onSelectMarker={(id) => setSelectedMarker(id)}
        onFlyTo={handleFlyTo}
        isSearching={isSearching}
      />
    </div>
  );
}
