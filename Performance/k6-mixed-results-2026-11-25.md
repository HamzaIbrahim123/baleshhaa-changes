# Performance — first k6 run, Seen Jeem and mixed workload (2026-11-25)

## Verified run
- [GitHub Actions run 45658243171](https://github.com/HamzaIbrahim123/baleshhaa-changes/actions/runs/45658243171) — success.
- Script: Performance/k6-mixed-qa.js. Workflow: .github/workflows/performance-k6-mixed.yml. Grafana k6 1.2.3, executed on GitHub-hosted runner.
- Targets pinned to Neon QA branch br-late-math-b9m0r7gn. No production traffic, deployment, subscription or compute changes.
- Phase 1: 10 simultaneous Seen Jeem sessions, 4 categories and 4 question open/reveal cycles each, save score and finish. Phase 2: 10 Seen Jeem sessions plus 5 Letters host and 5 viewer sessions (20 devices), hosts polling every ~2.5 s and viewers every ~1.5 s, 2 question/color cycles per room. Each scenario capped at 38 s; mixed phase starts at 42 s. First phase aborts if the latency or error threshold fails. No test tokens or response bodies in logs.
- The 15 QA accounts were created sequentially. Seen Jeem uses normal 4-category match mode on QA only, not a synthetic endpoint. Test matches/usage and accounts remain in QA. Cleanup closed all 5 rooms, and confirmed all 10 Seen Jeem accounts had no active match.

## Results (milliseconds)
| Phase | Devices | Gameplay HTTP requests | Failed | P50 | P95 | Max |
|---|---:|---:|---:|---:|---:|---:|
| Seen Jeem only | 10 | 130 | 0 | 171.18 | 264.02 | 542.57 |
| Both games | 20 | 310 | 0 | 163.43 | 179.61 | 415.17 |
| Combined | — | 440 | 0 | 165.49 | 203.56 | 542.57 |

500 total HTTP requests including 60 setup and cleanup calls, zero HTTP failures. All 30 planned scenario iterations completed, zero dropped iterations, zero integrity failures. All thresholds passed: phase P95 <500 ms, HTTP failure rate <1%, expected participant counts, and zero integrity/dropped iteration counters.

## Independent database verification
20 finished Seen Jeem matches, 80 opened questions, zero active Seen Jeem matches, 5 abandoned (closed) Letters rooms, zero active Letters rooms for the k6qa synthetic account cohort. Point-in-time mixed-load SQL snapshot: 8 client connections, 0 other active SQL queries, 0 lock waiters; this is not sustained telemetry.

## Interpretation and limits
This supports starting development of the next game; it is not certification of production capacity. Short phases, only 20 mixed devices, no browser rendering or asset timings, no sustained CPU/compute-cost measurements, no exact host-to-viewer synchronization measurement in this run (viewer observed an update and nondecreasing revisions only), and no full 24-question match or concurrent same-cell retry test. Later-phase lower latency may reflect warming. Prior Node.js Letters-only ramp (30 devices) is separate and not directly comparable. Larger load tests (50/100 devices), soak tests, and duplicate/concurrent command checks remain future work. Reuse the QA-only workflow manually before significant releases; do not target production or change plan automatically.
