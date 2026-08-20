# 운향재 운영 API
# 네이티브 모듈을 쓰지 않는다. 1GB 서버에서 빌드가 무거워지지 않도록
# 순수 JS 의존성(express · multer)만 사용한다.
FROM node:20-alpine

WORKDIR /app

# 의존성 먼저 — 소스만 바뀌면 이 레이어는 재사용된다
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY src ./src

# 데이터와 업로드 이미지는 볼륨으로 마운트한다
ENV DATA_DIR=/data
ENV PORT=8090

EXPOSE 8090

# 컨테이너 내부에서는 비루트로 실행한다
RUN mkdir -p /data && chown -R node:node /data /app
USER node

CMD ["node", "src/index.js"]
