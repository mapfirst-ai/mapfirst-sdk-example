"use client";

declare global {
  interface Window {
    _slideTimer?: ReturnType<typeof setTimeout>;
  }
}

import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import {
  useMapFirstCore,
  useMapboxAttachment,
  useSmartFilterSearch,
} from "@mapfirst.ai/react";
import "mapbox-gl/dist/mapbox-gl.css";
import { Swiper, SwiperSlide, SwiperClass } from "swiper/react";
import { FreeMode, Mousewheel } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import { InitialData } from "./page";

// Set your Mapbox token here
mapboxgl.accessToken =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "YOUR_MAPBOX_TOKEN";

export default function Home({ locationData }: { locationData: InitialData }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [swiper, setSwiper] = useState<SwiperClass | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const skipNextChange = useRef(false);

  const { mapFirst, state } = useMapFirstCore({
    initialLocationData: locationData,
  });

  const {
    search,
    isLoading: isSearchLoading,
    error: searchError,
  } = useSmartFilterSearch(mapFirst);

  const selectedMarker = state?.selectedPropertyId ?? null;
  const setSelectedMarker = (id: number | null) => {
    if (mapFirst) {
      mapFirst.setSelectedMarker(id);
    }
  };

  // Get properties and other state
  const properties = state?.properties || [];
  const isSearching = state?.isSearching || false;

  // Sync activeIndex with selectedPropertyId
  useEffect(() => {
    if (
      properties &&
      activeIndex !== null &&
      activeIndex < properties.length &&
      swiper
    ) {
      const shouldSlide = swiper.activeIndex !== activeIndex;
      skipNextChange.current = shouldSlide;

      if (shouldSlide) {
        swiper.slideTo(activeIndex);
      }
    } else {
      skipNextChange.current = false;
    }
  }, [activeIndex, properties, swiper]);

  // Update activeIndex when selectedPropertyId changes
  useEffect(() => {
    if (swiper && properties && selectedMarker !== null) {
      const propertyIndex = properties.findIndex(
        (p) => p.tripadvisor_id === selectedMarker
      );
      if (propertyIndex !== -1) {
        setActiveIndex(propertyIndex);
      }
    }
  }, [swiper, properties, selectedMarker]);

  // Handle slide change
  const handleSlideChange = useCallback(
    (swiper: SwiperClass) => {
      if (skipNextChange.current) {
        skipNextChange.current = false;
        return;
      }
      clearTimeout(window._slideTimer);
      window._slideTimer = setTimeout(() => {
        if (properties && properties[swiper.activeIndex]) {
          setSelectedMarker(properties[swiper.activeIndex].tripadvisor_id);
        }
      }, 500);
    },
    [properties, setSelectedMarker]
  );

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
  }, []);

  // Attach map to MapFirst SDK
  useMapboxAttachment({
    mapFirst,
    map,
    mapboxgl: mapboxgl as any,
    onMarkerClick: (marker) => {
      console.log("Marker clicked:", marker);
    },
  });

  // Handle card click
  const handleCardClick = (propertyId: number) => {
    setSelectedMarker(propertyId);
    const property = properties.find((p) => p.tripadvisor_id === propertyId);
    if (property?.location && mapFirst) {
      mapFirst.flyMapTo(property.location.lon, property.location.lat, 14);
    }
  };

  // Handle search
  const handleSearch = async (query: string) => {
    if (!query.trim()) return;

    try {
      await search({ query: query.trim() });
      setShowSuggestions(false);
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  // Example search suggestions
  const searchSuggestions = [
    "Hotels near beach with pool",
    "4-star hotels with spa",
    "Budget hotels under $150",
    "Luxury hotels with breakfast",
    "Hotels with free parking",
    "Pet-friendly hotels",
  ];

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Search Bar */}
      <div
        ref={searchContainerRef}
        className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4"
      >
        <form onSubmit={handleSearchSubmit} className="relative">
          {/* Search Input Container */}
          <div className="relative bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center">
              {/* Search Icon */}
              <div className="pl-4 pr-2">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* Input Field */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search hotels... (e.g., 'hotels near beach with pool')"
                className="flex-1 py-3 pr-3 text-sm focus:outline-none text-black"
                disabled={isSearchLoading}
              />

              {/* Clear Button */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="px-2 text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}

              {/* Search Button */}
              <button
                type="submit"
                disabled={isSearchLoading || !searchQuery.trim()}
                className={`px-6 py-3 text-sm font-medium text-white transition-colors ${
                  isSearchLoading || !searchQuery.trim()
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isSearchLoading ? (
                  <div className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Searching...</span>
                  </div>
                ) : (
                  "Search"
                )}
              </button>
            </div>

            {/* Search Suggestions Dropdown */}
            {showSuggestions && !searchQuery && (
              <div className="fixed top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                <div className="p-2">
                  <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Try searching for:
                  </p>
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setSearchQuery(suggestion);
                        handleSearch(suggestion);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        <span>{suggestion}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Search Error */}
        {searchError && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">
              <span className="font-semibold">Error:</span>{" "}
              {searchError.message}
            </p>
          </div>
        )}
      </div>

      {/* Loading Indicator */}
      {isSearching && (
        <div className="absolute top-20 right-4 bg-white px-4 py-2 rounded-lg shadow-lg">
          <p className="text-sm">Searching properties...</p>
        </div>
      )}

      {/* Horizontal Scrollable Cards at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/50 to-transparent pb-4 pt-8 z-30">
        <Swiper
          style={{ padding: 4 }}
          slidesPerView={"auto"}
          spaceBetween={12}
          modules={[FreeMode, Mousewheel]}
          freeMode={{ enabled: true, sticky: true, momentum: true }}
          mousewheel={{
            forceToAxis: true,
            sensitivity: 1,
            releaseOnEdges: true,
          }}
          onSlideChange={handleSlideChange}
          onSwiper={setSwiper}
        >
          {properties.map((property) => {
            const isSelected = selectedMarker === property.tripadvisor_id;
            const pricing = property.pricing;
            const price = pricing?.offer?.displayPrice;
            const isPending = pricing?.offer?.availability === "pending";

            return (
              <SwiperSlide
                key={property.tripadvisor_id}
                style={{ width: "200px", height: "110px" }}
                onClick={() => handleCardClick(property.tripadvisor_id)}
              >
                <div
                  className={`
                    w-full h-full rounded-lg overflow-hidden cursor-pointer
                    transition-all duration-200 shrink-0
                    ${
                      isSelected
                        ? "bg-neutral-200 ring-2 ring-blue-500 shadow-xl scale-105"
                        : "bg-white shadow-md hover:shadow-lg"
                    }
                  `}
                >
                  <div className="w-full h-full bg-transparent p-3 flex flex-col justify-between">
                    {/* Property Name */}
                    <div className="flex-1 min-h-0">
                      <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                        {property.name}
                      </h3>
                    </div>

                    {/* Bottom Info */}
                    <div className="flex items-end justify-between mt-2">
                      {/* Type Badge */}
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {property.type}
                      </span>

                      {/* Price */}
                      <div className="text-right">
                        {isPending ? (
                          <span className="text-xs text-gray-400">
                            Loading...
                          </span>
                        ) : price ? (
                          <span className="text-sm font-bold text-blue-600">
                            {price}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            );
          })}

          {properties.length === 0 && !isSearching && (
            <SwiperSlide style={{ width: "100%" }}>
              <div className="w-full h-[110px] flex items-center justify-center text-white">
                <p className="text-sm">No properties found</p>
              </div>
            </SwiperSlide>
          )}
        </Swiper>
      </div>
    </div>
  );
}
