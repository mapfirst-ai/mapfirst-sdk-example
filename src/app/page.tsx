import Home from "./client";

export type InitialData = {
  location_id: number;
  city?: string;
  country: string;
  longitude: number;
  latitude: number;
  currency: string;
};

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{
    city?: string;
    country?: string;
    currency?: string;
    variant?: string;
    query?: string;
    color?: string;
  }>;
}) {
  const { city, country, currency } = await searchParams;

  const initial_data: InitialData = {
    longitude: -6.260296,
    latitude: 53.349801,
    city: "Dublin",
    country: "Ireland",
    location_id: 186605,
    currency: "USD",
  };
  if (currency) {
    initial_data.currency = currency;
  }

  if ((city && country) || country) {
    const geoResponse = await fetch(
      `${
        process.env.NEXT_PUBLIC_BACKEND_URL
      }/geo-lookup?country=${encodeURIComponent(country)}${
        city ? `&city=${encodeURIComponent(city)}` : ""
      }`
    );
    if (geoResponse.ok) {
      const geoData = await geoResponse.json();
      if (
        geoData.location_name &&
        geoData.path3_name &&
        geoData.location_name === geoData.path3_name
      )
        initial_data.city = undefined;
      if (geoData.location_name) initial_data.city = geoData.location_name;
      if (geoData.path3_name) initial_data.country = geoData.path3_name;
      initial_data.longitude = geoData.longitude;
      initial_data.latitude = geoData.latitude;
      initial_data.location_id = geoData.location_id;
    } else {
      console.error("Geo mapping fetch failed:", geoResponse.statusText);
    }
  }

  return <Home locationData={initial_data} />;
}
