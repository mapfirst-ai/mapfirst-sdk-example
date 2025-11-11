import { HotelMap, type HotelMarker } from "@/components/HotelMap";

const sampleHotels: HotelMarker[] = [
  {
    id: "hudson",
    name: "Hudson View Hotel",
    rating: 4.6,
    price: 215,
    lat: 40.762697,
    lng: -73.985664,
  },
  {
    id: "chelsea",
    name: "Chelsea Garden Suites",
    rating: 4.4,
    price: 185,
    lat: 40.7465,
    lng: -73.9982,
  },
  {
    id: "soho",
    name: "SoHo Boutique Stay",
    rating: 4.8,
    price: 265,
    lat: 40.7233,
    lng: -74.003,
  },
  {
    id: "bk-bridge",
    name: "Brooklyn Bridge Hotel",
    rating: 4.5,
    price: 175,
    lat: 40.7033,
    lng: -73.9903,
  },
  {
    id: "lic",
    name: "Long Island City Towers",
    rating: 4.1,
    price: 145,
    lat: 40.744,
    lng: -73.9485,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 lg:px-10">
        <header className="space-y-4 text-center lg:text-left">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
            MapFirst SDK
          </p>
        </header>

        <section className="grid gap-10 lg:grid-cols-2">
          <article className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Mapbox</h2>
            </div>
            <HotelMap
              provider="mapbox"
              markers={sampleHotels}
              className="min-h-[420px]"
            />
          </article>

          <article className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Google Maps
              </h2>
            </div>
            <HotelMap
              provider="google"
              markers={sampleHotels}
              className="min-h-[420px]"
            />
          </article>
        </section>
      </main>
    </div>
  );
}
