# SLOs ولوحات المراقبة والتنبيهات

## 1. أهداف مستوى الخدمة (SLOs) المقترحة

| SLO                  | الهدف                                                | المقياس المستخدم                                                                                |
| -------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Availability**     | 99.5% طلبات ناجحة (2xx) من إجمالي الطلبات            | `rate(palma_http_requests_total{status=~"2.."}[5m]) / rate(palma_http_requests_total[5m])`      |
| **Latency (p95)**    | 95% من الطلبات تنتهي خلال 2 ثانية                    | `histogram_quantile(0.95, rate(palma_http_request_duration_seconds_bucket[5m])) <= 2`           |
| **Error rate**       | أقل من 1% أخطاء (4xx/5xx)                            | `rate(palma_http_errors_total[5m]) / rate(palma_http_requests_total[5m]) < 0.01`                |
| **Rate limit (صحة)** | عدم تجاوز حد معقول من 429 (مثلاً &lt; 5% من الطلبات) | `rate(palma_http_rate_limit_hits_total[5m]) / rate(palma_http_requests_total[5m])` للمراجعة فقط |

---

## 2. استعلامات Grafana المفيدة

- **طلبات/ثانية (كل المسارات):**  
  `sum(rate(palma_http_requests_total[1m])) by (route)`
- **معدل الأخطاء حسب المسار:**  
  `sum(rate(palma_http_errors_total[5m])) by (route, status) / sum(rate(palma_http_requests_total[5m])) by (route)`
- **زمن الاستجابة p50/p95/p99 حسب المسار:**  
  `histogram_quantile(0.95, sum(rate(palma_http_request_duration_seconds_bucket[5m])) by (le, route))`
- **استخدام الذاكرة (RSS):**  
  `palma_process_resident_memory_bytes`
- **استخدام Heap (V8):**  
  `palma_process_heap_used_bytes`
- **عدد تجاوزات حد المعدل (429) حسب route:**  
  `increase(palma_http_rate_limit_hits_total[1h]) by (route)`

---

## 3. لوحة مراقبة مقترحة (Grafana Dashboard)

1. **صف واحد: Availability (نسبة 2xx)**
   - استعلام: `sum(rate(palma_http_requests_total{status=~"2.."}[5m])) / sum(rate(palma_http_requests_total[5m])) * 100`
   - نوع: Stat أو Gauge، عتبة تحذير &lt; 99.5%.

2. **رسم بياني: طلبات/ثانية حسب route**
   - استعلام: `sum(rate(palma_http_requests_total[1m])) by (route)`
   - نوع: Time series.

3. **رسم بياني: زمن الاستجابة p95 حسب route**
   - استعلام: `histogram_quantile(0.95, sum(rate(palma_http_request_duration_seconds_bucket[5m])) by (le, route))`
   - نوع: Time series، وحدة ثوانٍ.

4. **رسم بياني: معدل الأخطاء (4xx/5xx)**
   - استعلام: `sum(rate(palma_http_errors_total[5m])) / sum(rate(palma_http_requests_total[5m])) * 100`
   - نوع: Time series، وحدة %.

5. **جدول: أعلى مسارات من حيث زمن الاستجابة**
   - استعلام: نفس p95 مع تجميع حسب route وترتيب تنازلي.

6. **Stat: استخدام الذاكرة (RSS و Heap)**
   - `palma_process_resident_memory_bytes`, `palma_process_heap_used_bytes`
   - وحدة: bytes.

---

## 4. قواعد التنبيه (Prometheus Alertmanager أو Grafana Alerts)

| اسم التنبيه           | الشرط                                                                                                       | الإجراء المقترح                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **HighErrorRate**     | `sum(rate(palma_http_errors_total[5m])) / sum(rate(palma_http_requests_total[5m])) > 0.05`                  | مراجعة السجلات ومسارات الـ 4xx/5xx  |
| **HighLatencyP95**    | `histogram_quantile(0.95, sum(rate(palma_http_request_duration_seconds_bucket[5m])) by (le)) > 3`           | مراجعة استعلامات DB والموارد        |
| **LowAvailability**   | `sum(rate(palma_http_requests_total{status=~"2.."}[5m])) / sum(rate(palma_http_requests_total[5m])) < 0.99` | فحص صحة الخدمة و/ready و/health     |
| **HighRateLimitHits** | `increase(palma_http_rate_limit_hits_total[15m]) > 100`                                                     | مراجعة إن كان هجوم أو حد معدل ضيق   |
| **HighMemoryRSS**     | `palma_process_resident_memory_bytes > 1.5e9` (1.5 GB)                                                      | مراجعة تسريب ذاكرة أو زيادة الموارد |

---

## 5. تكامل Prometheus

- الـ scrape من نفس الـ job المذكور في `docs/PRODUCTION_SCALING_AND_MONITORING.md` (مثلاً `metrics_path: /metrics`, `scrape_interval: 15s`).
- عند تشغيل أكثر من instance، دمج المقاييس حسب labels (مثلاً `instance`) لرصد كل instance أو المجموع حسب الحاجة.

---

## 6. مراجعة دورية

- مراجعة SLOs شهرياً وتعديل العتبات حسب سلوك الإنتاج.
- ربط التنبيهات بقنوات الإشعار (بريد، Slack، إلخ) حسب بيئة التشغيل.
