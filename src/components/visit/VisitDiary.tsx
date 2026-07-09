"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";

type UserLocation = {
  latitude: number;
  longitude: number;
};

type AgreementLocation = {
  id: string;
  agreement: string;
  name: string;
  employeeCount: string;
  address: string;
  latitude: number;
  longitude: number;
};

const AGREEMENT_LOCATIONS: AgreementLocation[] = [
  {
    id: "mpdft-brasilia-i",
    agreement: "MPDFT",
    name: "Promotoria de Justiça de Brasília I",
    employeeCount: "1.655 servidores ativos",
    address:
      "Eixo Monumental, Praça do Buriti, Lote 2, Ed. Sede do MPDFT, Brasília-DF, CEP 70091-900",
    latitude: -15.7992,
    longitude: -47.8644,
  },
  {
    id: "mpdft-brasilia-ii",
    agreement: "MPDFT",
    name: "Promotoria de Justiça de Brasília II",
    employeeCount: "1.655 servidores ativos",
    address:
      "SMAS, Trecho 4, Lotes 6/8, Brasília-DF, CEP 70610-078",
    latitude: -15.8339,
    longitude: -47.952,
  },
  {
    id: "mpdft-guara",
    agreement: "MPDFT",
    name: "Promotoria de Justiça do Guará",
    employeeCount: "1.655 servidores ativos",
    address:
      "SMAS, Trecho 4, Lotes 6/8, Brasília-DF, CEP 70610-078",
    latitude: -15.8339,
    longitude: -47.952,
  },
  {
    id: "mpdft-nucleo-bandeirante",
    agreement: "MPDFT",
    name: "Promotoria de Justiça do Núcleo Bandeirante",
    employeeCount: "1.655 servidores ativos",
    address:
      "SMAS, Trecho 4, Lotes 6/8, Brasília-DF, CEP 70610-078",
    latitude: -15.8339,
    longitude: -47.952,
  },
  {
    id: "mpdft-riacho-fundo",
    agreement: "MPDFT",
    name: "Promotoria de Justiça do Riacho Fundo",
    employeeCount: "1.655 servidores ativos",
    address:
      "SMAS, Trecho 4, Lotes 6/8, Brasília-DF, CEP 70610-078",
    latitude: -15.8339,
    longitude: -47.952,
  },
  {
    id: "mpdft-brazlandia",
    agreement: "MPDFT",
    name: "Promotoria de Justiça de Brazlândia",
    employeeCount: "1.655 servidores ativos",
    address:
      "Área Especial 4, Lote 2, Ed. Promotor de Justiça Paulo Vinícius Quintela de Almeida, Setor Tradicional, Brazlândia-DF, CEP 72720-640",
    latitude: -15.6789,
    longitude: -48.1985,
  },
  {
    id: "mpdft-ceilandia",
    agreement: "MPDFT",
    name: "Promotoria de Justiça de Ceilândia",
    employeeCount: "1.655 servidores ativos",
    address: "QNM 11, Lotes 1 e 2, Centro Urbano, Ceilândia-DF, CEP 72215-110",
    latitude: -15.8159,
    longitude: -48.1058,
  },
  {
    id: "mpdft-gama",
    agreement: "MPDFT",
    name: "Promotoria de Justiça do Gama",
    employeeCount: "1.655 servidores ativos",
    address:
      "Quadra 1, Lotes 860, 880 e 900, Setor Industrial Leste, Gama-DF, CEP 72445-010",
    latitude: -16.0216,
    longitude: -48.066,
  },
  {
    id: "mpdft-paranoa",
    agreement: "MPDFT",
    name: "Promotoria de Justiça do Paranoá",
    employeeCount: "1.655 servidores ativos",
    address:
      "Quadra 4, Conjunto B, Lote 1, Grandes Áreas, Paranoá-DF, CEP 71570-402",
    latitude: -15.7762,
    longitude: -47.7821,
  },
  {
    id: "mpdft-planaltina",
    agreement: "MPDFT",
    name: "Promotoria de Justiça de Planaltina",
    employeeCount: "1.655 servidores ativos",
    address:
      "Área Especial Norte 10-A, Setor Administrativo, Planaltina-DF, CEP 73310-100",
    latitude: -15.6205,
    longitude: -47.6527,
  },
  {
    id: "mpdft-recanto-das-emas",
    agreement: "MPDFT",
    name: "Promotoria de Justiça do Recanto das Emas",
    employeeCount: "1.655 servidores ativos",
    address:
      "Quadra 2, Conjunto 1, Lote 3, Setor Urbano, Recanto das Emas-DF",
    latitude: -15.909,
    longitude: -48.063,
  },
  {
    id: "mpdft-samambaia",
    agreement: "MPDFT",
    name: "Promotoria de Justiça de Samambaia",
    employeeCount: "1.655 servidores ativos",
    address: "Quadra 302, Conjunto 1, Lote 2, Samambaia-DF",
    latitude: -15.8764,
    longitude: -48.0865,
  },
  {
    id: "mpdft-santa-maria",
    agreement: "MPDFT",
    name: "Promotoria de Justiça de Santa Maria",
    employeeCount: "1.655 servidores ativos",
    address: "QR 211, Conjunto A, Lote 14, Santa Maria-DF, CEP 72511-101",
    latitude: -16.0124,
    longitude: -48.0112,
  },
  {
    id: "mpdft-sao-sebastiao",
    agreement: "MPDFT",
    name: "Promotoria de Justiça de São Sebastião",
    employeeCount: "1.655 servidores ativos",
    address:
      "Centro de Múltiplas Atividades, Lote 3, São Sebastião-DF, CEP 71691-074",
    latitude: -15.9027,
    longitude: -47.7734,
  },
  {
    id: "mpdft-sobradinho",
    agreement: "MPDFT",
    name: "Promotoria de Justiça de Sobradinho",
    employeeCount: "1.655 servidores ativos",
    address:
      "Quadra Central, Bloco 7, Edifício Sylvia, Térreo, 2º e 3º pavimentos, Sobradinho-DF, CEP 73010-517",
    latitude: -15.653,
    longitude: -47.7925,
  },
  {
    id: "mpdft-taguatinga-aguas-claras",
    agreement: "MPDFT",
    name: "Promotoria de Justiça de Taguatinga e de Águas Claras",
    employeeCount: "1.655 servidores ativos",
    address:
      "Setor C Norte, QNC, Área Especial para Clínicas, Lotes 14/15, Taguatinga Norte, Taguatinga-DF, CEP 72116-900",
    latitude: -15.8179,
    longitude: -48.0714,
  },
  {
    id: "mpdft-infancia-juventude",
    agreement: "MPDFT",
    name: "Promotoria de Justiça de Defesa da Infância e da Juventude",
    employeeCount: "1.655 servidores ativos",
    address: "SEPN 711/911, Bloco B, Asa Norte, Brasília-DF",
    latitude: -15.744,
    longitude: -47.9009,
  },
];

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

export function VisitDiary() {
  const [selectedAgreement, setSelectedAgreement] = useState("MPDFT");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agreements = useMemo(
    () => Array.from(new Set(AGREEMENT_LOCATIONS.map((item) => item.agreement))),
    [],
  );

  const closestLocation = useMemo(() => {
    if (!userLocation) {
      return null;
    }

    const locations = AGREEMENT_LOCATIONS.filter(
      (item) => item.agreement === selectedAgreement,
    );

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
              <option key={agreement} value={agreement}>
                {agreement}
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
                {closestLocation.location.agreement}
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
