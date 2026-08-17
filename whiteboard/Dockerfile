# The Supervisor injects BUILD_FROM per-architecture (see build.yaml).
ARG BUILD_FROM
FROM $BUILD_FROM

RUN apk add --no-cache python3

WORKDIR /app
COPY server.py .
COPY www ./www

CMD ["python3", "-u", "server.py"]
