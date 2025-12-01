"use client";
import { Property } from "@mapfirst.ai/core";
import { FunctionComponent, useEffect, useMemo, useState } from "react";

const starClassName = (isPortrait: boolean) =>
  `border rounded-full border-tripadvisor-green-dark ${
    isPortrait
      ? "w-3 h-3"
      : "w-2 h-2 [@media(min-height:48rem)]:w-3 [@media(min-height:48rem)]:h-3"
  }`;

const renderStars = (rating: number, isPortrait: boolean) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <span
        key={i}
        className={starClassName(isPortrait) + " bg-tripadvisor-green-dark"}
      ></span>
    );
  }

  if (hasHalfStar) {
    stars.push(
      <span
        key="half"
        className={starClassName(isPortrait)}
        style={{
          background: "linear-gradient(90deg, #03852e 50%, transparent 50%)",
        }}
      ></span>
    );
  }

  const remainingStars = 5 - Math.ceil(rating);
  for (let i = 0; i < remainingStars; i++) {
    stars.push(
      <span key={`empty-${i}`} className={starClassName(isPortrait)}></span>
    );
  }

  return stars;
};

interface PropertyCardProps {
  property: Property;
  selected?: boolean;
  t: (key: string) => string;
  isPortrait: boolean;
}

export const PropertyCard: FunctionComponent<PropertyCardProps> = ({
  property,
  t,
  isPortrait,
  selected = false,
}) => {
  const [image, setImage] = useState<string | undefined | null>(undefined);
  useEffect(() => {
    if (property.tripadvisor_id) {
      fetch(
        `https://l4detuz832.execute-api.us-east-1.amazonaws.com/dev/photo?id=${property.tripadvisor_id}&limit=1`
      )
        .then((response) => response.json())
        .then((data) => {
          if (data.photos && data.photos.length > 0) {
            fetch(data.photos[0]["FullSizeURL"].url)
              .then((res) => {
                if (res.ok) {
                  setImage(data.photos[0]["FullSizeURL"].url);
                } else {
                  setImage(null);
                }
              })
              .catch(() => setImage(null));
          } else {
            setImage(null);
          }
        })
        .catch(() => setImage(null));
    }
  }, [property.tripadvisor_id]);
  const stars = useMemo(
    () => renderStars(property.rating ?? 0, isPortrait),
    [property.rating, isPortrait]
  );
  const url = useMemo(
    () => property.pricing?.offer?.clickUrl ?? property.urls?.tripadvisor.main,
    [property]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      className={`relative flex bg-white rounded-xl shrink-0 cursor-pointer pointer-events-auto transition-all ease-in-out ${
        !isPortrait ? "border border-tripadvisor-foreground" : ""
      } ${
        selected && !isPortrait
          ? "border-tripadvisor-green! border-4 shadow-2xl"
          : ""
      }
       h-full w-full
        ${isPortrait ? "gap-3" : "gap-2 p-1"}`}
    >
      <div
        className={`relative w-[40%] rounded-md overflow-hidden shrink-0 image-loading ${
          isPortrait ? "" : "max-w-20 md:max-w-[100px]"
        }`}
      >
        <img
          onError={() => image !== undefined && setImage(null)}
          src={
            image ??
            `/images/${property.type
              .toLowerCase()
              .replace(/\s+/g, "")
              .replace(/&/g, "")}.webp`
          }
          alt={property.name}
          className={`${
            image === undefined ? "hidden" : ""
          } w-full h-full object-cover`}
        />
        {property.awards && property.awards.length > 0 && (
          <img
            src={property.awards[0].image.url}
            alt={t("hotelCard.awardAlt")}
            className={`absolute bottom-2 left-1 ${
              isPortrait ? "w-12 h-12" : "w-10 h-10"
            }`}
          />
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between items-start">
        <h3
          className={`font-bold font-tripsans text-black line-clamp-2 text-ellipsis shrink-0 ${
            isPortrait
              ? "text-sm sm:text-base mb-1"
              : "text-xs [@media(min-height:48rem)]:text-sm"
          }`}
        >
          {property.name}
        </h3>
        <div className={`flex items-center gap-2 ${isPortrait ? "mb-2" : ""}`}>
          <span
            className={`text-black ${
              isPortrait
                ? "text-sm sm:text-base"
                : "text-[10px] [@media(min-height:48rem)]:text-sm"
            }`}
          >
            {(property.rating ?? 0).toFixed(1)}
          </span>
          <div className="flex gap-px select-none">{stars}</div>
          <a
            href={url}
            target="_blank"
            className={`text-gray-600 underline ${
              isPortrait
                ? "text-xs sm:text-sm"
                : "text-[10px] [@media(min-height:48rem)]:text-sm"
            }`}
          >
            ({property.reviews})
          </a>
        </div>
        {property.type === "Accommodation" ? (
          <div
            className={`text-gray-600 mb-1 ${
              isPortrait
                ? "text-sm"
                : "text-[11px] [@media(min-height:48rem)]:text-sm"
            }`}
          >
            {t("hotelCard.startingAt")}{" "}
            {property.pricing?.offer?.displayPrice ? (
              <span
                className={`font-bold text-black ${
                  isPortrait
                    ? "text-base sm:text-lg"
                    : "text-xs [@media(min-height:48rem)]:text-lg"
                }`}
              >
                {property.pricing?.offer?.displayPrice}
              </span>
            ) : (
              "..."
            )}
          </div>
        ) : (
          ((property.secondaries && property.secondaries.length > 0) ||
            property.price_level !== undefined) && (
            <div className="flex items-center gap-1 w-full">
              {/* {property.type === "Eat & Drink" ? (
                <EatAndDrink className="w-[14px] h-[14px] shrink-0" />
              ) : (
                property.type === "Attraction" && (
                  <AttractionIcon className="w-[14px] h-[14px] shrink-0" />
                )
              )} */}
              <p
                className={`flex flex-wrap line-clamp-1! overflow-ellipsis items-center break-all text-tripadvisor-green-darkest w-full ${
                  isPortrait
                    ? "text-sm"
                    : "text-[11px] [@media(min-height:48rem)]:text-sm"
                }`}
              >
                {property.secondaries &&
                  property.secondaries.length > 0 &&
                  property.secondaries[0]}
                {property.price_level && (
                  <span className="price_level">
                    {property.price_level === "Cheap Eats"
                      ? "$"
                      : property.price_level === "Fine Dining"
                      ? "$$$$"
                      : property.price_level === "Mid Range" && "$$-$$$"}
                  </span>
                )}
              </p>
            </div>
          )
        )}
        {url && (
          <a
            href={
              "http://localhost:8000/redirect?url=" + encodeURIComponent(url)
            }
            target="_blank"
            className={`bg-tripadvisor-green text-foreground-color border border-foreground-color ease-in-out hover:scale-[105%] rounded-full px-4 font-medium font-tripsans cursor-pointer transition-all select-none w-full text-center ${
              isPortrait
                ? "py-0.5 sm:py-1 text-sm sm:text-lg"
                : "py-0.5 text-xs [@media(min-height:48rem)]:text-base"
            }`}
          >
            {t("hotelCard.learnMore")}
          </a>
        )}
      </div>
    </div>
  );
};
