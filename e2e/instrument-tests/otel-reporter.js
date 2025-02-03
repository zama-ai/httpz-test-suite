// Custom Mocha reporter to create

// ############# IMPORTS ###########################
const opentelemetry = require("@opentelemetry/api");
const { NodeTracerProvider } = require("@opentelemetry/sdk-trace-node");
const { ProxyTracerProvider } = require("@opentelemetry/api");

// Mocha
const Mocha = require("mocha");

// readonly EVENT_HOOK_BEGIN: "hook";
// readonly EVENT_HOOK_END: "hook end";
// readonly EVENT_RUN_BEGIN: "start";
// readonly EVENT_DELAY_BEGIN: "waiting";
// readonly EVENT_DELAY_END: "ready";
// readonly EVENT_RUN_END: "end";
// readonly EVENT_SUITE_BEGIN: "suite";
// readonly EVENT_SUITE_END: "suite end";
// readonly EVENT_TEST_BEGIN: "test";
// readonly EVENT_TEST_END: "test end";
// readonly EVENT_TEST_FAIL: "fail";
// readonly EVENT_TEST_PASS: "pass";
// readonly EVENT_TEST_PENDING: "pending";
// readonly EVENT_TEST_RETRY: "retry";
// readonly STATE_IDLE: "idle";
// readonly STATE_RUNNING: "running";
// readonly STATE_STOPPED: "stopped";

const {
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END,
  EVENT_RUN_BEGIN,
  EVENT_RUN_END,
  EVENT_TEST_BEGIN,
  EVENT_TEST_PASS,
  EVENT_TEST_FAIL,
  STATE_STOPPED,
} = Mocha.Runner.constants;

const version = "0.1.0";

// RUN -> SUITE -> TEST
// Create custom Mocha reporter that handles metrics

class OTelReporter {
  constructor(runner) {
    // Mocha runner statistics
    const stats = runner.stats;

    // NOTE: in theory the following script should be set as a `--require`
    // but for the way Hardhat leverages Mocha makes it so that required
    // scripts are not actually called.
    // https://github.com/mochajs/mocha/issues/5006
    const sdk = require("./otel-setup.js");

    // Init meter and tracer
    const name = "mocha-reporter";
    const meter = opentelemetry.metrics.getMeter(name, version);
    const tracer = opentelemetry.trace.getTracer(name, version);

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

    let run_span = null;
    // TODO: Insert here the instrumentation of Mocha functions

    // Run
    runner.on(EVENT_RUN_BEGIN, () => {
      console.log("EVENT_RUN_BEGIN");
      const active_ctx = opentelemetry.context.active();
      // const active_span = opentelemetry.trace.getSpan(ctx);
      // const ctx = opentelemetry.trace.setSpan(active_ctx, active_span);
      run_span = tracer.startSpan("run-span", undefined, active_ctx);
      console.log("run span begin");
    });

    runner.on(EVENT_RUN_END, () => {
      console.log("EVENT_RUN_END");
      // Setup summary Gauge
      meter
        .createObservableGauge("test.summary", {
          description: "Test suite summary metrics",
        })
        .addCallback((result) => {
          result.observe(stats.passes, { metric: "passes" });
          result.observe(stats.failures, { metric: "failures" });
          result.observe(stats.pending, { metric: "pending" });
          result.observe(stats.duration, { metric: "duration_ms" });
        });

      if (run_span) {
        console.log("run span end");
        run_span.end();
      }

      console.debug("Flushing everything.");
      // Flush everything
      // Indeed since we are not a permanently running server we need to make sure
      // that metrics and traces are pushed properly.
      const meter_provider = opentelemetry.metrics.getMeterProvider();
      meter_provider.forceFlush();

      // NOTE: tracer_provider doesn't provide a `forceFlush` API
      // per https://github.com/open-telemetry/opentelemetry-js/issues/3310
      // even though included in the spec: https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/trace/sdk.md#forceflush
      const tracer_provider = opentelemetry.trace.getTracerProvider();

      if (tracer_provider instanceof NodeTracerProvider) {
        tracer_provider.shutdown();
      } else {
        if (tracer_provider instanceof ProxyTracerProvider) {
          const delegateProvider = tracer_provider.getDelegate();
          if (delegateProvider instanceof NodeTracerProvider) {
            delegateProvider.shutdown();
          } else {
            console.error("Delegate provider couldn't be manually shutdown.");
            console.error(delegateProvider);
          }
        } else {
          console.error("Trace provider couldn't be manually shutdown.");
          console.error(tracer_provider);
        }
      }
      sdk.shutdown().then(
        () => console.log("Telemetry shut down successfully"),
        () => console.error("Telemetry shut down failed"),
      );
    });
    // Suite
    runner.on(EVENT_SUITE_BEGIN, (suite) => {
      console.log("EVENT_SUITE_BEGIN");
      console.log(suite);
    });

    runner.on(EVENT_SUITE_END, (suite) => {
      console.log("EVENT_SUITE_END");
      console.log(suite);
    });

    // Test
    runner.on(EVENT_TEST_BEGIN, (test) => {
      console.log("EVENT_TEST_BEGIN");
      console.log(test);
    });

    runner.on(EVENT_TEST_PASS, (test) => {
      console.log("EVENT_TEST_PASS");
      console.log(test);

      if (run_span) {
        run_span.addEvent("test passed", {
          result: "pass",
          name: test.title,
          suite: test.parent.title,
          duration: test.duration,
        });
      }
      testResultCounter.add(1, { result: "pass", name: test.title, suite: test.parent.title });
      testDurationHistogram.record(test.duration, {
        suite: test.parent.title,
        test: test.title,
      });
      testCounter.add(1);
    });

    runner.on(EVENT_TEST_FAIL, (test) => {
      console.log("EVENT_TEST_FAIL");
      console.log(test);
      testResultCounter.add(1, { result: "fail", name: test.title, suite: test.parent.title });
      testCounter.add(1);
    });
    // NOTE: it looks like TEST_END is never actually called.
  }
}

module.exports = OTelReporter;
