// Require dependencies
const opentelemetry = require("@opentelemetry/api");
const { diag, DiagConsoleLogger, DiagLogLevel } = require("@opentelemetry/api");
const { Resource } = require("@opentelemetry/resources");
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { ConsoleSpanExporter } = require("@opentelemetry/sdk-trace-node");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { PeriodicExportingMetricReader, ConsoleMetricExporter, MeterProvider } = require("@opentelemetry/sdk-metrics");
const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-http");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { ATTR_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");

// https://mochajs.org/#run-cycle-overview

console.log("Before all");
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

// Resource
const resource = Resource.default().merge(
  new Resource({
    [ATTR_SERVICE_NAME]: "e2e-tests",
  }),
);

// Flag to activate Open-Telemetry output to console instead of collector
const otel_console = true;

// Define exporters
let trace_exporter;
let metric_exporter;

if (otel_console) {
  console.log("Exporting to console.");
  trace_exporter = new ConsoleSpanExporter();
  metric_exporter = new ConsoleMetricExporter();
} else {
  console.log("Exporting to OTL.");
  trace_exporter = new OTLPTraceExporter();
  metric_exporter = new OTLPMetricExporter();
}

const metric_reader = new PeriodicExportingMetricReader({
  exporter: new ConsoleMetricExporter(),

  // Default is 60000ms (60 seconds). Set to 10 seconds for demonstrative purposes only.
  exportIntervalMillis: 60000,
});

const myServiceMeterProvider = new MeterProvider({
  resource: resource,
  readers: [metric_reader],
});

// Set this MeterProvider to be global to the app being instrumented.
opentelemetry.metrics.setGlobalMeterProvider(myServiceMeterProvider);

const sdk = new NodeSDK({
  resource: resource,
  traceExporter: trace_exporter,
  metricReader: metric_reader,
  instrumentations: [
    // Automatic Node instrumentation (HTTP, ...)
    // getNodeAutoInstrumentations(),
  ],
});

sdk.start();

console.log("Open-Telemetry SDK Started.");

module.exports = sdk;
