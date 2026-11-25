# Performance — QA staged ramp, 25 Nov 2026

## Scope and limits
- Neon organization plan: Free.
- QA and production compute min/max: 0.25 CU. QA PostgreSQL max_connections: 112. No upgrade, scaling configuration changes, or production load.
- Actual QA workflow: https://github.com/HamzaIbrahim123/baleshhaa-changes/actions/runs/45656910079
- Script: Performance/qa-ramp.mjs; workflow: .github/workflows/performance-qa-ramp.yml.
- 15 new synthetic QA accounts and rooms, provisioned sequentially. All 15 closed afterward. QA accounts and usage records remain. No production data or frontend changes.
- 5, 10, 15 concurrently exercised rooms (10, 20, 30 simulated host/viewer devices). Each stage targeted 18 seconds and elapsed approximately 20 seconds; same polling intervals (host 2.5s, viewer 1.5s). Initial stagger to avoid synchronized bursts; two question-open/color cycles per active room per stage. Stages reused fixtures and stop before ramping if a threshold fails.
- Setup separate from gameplay. No rate limit bypass. Node.js 24 fetch, not k6.

## Results
| Devices | Rooms | Requests | Failed | P50 ms | P95 ms | Max ms | Sync P95 ms | Sync samples |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 5 | 116 | 0 | 158 | 257 | 475 | 1295 | 10 |
| 20 | 10 | 231 | 0 | 158 | 207 | 476 | 1325 | 20 |
| 30 | 15 | 346 | 0 | 157 | 185 | 523 | 1447 | 30 |

693 gameplay requests, all HTTP 200. All 60 measured question observations arrived, no outstanding observations. Aggregate P95 <500 ms, error rate <1%, observation delay P95 <2000 ms passed for all stages. No tested color assignment, revision increment, room mismatch, or unrevealed answer assertion failures. Sync is measured after host API response, not end-to-end click/render latency.

## 30-device endpoint breakdown
| Endpoint | Requests | P50 ms | P95 ms | Max ms |
|---|---:|---:|---:|---:|
| Host polling | 106 | 158 | 445 | 458 |
| Viewer polling | 180 | 155 | 160 | 523 |
| Commands | 60 | 178 | 192 | 476 |

Setup (15 calls each): registration P95 840 ms, create room 586 ms, join 562 ms, no failures. Small samples and sequential setup do not represent a concurrent registration burst.

## Interpretation
All short-stage targets passed. No proof of sustained 30-device capacity, production capacity, or 50/100-device capacity. Later stages may benefit from warm connections; lower measured aggregate latency at higher load does not prove improved scaling. One point-in-time SQL sample had 4 connections, 1 active, 0 lock waiters; no continuous CPU/connection/write telemetry collected. No cost estimate or remaining free-plan allowance verified. No browser/asset or Seen Jeem load test performed. Existing viewer heartbeat writes remain a potential bottleneck, not a demonstrated performance fault.

## Next
Add bounded QA Seen Jeem baseline and duplicate-command/concurrent revision integrity checks; then longer test at 30 devices and gradual 50 devices if resource limits permit. Do not upgrade plan or aim load at production without explicit agreement. Record endpoint metrics and compare with same workload/region/conditions. Consider k6 integration and heartbeat optimization only with measured evidence.
