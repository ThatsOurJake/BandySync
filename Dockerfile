FROM node:18-alpine AS build

WORKDIR /build
COPY src ./src
COPY tsconfig.json package.json yarn.lock ./
RUN yarn install --frozen-lock
RUN yarn build

FROM node:18-alpine AS prod_modules
WORKDIR /prod_modules
COPY package.json yarn.lock ./
RUN yarn --frozen-lock --production=true

FROM node:18-alpine
ENV NODE_ENV=production
EXPOSE 3000
WORKDIR /app
COPY --from=build /build/dist ./dist
COPY --from=prod_modules /prod_modules/node_modules ./node_modules
COPY --from=prod_modules /prod_modules/package.json .
ENTRYPOINT [ "yarn", "start" ]
