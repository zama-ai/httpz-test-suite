// Custom Mocha reporter to create
const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-http");
const { MeterProvider } = require("@opentelemetry/sdk-metrics");
const { Resource } = require("@opentelemetry/resources");
const { SemanticResourceAttributes } = require("@opentelemetry/semantic-conventions");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { HttpInstrumentation } = require("@opentelemetry/instrumentation-http");

const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
// const { awsEc2Detector, awsEksDetector } = require("@opentelemetry/resource-detector-aws");
// const { containerDetector } = require("@opentelemetry/resource-detector-container");
const { envDetector, hostDetector, osDetector, processDetector } = require("@opentelemetry/resources");
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { PeriodicExportingMetricReader, ConsoleMetricExporter } = require("@opentelemetry/sdk-metrics");
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
const { diag, DiagConsoleLogger, DiagLogLevel, trace } = require("@opentelemetry/api");
const { SimpleSpanProcessor, ConsoleSpanExporter } = require("@opentelemetry/sdk-trace-node");

// NOTE: debug open-telemetry logger
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

const sdk = new NodeSDK({
  // Name of the service
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "e2e-test-suite",
  }),
  // spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())],
  // Use OpenTelemetry trace exporter
  traceExporter: new OTLPTraceExporter(),
  //   {
  //   url: "http://localhost:4318", // Add your actual endpoint
  //   headers: {}, // Add any headers if needed
  // }
  instrumentations: [
    getNodeAutoInstrumentations({
      // only instrument fs if it is part of another trace
      "@opentelemetry/instrumentation-fs": {
        requireParentSpan: true,
      },
    }),
    new HttpInstrumentation({ requireParentSpan: true }),
  ],
  // Use OpenTelemetry metric exporter
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
  }),
  resourceDetectors: [
    envDetector,
    hostDetector,
    osDetector,
    processDetector,
    // containerDetector,
    // awsEksDetector,
    // awsEc2Detector,
  ],
});
sdk.start();

// Initialize OpenTelemetry Metrics
const meterProvider = new MeterProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "mocha-test-suite",
  }),
});
meterProvider.addMetricReader(
  new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 10,
  }),
);

// Create meters for test metrics
const meter = meterProvider.getMeter("mocha-metrics");

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
const tracer = trace.getTracer("my-application", "0.1.0");
const tracing = true;

// Create custom Mocha reporter
class OTelReporter {
  constructor(runner) {
    const stats = runner.stats;
    this.tests = new Map();
    this.suites = new Map();

    runner.on(EVENT_TEST_BEGIN, (test) => {
      console.log("EVENT_RUN_BEGIN");
      console.log(EVENT_RUN_BEGIN);
      if (tracing) {
        const span = tracer.startSpan("test.execution", {
          attributes: {
            "test.name": test.title,
            "test.suite": test.parent.title,
            "test.framework": "mocha",
          },
        });
        // NOTE: DEBUG
        const activeSpan = trace.getActiveSpan();
        console.log("Active span:", activeSpan);

        this.tests.set(test, { test: test, span: span });
      }

      console.log("EVENT_TEST_BEGIN");
      console.log(test);
      console.log(this.tests);
      console.log();
    });

    runner.on(EVENT_TEST_END, (test) => {
      if (tracing) {
        console.log(this.tests.get(test));
        console.log("CLOSING SPAN");
        console.log(this.tests.get(test).span);
        this.tests.get(test).span.end();
      }
      // NOTE: maybe clean-up the test here
      console.log("EVENT_TEST_END");
      console.log(test);
      console.log(this.tests);
      console.log();
    });

    runner.on(EVENT_SUITE_BEGIN, (suite) => {
      if (tracing) {
        const span = tracer.startSpan("test.execution", {
          attributes: {
            "suite.name": suite.title,
            "test.framework": "mocha",
          },
        });
        // NOTE: DEBUG
        const activeSpan = trace.getActiveSpan();
        console.log("Active span:", activeSpan);

        this.suites.set(suite, { test: suite, span: span });
      }
      console.log("EVENT_SUITE_BEGIN");
      console.log(suite);
      console.log();
    });

    runner.on(EVENT_SUITE_END, (suite) => {
      if (tracing) {
        console.log(this.suites.get(suite));
        console.log("CLOSING SPAN");
        console.log(this.suites.get(suite).span);
        this.suites.get(suite).span.end();
      }

      console.log("EVENT_SUITE_END");
      console.log(suite);
      console.log();
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
