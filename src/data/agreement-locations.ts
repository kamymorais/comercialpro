export type AgreementLocation = {
  id: string;
  agreementCode: string;
  agreementName: string;
  name: string;
  employeeCount: string;
  address: string;
  latitude: number;
  longitude: number;
};

export type AgreementOption = {
  code: string;
  name: string;
};

export const AGREEMENT_LOCATIONS: AgreementLocation[] = [
  {
    id: "mpdft-brasilia-i",
    agreementCode: "MPDFT",
    agreementName: "MPDFT",
    name: "Promotoria de Justiça de Brasília I",
    employeeCount: "1.655 servidores ativos",
    address:
      "Eixo Monumental, Praça do Buriti, Lote 2, Ed. Sede do MPDFT, Brasília-DF, CEP 70091-900",
    latitude: -15.7992,
    longitude: -47.8644,
  },
  {
    id: "mpdft-brasilia-ii",
    agreementCode: "MPDFT",
    agreementName: "MPDFT",
    name: "Promotoria de Justiça de Brasília II",
    employeeCount: "1.655 servidores ativos",
    address: "SMAS, Trecho 4, Lotes 6/8, Brasília-DF, CEP 70610-078",
    latitude: -15.8339,
    longitude: -47.952,
  },
  {
    id: "mpdft-guara",
    agreementCode: "MPDFT",
    agreementName: "MPDFT",
    name: "Promotoria de Justiça do Guará",
    employeeCount: "1.655 servidores ativos",
    address: "SMAS, Trecho 4, Lotes 6/8, Brasília-DF, CEP 70610-078",
    latitude: -15.8339,
    longitude: -47.952,
  },
  {
    id: "mpdft-nucleo-bandeirante",
    agreementCode: "MPDFT",
    agreementName: "MPDFT",
    name: "Promotoria de Justiça do Núcleo Bandeirante",
    employeeCount: "1.655 servidores ativos",
    address: "SMAS, Trecho 4, Lotes 6/8, Brasília-DF, CEP 70610-078",
    latitude: -15.8339,
    longitude: -47.952,
  },
  {
    id: "mpdft-riacho-fundo",
    agreementCode: "MPDFT",
    agreementName: "MPDFT",
    name: "Promotoria de Justiça do Riacho Fundo",
    employeeCount: "1.655 servidores ativos",
    address: "SMAS, Trecho 4, Lotes 6/8, Brasília-DF, CEP 70610-078",
    latitude: -15.8339,
    longitude: -47.952,
  },
  {
    id: "mpdft-brazlandia",
    agreementCode: "MPDFT",
    agreementName: "MPDFT",
    name: "Promotoria de Justiça de Brazlândia",
    employeeCount: "1.655 servidores ativos",
    address:
      "Área Especial 4, Lote 2, Ed. Promotor de Justiça Paulo Vinícius Quintela de Almeida, Setor Tradicional, Brazlândia-DF, CEP 72720-640",
    latitude: -15.6789,
    longitude: -48.1985,
  },
  {
    id: "mpdft-ceilandia",
    agreementCode: "MPDFT",
    agreementName: "MPDFT",
    name: "Promotoria de Justiça de Ceilândia",
    employeeCount: "1.655 servidores ativos",
    address: "QNM 11, Lotes 1 e 2, Centro Urbano, Ceilândia-DF, CEP 72215-110",
    latitude: -15.8159,
    longitude: -48.1058,
  },
  {
    id: "mpdft-gama",
    agreementCode: "MPDFT",
    agreementName: "MPDFT",
    name: "Promotoria de Justiça do Gama",
    employeeCount: "1.655 servidores ativos",
    address:
      "Quadra 1, Lotes 860, 880 e 900, Setor Industrial Leste, Gama-DF, CEP 72445-010",
    latitude: -16.0216,
    longitude: -48.066,
  },
  {
    id: "mpdft-paranoa",
    agreementCode: "MPDFT",
    agreementName: "MPDFT",
    name: "Promotoria de Justiça do Paranoá",
    employeeCount: "1.655 servidores ativos",
    address:
      "Quadra 4, Conjunto B, Lote 1, Grandes Áreas, Paranoá-DF, CEP 71570-402",
    latitude: -15.7762,
    longitude: -47.7821,
  },
  {
    id: "mpdft-planaltina",
    agreementCode: "MPDFT",
    agreementName: "MPDFT",
    name: "Promotoria de Justiça de Planaltina",
    employeeCount: "1.655 servidores ativos",
    address:
      "Área Especial Norte 10-A, Setor Administrativo, Planaltina-DF, CEP 73310-100",
    latitude: -15.6205,
    longitude: -47.6527,
  },
  {
    id: "mpdft-recanto-das-emas",
    agreementCode: "MPDFT",
    agreementName: "MPDFT",
    name: "Promotoria de Justiça do Recanto das Emas",
    employeeCount: "1.655 servidores ativos",
    address: "Quadra 2, Conjunto 1, Lote 3, Setor Urbano, Recanto das Emas-DF",
    latitude: -15.909,
    longitude: -48.063,
  },
  {
    id: "mpdft-samambaia",
    agreementCode: "MPDFT",
    agreementName: "MPDFT",
    name: "Promotoria de Justiça de Samambaia",
    employeeCount: "1.655 servidores ativos",
    address: "Quadra 302, Conjunto 1, Lote 2, Samambaia-DF",
    latitude: -15.8764,
    longitude: -48.0865,
  },
  {
    id: "mpdft-santa-maria",
    agreementCode: "MPDFT",
    agreementName: "MPDFT",
    name: "Promotoria de Justiça de Santa Maria",
    employeeCount: "1.655 servidores ativos",
    address: "QR 211, Conjunto A, Lote 14, Santa Maria-DF, CEP 72511-101",
    latitude: -16.0124,
    longitude: -48.0112,
  },
  {
    id: "mpdft-sao-sebastiao",
    agreementCode: "MPDFT",
    agreementName: "MPDFT",
    name: "Promotoria de Justiça de São Sebastião",
    employeeCount: "1.655 servidores ativos",
    address:
      "Centro de Múltiplas Atividades, Lote 3, São Sebastião-DF, CEP 71691-074",
    latitude: -15.9027,
    longitude: -47.7734,
  },
  {
    id: "mpdft-sobradinho",
    agreementCode: "MPDFT",
    agreementName: "MPDFT",
    name: "Promotoria de Justiça de Sobradinho",
    employeeCount: "1.655 servidores ativos",
    address:
      "Quadra Central, Bloco 7, Edifício Sylvia, Térreo, 2º e 3º pavimentos, Sobradinho-DF, CEP 73010-517",
    latitude: -15.653,
    longitude: -47.7925,
  },
  {
    id: "mpdft-taguatinga-aguas-claras",
    agreementCode: "MPDFT",
    agreementName: "MPDFT",
    name: "Promotoria de Justiça de Taguatinga e de Águas Claras",
    employeeCount: "1.655 servidores ativos",
    address:
      "Setor C Norte, QNC, Área Especial para Clínicas, Lotes 14/15, Taguatinga Norte, Taguatinga-DF, CEP 72116-900",
    latitude: -15.8179,
    longitude: -48.0714,
  },
  {
    id: "mpdft-infancia-juventude",
    agreementCode: "MPDFT",
    agreementName: "MPDFT",
    name: "Promotoria de Justiça de Defesa da Infância e da Juventude",
    employeeCount: "1.655 servidores ativos",
    address: "SEPN 711/911, Bloco B, Asa Norte, Brasília-DF",
    latitude: -15.744,
    longitude: -47.9009,
  },
];

export function getAgreementOptions(): AgreementOption[] {
  const optionsByCode = new Map<string, AgreementOption>();

  for (const location of AGREEMENT_LOCATIONS) {
    optionsByCode.set(location.agreementCode, {
      code: location.agreementCode,
      name: location.agreementName,
    });
  }

  return Array.from(optionsByCode.values()).sort((current, next) =>
    current.name.localeCompare(next.name, "pt-BR"),
  );
}

export function getAgreementLocationsByCode(
  agreementCode: string,
): AgreementLocation[] {
  return AGREEMENT_LOCATIONS.filter(
    (location) => location.agreementCode === agreementCode,
  );
}

export function findAgreementLocation(params: {
  agreementCode: string;
  unitId: string;
}): AgreementLocation | null {
  return (
    AGREEMENT_LOCATIONS.find(
      (location) =>
        location.agreementCode === params.agreementCode &&
        location.id === params.unitId,
    ) ?? null
  );
}
