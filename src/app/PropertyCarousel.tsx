"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Property } from "@mapfirst.ai/core";
import { Swiper, SwiperClass, SwiperSlide } from "swiper/react";
import { FreeMode, Mousewheel } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";

type PropertyCarouselProps = {
  properties: Property[];
  selectedMarker: number | null;
  onSelectMarker: (id: number) => void;
  onFlyTo?: (lon: number, lat: number) => void;
  isSearching: boolean;
};

export default function PropertyCarousel({
  properties,
  selectedMarker,
  onSelectMarker,
  onFlyTo,
  isSearching,
}: PropertyCarouselProps) {
  const [swiper, setSwiper] = useState<SwiperClass | null>(null);
  const skipNextChange = useRef(false);

  const selectedIndex = useMemo(() => {
    if (selectedMarker === null) {
      return null;
    }
    const propertyIndex = properties.findIndex(
      (p) => p.tripadvisor_id === selectedMarker
    );
    return propertyIndex === -1 ? null : propertyIndex;
  }, [properties, selectedMarker]);

  useEffect(() => {
    if (
      selectedIndex !== null &&
      swiper &&
      selectedIndex < properties.length
    ) {
      const shouldSlide = swiper.activeIndex !== selectedIndex;
      skipNextChange.current = shouldSlide;

      if (shouldSlide) {
        swiper.slideTo(selectedIndex);
      }
    } else {
      skipNextChange.current = false;
    }
  }, [properties, selectedIndex, swiper]);

  const handleSlideChange = useCallback(
    (swiperInstance: SwiperClass) => {
      if (skipNextChange.current) {
        skipNextChange.current = false;
        return;
      }
      clearTimeout(window._slideTimer);
      window._slideTimer = setTimeout(() => {
        if (properties[swiperInstance.activeIndex]) {
          onSelectMarker(properties[swiperInstance.activeIndex].tripadvisor_id);
        }
      }, 500);
    },
    [properties, onSelectMarker]
  );

  const handleCardClick = useCallback(
    (property: Property) => {
      onSelectMarker(property.tripadvisor_id);
      if (onFlyTo && property.location) {
        onFlyTo(property.location.lon, property.location.lat);
      }
    },
    [onFlyTo, onSelectMarker]
  );

  return (
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
              onClick={() => handleCardClick(property)}
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
                  <div className="flex-1 min-h-0">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                      {property.name}
                    </h3>
                  </div>

                  <div className="flex items-end justify-between mt-2">
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      {property.type}
                    </span>

                    <div className="text-right">
                      {isPending ? (
                        <span className="text-xs text-gray-400">Loading...</span>
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
  );
}
