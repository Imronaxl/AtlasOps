# Руководство по деплою

## Требования

- Docker Engine 24.0+
- Docker Compose v2.20+
- bash 5.0+
- curl, gzip

## Быстрый старт

```bash
git clone https://github.com/ImronAXL/AtlasOps.git
cd AtlasOps
cp .env.example .env
nano .env

make up
make healthcheck
```

## Конфигурация окружения

Скопировать `.env.example` в `.env` и настроить:

| Переменная | Описание | Значение по умолчанию |
|-----------|----------|------------------------|
| POSTGRES_USER | Пользователь БД | infra_admin |
| POSTGRES_PASSWORD | Пароль БД | (обязательно) |
| POSTGRES_DB | Имя БД | infra_monitor |
| REDIS_PASSWORD | Пароль Redis | (обязательно) |
| GF_SECURITY_ADMIN_USER | Админ Grafana | admin |
| GF_SECURITY_ADMIN_PASSWORD | Пароль админа Grafana | (обязательно) |

## Способы деплоя

### Способ 1: Makefile (рекомендуется)

```bash
make up
make down
make restart
make status
make logs
make healthcheck
```

### Способ 2: Деплой-скрипт (zero-downtime)

```bash
./scripts/deploy.sh
```

Возможности:
- Pre-flight валидация
- Pull и сборка образов
- Rolling-деплой
- Проверка health-check
- Автоматическая очистка

### Способ 3: Docker Compose

```bash
docker compose up -d
docker compose ps
docker compose logs -f
```

## Бэкап и восстановление

### Бэкап PostgreSQL

```bash
make backup

./scripts/backup.sh
```

Бэкапы хранятся в `${BACKUP_DIR:-/opt/backups/infra-monitor}`

### Восстановление PostgreSQL

```bash
./scripts/restore.sh

./scripts/restore.sh /opt/backups/infra-monitor/backup_20240101_120000.sql.gz
```

## Управление логами

### Ротация логов

```bash
make rotate-logs
```

Возможности:
- Обрезает превышающие размер логи контейнеров (>50MB)
- Удаляет старые файлы логов (>30 дней)
- Отчитывается о текущих размерах логов

### Следование за логами

```bash
make logs
make logs-api
make logs-prometheus
```

## Очистка

### Безопасная очистка (сначала dry-run)

```bash
./scripts/cleanup.sh --dry-run
./scripts/cleanup.sh
```

### Полная очистка (удаляет всё)

```bash
make nuke
```

## Health-чеки

```bash
make healthcheck
```

Проверяет:
- Статус здоровья контейнеров
- Ответы HTTP-эндпоинтов
- Использование диска
- Использование памяти

## Установка через systemd

```bash
sudo cp systemd/infra-monitor.service /etc/systemd/system/

sudo mkdir -p /opt/infra-monitor
sudo cp -r . /opt/infra-monitor/
sudo cp .env.example /opt/infra-monitor/.env
sudo nano /opt/infra-monitor/.env

sudo systemctl daemon-reload
sudo systemctl enable infra-monitor
sudo systemctl start infra-monitor

sudo systemctl status infra-monitor
```

## Траблшутинг

### Контейнер не запускается

```bash
docker compose logs <service-name>
docker inspect <container-name>
```

### Порт уже занят

```bash
sudo lsof -i :<port>
```

### Permission denied

```bash
chmod +x scripts/*.sh

docker compose down -v
docker compose up -d
```

### Закончилось место на диске

```bash
./scripts/cleanup.sh
docker system prune -a
```
