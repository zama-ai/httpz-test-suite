// Require dependencies
const opentelemetry = require("@opentelemetry/api");
const { Resource } = require("@opentelemetry/resources");
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { ConsoleSpanExporter } = require("@opentelemetry/sdk-trace-node");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { PeriodicExportingMetricReader, ConsoleMetricExporter, MeterProvider } = require("@opentelemetry/sdk-metrics");
// Using HTTP OTLP exporter implies that we target port 4318 (port 4317 is gRPC by default)
const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-http");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { ATTR_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");
const { diag, DiagConsoleLogger, DiagLogLevel, trace, context } = require("@opentelemetry/api");
const { InstrumentationBase } = require("@opentelemetry/instrumentation");

// https://mochajs.org/#run-cycle-overview

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

// FIXME: This doesn't work
class MochaInstrumentation extends InstrumentationBase {
  constructor(config = {}) {
    super("mocha-instrumentation", version, config);
  }

  /**
   * @param {*} mocha - The Mocha instance to instrument
   * @param {*} context - The context to use for instrumentation
   */
  init() {
    console.log("Init mocha instrumentation");
    const tracer = trace.getTracer("mocha-tests");
    let currentSpan = null;

    // Stack to keep track of nested describe blocks
    const spanStack = [];

    // Helper to get the current parent span
    const getCurrentParent = () => spanStack[spanStack.length - 1] || null;

    // Patch describe blocks
    this._wrap(global, "describe", (original) => {
      console.log("describe instrumentation");
      return function (title, fn) {
        const parentSpan = getCurrentParent();
        const ctx = parentSpan ? trace.setSpan(context.active(), parentSpan) : context.active();

        const span = tracer.startSpan(
          `describe: ${title}`,
          {
            attributes: {
              "test.suite": title,
              "test.type": "suite",
            },
          },
          ctx,
        );

        spanStack.push(span);

        try {
          return original.call(this, title, function () {
            return context.with(trace.setSpan(context.active(), span), () => {
              return fn.call(this);
            });
          });
        } finally {
          spanStack.pop();
          span.end();
        }
      };
    });

    // Patch it blocks
    this._wrap(global, "it", (original) => {
      console.log("it instrumentation");
      return function (title, fn) {
        if (!fn) return original.call(this, title);

        const parentSpan = getCurrentParent();
        const ctx = parentSpan ? trace.setSpan(context.active(), parentSpan) : context.active();

        const span = tracer.startSpan(
          `test: ${title}`,
          {
            attributes: {
              "test.case": title,
              "test.type": "test",
            },
          },
          ctx,
        );

        currentSpan = span;

        const wrappedFn = async function () {
          try {
            const result = await fn.call(this);
            span.setStatus({ code: 0 }); // SUCCESS
            return result;
          } catch (error) {
            span.setStatus({
              code: 1, // ERROR
              message: error.message,
            });
            span.recordException(error);
            throw error;
          } finally {
            span.end();
            currentSpan = null;
          }
        };

        return original.call(this, title, wrappedFn);
      };
    });

    // Patch before hooks
    this._wrap(global, "before", (original) => {
      console.log("before instrumentation");
      return function (title, fn) {
        if (typeof title === "function") {
          fn = title;
          title = "before all";
        }

        const parentSpan = getCurrentParent();
        const ctx = parentSpan ? trace.setSpan(context.active(), parentSpan) : context.active();

        const span = tracer.startSpan(
          `hook: ${title}`,
          {
            attributes: {
              "test.hook": title,
              "test.type": "hook",
            },
          },
          ctx,
        );

        const wrappedFn = async function () {
          try {
            const result = await fn.call(this);
            span.setStatus({ code: 0 }); // SUCCESS
            return result;
          } catch (error) {
            span.setStatus({
              code: 1, // ERROR
              message: error.message,
            });
            span.recordException(error);
            throw error;
          } finally {
            span.end();
          }
        };

        return original.call(this, wrappedFn);
      };
    });
  }

  _wrap(obj, methodName, wrapper) {
    if (!obj || !obj[methodName]) return;

    const original = obj[methodName];
    obj[methodName] = wrapper(original);

    // Preserve function properties
    Object.assign(obj[methodName], original);
  }
}

// Resource
const resource = Resource.default().merge(
  new Resource({
    [ATTR_SERVICE_NAME]: "e2e-tests",
  }),
);

// Flag to activate Open-Telemetry output to console instead of otel-collector
let otel_console = false;
if (process.env.OTEL_TARGET == "CONSOLE") {
  otel_console = true;
}

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
  exporter: metric_exporter,

  // Default is 60000ms (60 seconds). Set to 10 seconds for demonstrative purposes only.
  exportIntervalMillis: 60000,
});

const myServiceMeterProvider = new MeterProvider({
  resource: resource,
  readers: [metric_reader],
});

// Set this MeterProvider to be global to the app being instrumented.
opentelemetry.metrics.setGlobalMeterProvider(myServiceMeterProvider);

// NOTE: maybe we could set multiple exporters using:
// https://github.com/open-telemetry/opentelemetry-js/issues/4881
const sdk = new NodeSDK({
  resource: resource,
  traceExporter: trace_exporter,
  metricReader: metric_reader,
  instrumentations: [
    // Automatic Node instrumentation (HTTP, ...)
    getNodeAutoInstrumentations(),
    new MochaInstrumentation(),
  ],
});

sdk.start();

console.log("Open-Telemetry SDK Started.");

module.exports = sdk;
