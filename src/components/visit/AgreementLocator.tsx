"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  AGREEMENT_LOCATIONS,
  getAgreementLocationsByCode,
  getAgreementOptions,
  type AgreementLocation,
} from "@/data/agreement-locations";

type UserLocation = {
  latitude: number;
  longitude: number;
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceInKm(origin: UserLocation, destination: AgreementLocation) {
  const earthRadiusKm = 6371;
  const latitudeDistance = toRadians(destination.latitude - origin.latitude);
  const longitudeDistance = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);

  const haversine =
    Math.sin(latitudeDistance / 2) * Math.sin(latitudeDistance / 2) +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDistance / 2) *
      Math.sin(longitudeDistance / 2);

  return (
    earthRadiusKm *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function formatDistance(distanceInKm: number) {
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)} m`;
  }

  return `${distanceInKm.toFixed(1).replace(".", ",")} km`;
}

function getMapsUrl(location: AgreementLocation) {
  return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
}

export function AgreementLocator() {
  const agreements = useMemo(() => getAgreementOptions(), []);
  const [selectedAgreement, setSelectedAgreement] = useState(
    agreements[0]?.code ?? "MPDFT",
  );
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closestLocation = useMemo(() => {
    if (!userLocation) {
      return null;
    }

    const locations = getAgreementLocationsByCode(selectedAgreement);

    return locations
      .map((location) => ({
        location,
        distanceInKm: getDistanceInKm(userLocation, location),
      }))
      .sort((current, next) => current.distanceInKm - next.distanceInKm)[0];
  }, [selectedAgreement, userLocation]);

  function handleLocate() {
    setError(null);

    if (!navigator.geolocation) {
      setError("Seu navegador não permite consultar a localização.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsLocating(false);
      },
      () => {
        setError(
          "Não foi possível acessar a localização. Verifique a permissão do navegador e tente novamente.",
        );
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      },
    );
  }

  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Resumo</h2>
          <p className="mt-1 text-sm text-slate-600">
            Selecione o convênio e use a localização do celular para encontrar
            a unidade mais próxima.
          </p>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-800">
            Convênio
          </span>
          <select
            value={selectedAgreement}
            onChange={(event) => {
              setSelectedAgreement(event.target.value);
              setUserLocation(null);
              setError(null);
            }}
            className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
          >
            {agreements.map((agreement) => (
              <option key={agreement.code} value={agreement.code}>
                {agreement.name}
              </option>
            ))}
          </select>
          <span className="mt-2 block text-xs text-slate-500">
            {AGREEMENT_LOCATIONS.length} unidades do MPDFT cadastradas.
          </span>
        </label>

        <Button
          type="button"
          className="w-full sm:w-auto"
          loading={isLocating}
          onClick={handleLocate}
        >
          Usar localização
        </Button>

        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}
      </section>

      {closestLocation ? (
        <section className="space-y-4 rounded-lg border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-900">
              Unidade mais próxima
            </p>
            <h3 className="mt-2 text-xl font-bold text-slate-950">
              {closestLocation.location.name}
            </h3>
          </div>

          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-600">Nome do convênio</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {closestLocation.location.agreementName}
              </dd>
            </div>
            <div>
              <dt className="text-slate-600">Unidade</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {closestLocation.location.name}
              </dd>
            </div>
            <div>
              <dt className="text-slate-600">Quantidade de servidores</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {closestLocation.location.employeeCount}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-600">Endereço</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {closestLocation.location.address}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-600">Localização</dt>
              <dd className="mt-1 space-y-2 font-semibold text-slate-950">
                <p>
                  {formatDistance(closestLocation.distanceInKm)} da sua posição
                  atual.
                </p>
                <a
                  href={getMapsUrl(closestLocation.location)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-900 shadow-sm transition hover:bg-blue-50"
                >
                  Abrir no mapa
                </a>
              </dd>
            </div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}
