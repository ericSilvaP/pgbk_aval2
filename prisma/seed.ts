import { PrismaClient, TripRequestStatus } from "@prisma/client";

const prisma = new PrismaClient();

const tripRequests = [
  {
    id: "0f4cb6be-3bbd-4f58-8e86-1e6627d37201",
    requesterName: "Maria Silva",
    origin: "Parnaiba",
    destination: "Teresina",
    departureAt: new Date("2026-06-24T10:00:00.000Z"),
    returnAt: new Date("2026-06-24T18:00:00.000Z"),
    purpose: "Participation in an institutional meeting",
    passengerCount: 3,
    status: TripRequestStatus.pending,
    createdAt: new Date("2026-06-20T14:30:00.000Z")
  },
  {
    id: "4bb7d070-e989-40e6-89fc-5a2270f74654",
    requesterName: "Joao Pereira",
    origin: "Teresina",
    destination: "Floriano",
    departureAt: new Date("2026-07-06T09:00:00.000Z"),
    returnAt: new Date("2026-07-07T20:00:00.000Z"),
    purpose: "Teaching activity supervision",
    passengerCount: 2,
    status: TripRequestStatus.pending,
    createdAt: new Date("2026-06-21T11:20:00.000Z")
  },
  {
    id: "bf33ae31-2040-4053-a02f-761f90a7c4c6",
    requesterName: "Ana Costa",
    origin: "Picos",
    destination: "Teresina",
    departureAt: new Date("2026-07-08T12:00:00.000Z"),
    returnAt: new Date("2026-07-08T22:00:00.000Z"),
    purpose: "Administrative planning meeting",
    passengerCount: 4,
    status: TripRequestStatus.pending,
    createdAt: new Date("2026-06-22T09:15:00.000Z")
  },
  {
    id: "db41a769-f80e-40e6-91a7-23b06f870a7b",
    requesterName: "Carlos Santos",
    origin: "Teresina",
    destination: "Piripiri",
    departureAt: new Date("2026-07-10T08:30:00.000Z"),
    returnAt: new Date("2026-07-10T19:30:00.000Z"),
    purpose: "Extension project visit",
    passengerCount: 5,
    status: TripRequestStatus.pending,
    createdAt: new Date("2026-06-22T16:45:00.000Z")
  },
  {
    id: "8a0c9dc1-cb3d-4c1f-860f-229924ae8585",
    requesterName: "Fernanda Lima",
    origin: "Campo Maior",
    destination: "Teresina",
    departureAt: new Date("2026-07-13T10:15:00.000Z"),
    returnAt: new Date("2026-07-13T17:00:00.000Z"),
    purpose: "Research group presentation",
    passengerCount: 1,
    status: TripRequestStatus.canceled,
    createdAt: new Date("2026-06-23T08:00:00.000Z")
  },
  {
    id: "1f81ae6b-1bf6-45bb-b090-21447c6ac80d",
    requesterName: "Rafael Alves",
    origin: "Teresina",
    destination: "Oeiras",
    departureAt: new Date("2026-07-15T11:00:00.000Z"),
    returnAt: new Date("2026-07-16T21:00:00.000Z"),
    purpose: "Academic event support",
    passengerCount: 6,
    status: TripRequestStatus.pending,
    createdAt: new Date("2026-06-23T10:30:00.000Z")
  },
  {
    id: "137dbb94-44b4-4096-9c5f-8adba38ae773",
    requesterName: "Patricia Rocha",
    origin: "Parnaiba",
    destination: "Luis Correia",
    departureAt: new Date("2026-07-17T13:00:00.000Z"),
    returnAt: new Date("2026-07-17T18:00:00.000Z"),
    purpose: "Campus infrastructure inspection",
    passengerCount: 2,
    status: TripRequestStatus.pending,
    createdAt: new Date("2026-06-23T13:10:00.000Z")
  },
  {
    id: "058b0a85-3ff8-4b9a-a5a5-4d81de5137ea",
    requesterName: "Lucas Martins",
    origin: "Teresina",
    destination: "Barras",
    departureAt: new Date("2026-07-20T07:45:00.000Z"),
    returnAt: new Date("2026-07-20T16:45:00.000Z"),
    purpose: "Institutional partnership meeting",
    passengerCount: 3,
    status: TripRequestStatus.pending,
    createdAt: new Date("2026-06-23T15:20:00.000Z")
  },
  {
    id: "a06f4c84-fd93-44f5-aec0-d08cfae905f6",
    requesterName: "Juliana Sousa",
    origin: "Floriano",
    destination: "Picos",
    departureAt: new Date("2026-07-22T09:30:00.000Z"),
    returnAt: new Date("2026-07-23T19:00:00.000Z"),
    purpose: "Student project evaluation",
    passengerCount: 4,
    status: TripRequestStatus.pending,
    createdAt: new Date("2026-06-24T09:00:00.000Z")
  },
  {
    id: "d68cdfac-ece5-4be8-80f1-a87726fd62ab",
    requesterName: "Marcos Oliveira",
    origin: "Teresina",
    destination: "Sao Raimundo Nonato",
    departureAt: new Date("2026-07-27T06:00:00.000Z"),
    returnAt: new Date("2026-07-28T23:00:00.000Z"),
    purpose: "Research field activity",
    passengerCount: 7,
    status: TripRequestStatus.pending,
    createdAt: new Date("2026-06-24T10:40:00.000Z")
  }
];

async function main() {
  for (const tripRequest of tripRequests) {
    await prisma.tripRequest.upsert({
      where: {
        id: tripRequest.id
      },
      update: tripRequest,
      create: tripRequest
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
