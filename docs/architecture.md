# Архитектура

## Обзор

Платформа мониторинга инфраструктуры — production-подобный стек мониторинга, собранный из контейнеризованных сервисов.

## Взаимодействие сервисов

```
                    ┌──────────────────────────────────────┐
                    │           infra-net (bridge)          │
                    │                                      │
  Internet ────────▶│  nginx ──▶ api ──┬──▶ postgres      │
                    │   :80      :8000  │     :5432        │
                    │                   ├──▶ redis         │
                    │                   │     :6379        │
                    │                   └──▶ prometheus    │
                    │                         :9090        │
                    │                                      │
                    │  grafana ──▶ prometheus               │
                    │   :3000      :9090                   │
                    │                                      │
                    │  alertmanager ◀── prometheus          │
                    │   :9093                               │
                    │                                      │
                    │  node-exporter ──▶ prometheus        │
                    │   :9100                               │
                    │                                      │
                    │  cadvisor ──▶ prometheus              │
                    │   :8080                               │
                    └──────────────────────────────────────┘
```

## Поток данных

### Пайплайн метрик

1. **Сбор**: Prometheus скрейпит таргеты каждые 15s
2. **Хранение**: Time-series данные пишутся в TSDB Prometheus
3. **Визуализация**: Grafana запрашивает Prometheus для дашбордов
4. **Алертинг**: Prometheus вычисляет правила и отправляет в Alertmanager
5. **Нотификации**: Alertmanager маршрутизирует алерты через webhook/email

### Поток API-запросов

```
Клиент → Nginx (rate limit, security headers) → FastAPI (metrics, logging) → Ответ
                                     ↓
                              Prometheus (метрики запросов)
```

## Архитектурные решения

### Почему Nginx как frontend?

- Проверенный в боях reverse proxy
- Rate limiting на edge защищает API
- Security-заголовки без изменений в приложении
- Точка терминирования TLS (для прода — добавить certbot)

### Почему FastAPI?

- Async-native (эффективно обрабатывает конкурентные соединения)
- Автоматическая генерация OpenAPI-документации
- Типобезопасность через Pydantic
- Встроенная инструментация Prometheus

### Почему структурное логирование?

- Машиночитаемые логи
- Включает агрегацию логов (Loki, ELK)
- Correlation ID между сервисами
- Анализ производительности через структурированные поля

## Сетевая безопасность

- Все сервисы биндятся на `127.0.0.1` кроме внутреннего bridge
- Nginx снаружи открывает только порт 80
- Метрики-эндпоинты ограничены внутренней сетью
- Redis требует аутентификации
- PostgreSQL использует выделенного пользователя с ограниченными правами

## Health-чеки

У каждого контейнера есть health-check:

| Сервис | Проверка | Интервал | Таймаут |
|--------|----------|----------|---------|
| nginx | curl /health | 15s | 5s |
| api | curl /health | 15s | 5s |
| postgres | pg_isready | 10s | 5s |
| redis | redis-cli ping | 10s | 5s |
| prometheus | wget /-/healthy | 15s | 5s |
| grafana | curl /api/health | 15s | 5s |
| alertmanager | wget /-/healthy | 15s | 5s |
| node-exporter | wget /metrics | 15s | 5s |
| cadvisor | wget /healthz | 15s | 5s |

## Масштабирование

Текущая архитектура — single-node. Для масштабирования:

1. **API**: Реплики за nginx upstream
2. **PostgreSQL**: Primary-replica с PgBouncer
3. **Redis**: Sentinel для HA или Redis Cluster
4. **Prometheus**: Thanos для долгого хранения и федерации
5. **Grafana**: HA с shared database backend
