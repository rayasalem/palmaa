# Observability Coverage Summary

**Generated:** Post-refactor improvement pass.

## Prometheus Metrics (GET /metrics)

| Metric                                  | Type      | Description                                          | Status |
| --------------------------------------- | --------- | ---------------------------------------------------- | ------ |
| `palma_http_requests_total`             | counter   | Requests by method, route, status                    | ✅     |
| `palma_http_errors_total`               | counter   | 4xx/5xx by method, route, status                     | ✅     |
| `palma_http_request_duration_seconds_*` | histogram | Latency (buckets, sum, count); p50/p95/p99 derivable | ✅     |
| `palma_http_rate_limit_hits_total`      | counter   | 429 hits by route                                    | ✅     |
| `palma_http_validation_failures_total`  | counter   | 400 validation failures by source                    | ✅     |
| `palma_http_mfa_failures_total`         | counter   | MFA verify/setup failures                            | ✅     |
| `palma_process_resident_memory_bytes`   | gauge     | RSS                                                  | ✅     |
| `palma_process_heap_used_bytes`         | gauge     | V8 heap used                                         | ✅     |
| `palma_process_heap_total_bytes`        | gauge     | V8 heap total                                        | ✅     |
| `palma_process_external_memory_bytes`   | gauge     | External memory                                      | ✅     |
| `palma_process_cpu_user_seconds`        | gauge     | CPU user time                                        | ✅     |
| `palma_process_cpu_system_seconds`      | gauge     | CPU system time                                      | ✅     |

## Logging

| Check                   | Status                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| **requestId**           | Set by `requestIdMiddleware` before limiters; present in `requestLogger`, `errorHandler`, rate-limit handler. |
| **Masked IP**           | `requestLogger` and rate-limit handler use `maskIp(ipRaw)`; no raw IP in logs.                                |
| **sanitizeForLog**      | Implemented in `logger.js`; redacts password, token, secret, authorization, cookie, otp, code, card, apikey.  |
| **Validation failures** | Logged in `validate.js` with requestId, source, message; `recordValidationFailure(source)` for metrics.       |

## Missing / Recommended

- **Dashboards:** Grafana dashboards are not in repo; use queries from `SLO_AND_ALERTS.md` to build them.
- **Alert rules:** Prometheus Alertmanager rules are documented in `SLO_AND_ALERTS.md`; deploy in your monitoring stack.
- **Distributed tracing:** Not implemented; optional for multi-service or deep debugging.
