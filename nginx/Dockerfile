FROM nginx:1.27-alpine

RUN rm /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=10s \
    CMD wget --spider -q http://localhost:80/health || exit 1
