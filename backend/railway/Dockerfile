# Official stable Suwayomi image, resolved and pinned on 2026-10-12.
FROM ghcr.io/suwayomi/suwayomi-server@sha256:1fac27c387dc2ea9949e1a01ad7f6d6de9d72d3988338a95476748e5c45c4582
USER root
COPY --chmod=755 entrypoint.sh /home/suwayomi/inkrush-start.sh
ENV BIND_IP=0.0.0.0 BIND_PORT=4567 AUTH_MODE=basic_auth \
    KCEF_ENABLED=false WEB_UI_CHANNEL=bundled WEB_UI_UPDATE_INTERVAL=0 \
    UPDATE_INTERVAL=0 MAX_SOURCES_IN_PARALLEL=2 TZ=Asia/Bangkok \
    JAVA_TOOL_OPTIONS="-Xmx512m" \
    EXTENSION_STORES='["https://github.com/keiyoushi/extensions/raw/repo/index.pb"]'
EXPOSE 4567
CMD ["/home/suwayomi/inkrush-start.sh"]
