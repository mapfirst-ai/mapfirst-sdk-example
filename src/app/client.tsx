"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import {
  useMapFirstCore,
  useMapboxAttachment,
  useSelectedMarker,
} from "@mapfirst.ai/react";
import "mapbox-gl/dist/mapbox-gl.css";
import { InitialData } from "./page";

// Set your Mapbox token here
mapboxgl.accessToken =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "YOUR_MAPBOX_TOKEN";

export default function Home({ locationData }: { locationData: InitialData }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);

  // Initialize MapFirst SDK
  const { mapFirst, state } = useMapFirstCore({
    initialLocationData: locationData,
  });

  // Control selected marker
  const [selectedMarker, setSelectedMarker] = useSelectedMarker(mapFirst);

  // Get properties and other state
  const properties = state?.properties || [];
  const isSearching = state?.isSearching || false;

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

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Loading Indicator */}
      {isSearching && (
        <div className="absolute top-4 right-4 bg-white px-4 py-2 rounded-lg shadow-lg">
          <p className="text-sm">Searching properties...</p>
        </div>
      )}

      {/* Horizontal Scrollable Cards at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent pb-4 pt-8 z-[30]">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 px-4 min-w-max">
            {properties.map((property) => {
              const isSelected = selectedMarker === property.tripadvisor_id;
              const pricing = property.pricing as any;
              const price = pricing?.lead_rate?.display_price;
              const isPending = pricing?.isPending;

              return (
                <div
                  key={property.tripadvisor_id}
                  onClick={() => handleCardClick(property.tripadvisor_id)}
                  className={`
                    w-[200px] h-[110px] rounded-lg overflow-hidden cursor-pointer
                    transition-all duration-200 flex-shrink-0
                    ${
                      isSelected
                        ? "ring-2 ring-blue-500 shadow-xl scale-105"
                        : "shadow-md hover:shadow-lg"
                    }
                  `}
                >
                  <div className="w-full h-full bg-white p-3 flex flex-col justify-between">
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
                            ${price}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {properties.length === 0 && !isSearching && (
              <div className="w-full h-[110px] flex items-center justify-center text-white">
                <p className="text-sm">No properties found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hide scrollbar CSS */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
