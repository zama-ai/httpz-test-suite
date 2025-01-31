// Custom Mocha reporter to create
// Exporters
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

// NOTE: debug open-telemetry logger
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

// Init resource
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: "e2e-tests",
  // [SemanticResourceAttributes.SERVICE_VERSION]: "some string",
  // [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: "some string",
});

// Init providers
const tracer_provider = new NodeTracerProvider({ resource });
const meter_provider = new MeterProvider({
  resource: resource,
});

// Register
tracer_provider.addSpanProcessor(new BatchSpanProcessor(new OTLPTraceExporter()));
tracer_provider.register();

meter_provider.addMetricReader(
  new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 10,
  }),
);

// Create meters, tracers
const meter = meter_provider.getMeter("mocha-metrics");
const tracer = tracer_provider.getTracer("mocha-traces");

class MochaInstrumentation extends InstrumentationBase {
  constructor(config = {}) {
    super("mocha-instrumentation", "1.0.0", config);
  }

  /**
   * @param {*} mocha - The Mocha instance to instrument
   * @param {*} context - The context to use for instrumentation
   */
  init() {
    let currentSpan = null;

    // Stack to keep track of nested describe blocks
    const spanStack = [];

    // Helper to get the current parent span
    const getCurrentParent = () => spanStack[spanStack.length - 1] || null;

    // Patch describe blocks
    this._wrap(global, "describe", (original) => {
      return function (title, fn) {
        console.log("DESCRIBE");
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
      return function (title, fn) {
        console.log("IT");
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
      return function (title, fn) {
        console.log("BEFORE");
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

const sdk = new NodeSDK({
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
    new MochaInstrumentation(),
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
    // awsEksDetector,
    // awsEc2Detector,
  ],
});

sdk.start();
