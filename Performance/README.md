# Baleshhaa Performance — initial QA baseline (2026-11-25)

This is the first measured performance baseline, not a production capacity certification. No production endpoints, UI files, or production database rows were modified.

## Reproducible test
- Script: Performance/qa-baseline.mjs (Node.js 24, built-in fetch; no k6 dependency in this first baseline).
- Workflow: .github/workflows/performance-qa-baseline.yml (manual dispatch available).
- Actual completed run: https://github.com/HamzaIbrahim123/baleshhaa-changes/actions/runs/45656159529
- Target: existing Neon QA branch letters-bundle25-qa (br-late-math-b9m0r7gn).
- 5 isolated test accounts / 5 rooms / 10 simulated devices, one host and one viewer per room.
- Real host/viewer API calls, 2.5 s host polling and 1.5 s viewer polling; 15 question opens and 15 color commands.
- Target duration 20 s; elapsed 22.5 s. Provisioning and room cleanup are outside gameplay timings.
- Verified all five loadqa rooms were abandoned after the run. Test accounts and question usage remain on QA for reproducibility; no production data affected.

## Measured results
| Endpoint | Samples | Failed | p50 ms | p95 ms | Max ms |
|---|---:|---:|---:|---:|---:|
| Gameplay combined | 141 | 0 | 115 | 387 | 858 |
| Host state | 41 | 0 | 115 | 387 | 858 |
| Viewer state | 70 | 0 | 111 | 416 | 731 |
| Room commands | 30 | 0 | 135 | 349 | 524 |
| Register | 5 | 0 | 226 | 1434 | 1434 |
| Create room | 5 | 0 | 129 | 901 | 901 |
| Join room | 5 | 0 | 123 | 356 | 356 |

Viewer observation delay after successful host response: 15 samples, p95/max 1388 ms.
All 141 gameplay requests returned HTTP 200. All setup calls succeeded. No room-code mismatch, exposed answer field, incorrect tested color assignment or revision increment was reported by the assertions.

Initial thresholds passed: aggregate gameplay p95 < 500 ms, unexpected gameplay failure rate < 1%, measured viewer observation p95 < 2000 ms. Setup samples are too few for general conclusions. This is not a browser render or full end-to-end latency measurement; no win/retry race, sustained load, frontend load, or Seen Jeem load test was performed in this run.

## Audit finding
The current roomClient.ts polls viewers every 1500 ms and hosts every 2500 ms. The backend room db.mjs byViewer() updates last_viewer_seen_at in game_rooms on every viewer poll, even without gameplay changes. At higher concurrency, this may cause unnecessary writes and contention with host commands. Relevant indexes and command uniqueness constraints already exist. Investigate with measurement before changing heartbeat frequency or transport. No optimization has been deployed.

## Next steps
1. Confirm QA compute/resource and cost limits, then use a bounded 10–25-room scenario with a longer duration, gradual ramp-up, explicit stop conditions, and endpoint-specific measurements. Avoid registration/join bursts, and respect rate limits.
2. Add k6 scenarios to make repeatable ramp tests and threshold enforcement easier; measure database CPU, connections, and write/lock pressure if telemetry permits.
3. Add Seen Jeem test-mode scenario on QA, and concurrent duplicate-command/revision and confirmed-win integrity checks.
4. Compare results with this baseline before optimizing. Never point load scripts at production by default. Never modify or delete existing player data. New Code Names features should have their own isolated load and confidentiality tests.
