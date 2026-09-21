import dotenv from "dotenv";
import path from "path";
import { Prisma, prisma } from "@observe/db";
import { Kafka } from "kafkajs";

dotenv.config({ path: path.resolve(import.meta.dirname, "../../../.env") });

const kafka = new Kafka({
  clientId: "observe-analytics-worker",
  brokers: ["localhost:9092"],
});

const consumer = kafka.consumer({
  groupId: "observe-trace-worker",
});

const ingestionLatencies: number[] = [];
const expectedTraces = Number(process.env.EXPECTED_TRACES ?? 200);
let processedTraces = 0;

export const startKafkaConsumer = async () => {
  await consumer.connect();

  await consumer.subscribe({
    topic: "trace.created",
    fromBeginning: false,
  });

  await consumer.run({
    // eachMessage: async ({ topic, partition, message }) => {
    //   if (!message.value) return;

    //   try {
    //     const trace = JSON.parse(message.value.toString());

    //     if (!trace.traceId || !trace.projectId) {
    //       throw new Error("Invalid trace: missing traceId or projectId");
    //     }
    //     const createdTrace = await prisma.trace.create({
    //       data: trace,
    //     });
    //     console.log("Received trace and saved to db", trace, createdTrace);
    //   } catch (error) {
    //     if (
    //       error instanceof Prisma.PrismaClientKnownRequestError &&
    //       error.code === "P2002"
    //     ) {
    //       console.warn(
    //         "Trace already exists, skipping duplicate",
    //       );
    //       return;
    //     }
    //     console.error("Failed to process trace", error);
    //     throw error;
    //   }
    // },

    eachBatch: async ({ batch, resolveOffset, commitOffsetsIfNecessary }) => {
      const traces: Prisma.TraceCreateManyInput[] = [];
      const parsedTraces = [];

      for (const message of batch.messages) {
        if (!message.value) continue;

        const parsedTrace = JSON.parse(message.value.toString());

        if (!parsedTrace.traceId || !parsedTrace.projectId) {
          throw new Error("Invalid trace: missing traceId or projectId");
        }

        // Destructure to pull out ingestionStartedAt and collect everything else into 'trace'
        const { ingestionStartedAt, ...trace } = parsedTrace;
        parsedTraces.push(parsedTrace);

        traces.push(trace);
      }

      if (traces.length === 0) return;

      await prisma.trace.createMany({
        data: traces,
        skipDuplicates: true,
      });

      const persistedAt = Date.now();

      for (const trace of parsedTraces) {
        const latency = persistedAt - (trace as any).ingestionStartedAt;
        ingestionLatencies.push(latency);
      }

      processedTraces += traces.length;

      for (const message of batch.messages) {
        resolveOffset(message.offset);
      }

      await commitOffsetsIfNecessary();

      console.log(`Saved ${traces.length} traces`);

      // Test is complete
      if (expectedTraces > 0 && processedTraces >= expectedTraces) {
        const p50 = percentile(ingestionLatencies, 50);
        const p95 = percentile(ingestionLatencies, 95);
        const p99 = percentile(ingestionLatencies, 99);

        console.log("\n──────── Ingestion Latency ────────");
        console.log(`Samples: ${ingestionLatencies.length}`);
        console.log(`P50:     ${p50.toFixed(2)}ms`);
        console.log(`P95:     ${p95.toFixed(2)}ms`);
        console.log(`P99:     ${p99.toFixed(2)}ms`);
        console.log("──────────────────────────────────");
      }
    },
  });
};

const shutdown = async () => {
  console.log("Shutting down worker...");
  try {
    await prisma.$disconnect();
    await consumer.disconnect();
    console.log("Worker shutdown successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown", error);
    process.exit(1);
  }
};

const percentile = (values: number[], percentile: number): number => {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);

  const index = (percentile / 100) * (sorted.length - 1);

  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower] ?? 0;
  }

  const weight = index - lower;

  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * weight;
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
