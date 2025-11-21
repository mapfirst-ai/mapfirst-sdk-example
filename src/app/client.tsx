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
  SmartFilter,
  Filter,
} from "@mapfirst.ai/react";
import type { SmartFilter as ApiSmartFilter } from "@mapfirst.ai/core";
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
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Filter[]>([]);
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
        onProcessFilters: (responseFilters, location_id) => {
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
  const handleFilterChange = async (
    updatedFilters: Filter[],
    clearAll?: boolean
  ) => {
    setFilters(updatedFilters);

    if (isSearching) {
      return;
    }

    // If we have a previous query, re-run the search with updated filters
    if (searchQuery) {
      await handleSearch(searchQuery, updatedFilters);
    }
  };

  // Convert UI Filter to API SmartFilter
  const convertToApiFilters = (uiFilters: Filter[]): ApiSmartFilter[] => {
    return uiFilters.map((filter) => {
      const apiFilter: ApiSmartFilter = {
        id: filter.id,
        label:
          typeof filter.label === "string"
            ? filter.label
            : String(filter.label || ""),
        type: filter.type,
        value: filter.value,
      };

      if (filter.numericValue !== undefined) {
        apiFilter.numericValue = filter.numericValue;
      }

      if (
        filter.priceRange &&
        filter.priceRange.min !== undefined &&
        filter.priceRange.max !== undefined
      ) {
        apiFilter.priceRange = {
          min: filter.priceRange.min,
          max: filter.priceRange.max,
        };
      }

      if (filter.priceLevels) {
        apiFilter.priceLevels = filter.priceLevels;
      }

      return apiFilter;
    });
  };

  // Helper function to convert API filters to Filter objects
  const processApiFilters = (apiFilters: any): Filter[] => {
    const filters: Filter[] = [];

    if (apiFilters.amenities && Array.isArray(apiFilters.amenities)) {
      apiFilters.amenities.forEach((amenity: string) => {
        filters.push({
          id: `amenity-${amenity}`,
          label: amenity,
          type: "amenity",
          value: amenity,
        });
      });
    }

    if (apiFilters.hotelStyle && Array.isArray(apiFilters.hotelStyle)) {
      apiFilters.hotelStyle.forEach((style: string) => {
        filters.push({
          id: `hotelStyle-${style}`,
          label: style,
          type: "hotelStyle",
          value: style,
        });
      });
    }

    if (apiFilters.price) {
      filters.push({
        id: "priceRange",
        label: "Price Range",
        type: "priceRange",
        value: `${apiFilters.price.min}-${apiFilters.price.max}`,
        priceRange: apiFilters.price,
      });
    }

    if (
      typeof apiFilters.minRating === "number" &&
      Number.isFinite(apiFilters.minRating)
    ) {
      filters.push({
        id: "minRating",
        label: `${apiFilters.minRating}+`,
        type: "minRating",
        value: String(apiFilters.minRating),
        numericValue: apiFilters.minRating,
      });
    }

    if (
      typeof apiFilters.starRating === "number" &&
      Number.isFinite(apiFilters.starRating)
    ) {
      filters.push({
        id: "starRating",
        label: `${apiFilters.starRating} Stars`,
        type: "starRating",
        value: String(apiFilters.starRating),
        numericValue: apiFilters.starRating,
      });
    }

    if (apiFilters.transformed_query) {
      filters.push({
        id: "transformed_query",
        label: apiFilters.transformed_query,
        type: "transformed_query",
        value: apiFilters.transformed_query,
      });
    }

    if (apiFilters.selected_restaurant_price_levels) {
      filters.push({
        id: "selected_restaurant_price_levels",
        label: apiFilters.selected_restaurant_price_levels.join(", "),
        type: "selected_restaurant_price_levels",
        value: apiFilters.selected_restaurant_price_levels.join(", "),
        priceLevels: apiFilters.selected_restaurant_price_levels,
      });
    }

    return filters;
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
          containerStyle={{
            backgroundColor: "transparent",
          }}
        />
      </div>

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
