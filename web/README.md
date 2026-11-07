# AtlasOps dashboard

Next.js dashboard for the [AtlasOps API](../README.md).

```bash
bun install
bun run dev        # http://localhost:3001 (Grafana uses :3000)
bun run lint && bun run typecheck && bun run build
```

Set `NEXT_PUBLIC_API_URL` if the API is not on `http://localhost:8000`.
Services, metrics and incidents are always live; when the API is unreachable
those views are empty and the header shows the connection state.
Architecture and runbooks fall back to a bundled copy
(`src/lib/content.ts`, generated from `api/src/routes`).
