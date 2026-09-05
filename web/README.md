# AtlasOps Dashboard (фронтенд)

Веб-дашборд для платформы мониторинга инфраструктуры AtlasOps.
Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui + framer-motion + Recharts.

## Что это

UI-слой поверх FastAPI API (`../api/`), который позволяет:

- Видеть live-статус каждого сервиса и метрики
- Изучать архитектуру через интерактивную схему
- Читать журнал инцидентов и операционный runbook
- Дёргать API-эндпоинты через интерактивный проводник
- Смотреть анимированное демо типичных CLI-операций

## Запуск

```bash
cd web
npm install
npm run dev          # http://localhost:3000
```

По умолчанию фронтенд ходит на `http://localhost:8000` (где живёт FastAPI из `../docker-compose.yml`). Чтобы указать другой URL:

```bash
NEXT_PUBLIC_API_URL=http://my-api.local:8000 npm run dev
```

### Demo-режим

Если FastAPI-бэкенд не запущен, UI не падает — он переключается на мок-данные из `src/lib/mock-data.ts`. В шапке при этом виден бейдж `demo` вместо `live`. Удобно для демо на портфолио без поднятия Docker.

## Структура

```
src/
├── app/
│   ├── layout.tsx          # корневой layout, тёмная тема
│   ├── page.tsx            # главная страница: sidebar + роутер секций
│   └── globals.css         # Tailwind + кастомные стили (terminal, glow, scanlines)
├── components/
│   ├── atlas/              # переиспользуемые атомы
│   │   ├── status-dot.tsx
│   │   ├── status-badge.tsx
│   │   ├── code-block.tsx
│   │   └── kpi-card.tsx
│   └── sections/           # семь секций навигации
│       ├── dashboard-section.tsx      # KPI, графики, активные инциденты
│       ├── architecture-section.tsx   # интерактивная схема сервисов
│       ├── services-section.tsx       # таблица + карточки сервисов
│       ├── incidents-section.tsx      # таймлайн с фильтрами
│       ├── runbook-section.tsx        # операционные процедуры
│       ├── api-section.tsx            # проводник по API
│       └── cli-section.tsx            # анимированный терминал
└── lib/
    ├── types.ts            # общий контракт с бэкендом
    ├── api.ts              # fetcher с fallback на мок
    ├── mock-data.ts        # зеркальные моки для demo-режима
    └── format.ts           # утилиты форматирования
```

## Синхронизация с бэкендом

Контракт типов живёт в `src/lib/types.ts`. Он должен соответствовать Pydantic-схемам в `../api/src/routes/*.py`. Если на бэкене меняется форма ответа — обновляем и типы, и мок-данные, чтобы UI и API не разъезжались.

## Технологии

| Технология | Зачем |
|------------|-------|
| Next.js 16 | App Router, RSC, быстрый refresh |
| TypeScript 5 | строгая типизация контракта с API |
| Tailwind CSS 4 | стилизация без CSS-in-JS |
| shadcn/ui | готовые Radix-компоненты |
| framer-motion | переходы между секциями и пульсирующие точки |
| Recharts | live-графики метрик |
| lucide-react | иконки |
