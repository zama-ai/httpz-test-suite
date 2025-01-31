// Custom Mocha reporter to create

// ############# IMPORTS ###########################
const { BatchSpanProcessor } = require("@opentelemetry/sdk-trace-base");
const { NodeTracerProvider } = require("@opentelemetry/sdk-trace-node");

const { diag, DiagConsoleLogger, DiagLogLevel, trace, context } = require("@opentelemetry/api");
const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-http");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");

const { envDetector, hostDetector, osDetector, processDetector, Resource } = require("@opentelemetry/resources");
const { SemanticResourceAttributes } = require("@opentelemetry/semantic-conventions");

const { NodeSDK } = require("@opentelemetry/sdk-node");

const { MeterProvider, PeriodicExportingMetricReader, ConsoleMetricExporter } = require("@opentelemetry/sdk-metrics");
const { SimpleSpanProcessor, ConsoleSpanExporter } = require("@opentelemetry/sdk-trace-node");

// Auto
const { HttpInstrumentation } = require("@opentelemetry/instrumentation-http");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
// const { awsEc2Detector, awsEksDetector } = require("@opentelemetry/resource-detector-aws");
// const { containerDetector } = require("@opentelemetry/resource-detector-container");

const { registerInstrumentations, InstrumentationBase } = require("@opentelemetry/instrumentation");

// Mocha
const Mocha = require("mocha");

const {
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END,
  EVENT_RUN_BEGIN,
  EVENT_RUN_END,
  EVENT_TEST_BEGIN,
  EVENT_TEST_END,
  EVENT_TEST_PASS,
  EVENT_TEST_FAIL,
} = Mocha.Runner.constants;

// ############# SETUP ###########################

// NOTE: debug open-telemetry logger
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

// Init resource
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: "e2e-tests",
});

// Init providers
const tracer_provider = new NodeTracerProvider({ resource });
const meter_provider = new MeterProvider({
  resource: resource,
});
meter_provider.addMetricReader(
  new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 10,
  }),
);

// Create meters, tracers
const meter = meter_provider.getMeter("mocha-metrics");

// Create counters and histograms
const testCounter = meter.createCounter("test.total", {
  description: "Total number of tests run",
});
const testDurationHistogram = meter.createHistogram("test.duration", {
  description: "Test execution duration",
  unit: "ms",
});
const testResultCounter = meter.createCounter("test.results", {
  description: "Test results by status",
});

// ############# MOCHA REPORTER ###########################

// Create custom Mocha reporter that handles metrics
class OTelReporter {
  constructor(runner) {
    let sdk;
    // const stats = runner.stats;
    runner.on(EVENT_RUN_BEGIN, () => {
      console.log("EVENT_RUN_BEGIN begin");
      sdk = new NodeSDK({
        resource: new Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: "e2e-test-suite",
        }),
        // traceExporter: new OTLPTraceExporter(),
        traceExporter: new ConsoleSpanExporter(),
        instrumentations: [
          getNodeAutoInstrumentations({
            // only instrument fs if it is part of another trace
            "@opentelemetry/instrumentation-fs": {
              requireParentSpan: true,
            },
          }),
          new HttpInstrumentation(),
        ],
        // Use OpenTelemetry metric exporter
        metricReader: new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({ exportIntervalMillis: 10 }),
        }),
        resourceDetectors: [
          envDetector,
          hostDetector,
          osDetector,
          processDetector,
          // containerDetector,
          // awsESETUP,
          // awsEc2Detector,
        ],
      });
      sdk.start().then(()=>{
        console.log("SDK started.");
      })
    });

    runner.on(EVENT_RUN_END, () => {
      console.log("EVENT_RUN_END");
      sdk.shutdown().then(() => {
        console.log("SDK shutdown.");
      });
    });

    runner.on(EVENT_TEST_BEGIN, (test) => {
      console.log("EVENT_TEST_BEGIN");
    });

    runner.on(EVENT_TEST_END, (test) => {
      console.log("EVENT_TEST_END");
      testCounter.add(1);
    });

    runner.on(EVENT_SUITE_BEGIN, (suite) => {
      console.log("EVENT_SUITE_BEGIN");
    });

    runner.on(EVENT_SUITE_END, (suite) => {
      console.log("EVENT_SUITE_END");
    });

    runner.on(EVENT_TEST_PASS, (test) => {
      testResultCounter.add(1, { result: "pass", name: test.title, suite: test.parent.title });
    });

    runner.on(EVENT_TEST_FAIL, (test) => {
      testResultCounter.add(1, { result: "fail", name: test.title, suite: test.parent.title });
    });

    // TODO: figure out if we want the histogram
    // runner.on("test end", (test) => {
    //   console.log();
    //   console.log(stats);
    //   console.log(test);
    //   console.log("$$$$$$$$$$$ END $$$$$$$$$$$$$$$$$$$$");
    //   console.log();
    //   testDurationHistogram.record(test.duration, {
    //     suite: test.parent.title,
    //     test: test.title,
    //   });
    // });
    // runner.on("end", () => {
    //   // Final test suite metrics
    //   meter
    //     .createObservableGauge("test.summary", {
    //       description: "Test suite summary metrics",
    //     })
    //     .addCallback((result) => {
    //       result.observe(stats.passes, { metric: "passes" });
    //       result.observe(stats.failures, { metric: "failures" });
    //       result.observe(stats.pending, { metric: "pending" });
    //       result.observe(stats.duration, { metric: "duration_ms" });
    //     });
    // });
  }
}

module.exports = OTelReporter;
