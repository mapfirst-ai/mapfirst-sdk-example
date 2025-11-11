"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { FeatureCollection, Point } from "geojson";
import type { GeoJSONSource, Map as MapboxMap } from "mapbox-gl";
import {
  GoogleMap,
  MarkerClustererF,
  MarkerF,
  useJsApiLoader,
} from "@react-google-maps/api";
import "mapbox-gl/dist/mapbox-gl.css";

type Coordinates = {
  lat: number;
  lng: number;
};

export type HotelMarker = {
  id?: string;
  name: string;
  rating: number;
  price: number;
  lat: number;
  lng: number;
};

export type MapProvider = "mapbox" | "google";

type HotelMapProps = {
  provider: MapProvider;
  markers: HotelMarker[];
  center?: Coordinates;
  zoom?: number;
  className?: string;
  mapboxToken?: string;
  googleMapsApiKey?: string;
};

const MAPBOX_SOURCE_ID = "hotel-markers";
const FALLBACK_CENTER: Coordinates = { lat: 40.758, lng: -73.9855 }; // Midtown Manhattan

export function HotelMap(props: HotelMapProps) {
  const resolvedMapboxToken = (
    props.mapboxToken ?? process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  )?.trim();
  const resolvedGoogleKey = (
    props.googleMapsApiKey ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  )?.trim();

  if (props.provider === "google") {
    if (!resolvedGoogleKey) {
      return (
        <CredentialNotice className={props.className}>
          Add a Google Maps API key via NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to
          render this map.
        </CredentialNotice>
      );
    }

    return <GoogleHotelMap {...props} googleMapsApiKey={resolvedGoogleKey} />;
  }

  if (!resolvedMapboxToken) {
    return (
      <CredentialNotice className={props.className}>
        Add a Mapbox token via NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to render this
        map.
      </CredentialNotice>
    );
  }

  return <MapboxHotelMap {...props} mapboxToken={resolvedMapboxToken} />;
}

function MapboxHotelMap({
  markers,
  center,
  zoom = 11,
  className,
  mapboxToken,
}: Omit<HotelMapProps, "provider" | "googleMapsApiKey"> & {
  mapboxToken: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const derivedCenter = useMemo(
    () => resolveCenter(markers, center),
    [markers, center]
  );
  const geoJsonData = useMemo(() => toGeoJson(markers), [markers]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current || !mapboxToken) {
      return;
    }

    let isMounted = true;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (!isMounted) {
        return;
      }

      mapboxgl.accessToken = mapboxToken;
      const mapInstance = new mapboxgl.Map({
        container,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [derivedCenter.lng, derivedCenter.lat],
        zoom,
      });

      mapInstance.addControl(new mapboxgl.NavigationControl(), "top-right");
      mapInstance.on("load", () => {
        addClusterSource(mapInstance);
        addClusterLayers(mapInstance);
        setMapReady(true);
      });

      mapRef.current = mapInstance;
    })();

    return () => {
      isMounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [mapboxToken, derivedCenter.lat, derivedCenter.lng, zoom]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    const map = mapRef.current;
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => map.resize())
        : null;

    if (observer && containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer?.disconnect();
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) {
      return;
    }

    const source = mapRef.current.getSource(MAPBOX_SOURCE_ID) as
      | GeoJSONSource
      | undefined;
    if (source) {
      source.setData(geoJsonData);
    }
  }, [geoJsonData, mapReady]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    mapRef.current.easeTo({
      center: [derivedCenter.lng, derivedCenter.lat],
      zoom,
      duration: 500,
    });
  }, [derivedCenter.lat, derivedCenter.lng, zoom]);

  return (
    <div className={containerClasses(className)}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

function addClusterSource(map: MapboxMap) {
  if (map.getSource(MAPBOX_SOURCE_ID)) {
    return;
  }

  map.addSource(MAPBOX_SOURCE_ID, {
    type: "geojson",
    data: emptyFeatureCollection(),
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  });
}

function addClusterLayers(map: MapboxMap) {
  if (!map.getLayer("clusters")) {
    map.addLayer({
      id: "clusters",
      type: "circle",
      source: MAPBOX_SOURCE_ID,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step",
          ["get", "point_count"],
          "#86efac",
          5,
          "#4ade80",
          15,
          "#15803d",
        ],
        "circle-radius": ["step", ["get", "point_count"], 18, 5, 24, 15, 32],
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#fff",
      },
    });
  }

  if (!map.getLayer("cluster-count")) {
    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: MAPBOX_SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 14,
      },
      paint: {
        "text-color": "#0f172a",
      },
    });
  }

  if (!map.getLayer("unclustered-point")) {
    map.addLayer({
      id: "unclustered-point",
      type: "circle",
      source: MAPBOX_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": "#2563eb",
        "circle-radius": 8,
        "circle-stroke-width": 1.75,
        "circle-stroke-color": "#fff",
      },
    });
  }

  map.on("click", "clusters", (event) => {
    const features = map.queryRenderedFeatures(event.point, {
      layers: ["clusters"],
    });
    const clusterId = features[0]?.properties?.cluster_id;
    const coordinates =
      features[0]?.geometry?.type === "Point"
        ? features[0].geometry.coordinates
        : null;

    if (!clusterId || !coordinates) {
      return;
    }

    const source = map.getSource(MAPBOX_SOURCE_ID) as GeoJSONSource | undefined;
    source?.getClusterExpansionZoom(clusterId, (error, targetZoom) => {
      if (error || targetZoom === undefined || targetZoom === null) {
        return;
      }
      map.easeTo({
        center: coordinates as [number, number],
        zoom: targetZoom,
        duration: 500,
      });
    });
  });

  map.on("mouseenter", "clusters", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "clusters", () => {
    map.getCanvas().style.cursor = "";
  });
}

function GoogleHotelMap({
  markers,
  center,
  zoom = 11,
  className,
  googleMapsApiKey,
}: Omit<HotelMapProps, "provider" | "mapboxToken"> & {
  googleMapsApiKey: string;
}) {
  const derivedCenter = useMemo(
    () => resolveCenter(markers, center),
    [markers, center]
  );

  const { isLoaded, loadError } = useJsApiLoader({
    id: "hotel-map-google",
    googleMapsApiKey,
    libraries: ["marker"],
  });

  if (loadError) {
    return (
      <CredentialNotice className={className}>
        Unable to load Google Maps: {loadError.message}
      </CredentialNotice>
    );
  }

  if (!isLoaded) {
    return (
      <div className={containerClasses(className)}>
        <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
          Loading Google Maps…
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses(className)}>
      <GoogleMap
        center={derivedCenter}
        zoom={zoom}
        mapContainerClassName="h-full w-full"
        options={{
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        }}
      >
        <MarkerClustererF>
          {(clusterer) => (
            <>
              {markers.map((marker) => (
                <MarkerF
                  key={marker.id ?? `${marker.lat}-${marker.lng}`}
                  clusterer={clusterer}
                  position={{ lat: marker.lat, lng: marker.lng }}
                  title={`${marker.name} · ${marker.rating.toFixed(1)} · $${
                    marker.price
                  }`}
                />
              ))}
            </>
          )}
        </MarkerClustererF>
      </GoogleMap>
    </div>
  );
}

function resolveCenter(
  markers: HotelMarker[],
  explicit?: Coordinates
): Coordinates {
  if (explicit) {
    return explicit;
  }

  if (!markers.length) {
    return FALLBACK_CENTER;
  }

  const { latSum, lngSum } = markers.reduce(
    (acc, point) => ({
      latSum: acc.latSum + point.lat,
      lngSum: acc.lngSum + point.lng,
    }),
    { latSum: 0, lngSum: 0 }
  );

  return {
    lat: latSum / markers.length,
    lng: lngSum / markers.length,
  };
}

function toGeoJson(markers: HotelMarker[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: markers.map((marker) => ({
      type: "Feature",
      properties: {
        id: marker.id ?? `${marker.lat}-${marker.lng}`,
        name: marker.name,
        rating: marker.rating,
        price: marker.price,
      },
      geometry: {
        type: "Point",
        coordinates: [marker.lng, marker.lat],
      },
    })),
  };
}

function emptyFeatureCollection(): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: [],
  };
}

function containerClasses(extra?: string) {
  return [
    "relative min-h-[420px] h-full w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

function CredentialNotice({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "flex min-h-[360px] w-full items-center justify-center rounded-2xl border border-dashed border-amber-400 bg-amber-50 px-6 text-center text-sm text-amber-900",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
