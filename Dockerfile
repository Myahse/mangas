## Render Docker deployment (builds Spring Boot backend)
## - Keeps monorepo simple: Render can build from repo root
## - Runs the Spring Boot executable WAR produced by Spring Boot Maven plugin

FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cache dependencies first
COPY backend/mangafrik/pom.xml backend/mangafrik/pom.xml
WORKDIR /app/backend/mangafrik
RUN mvn -q -DskipTests dependency:go-offline

# Build
WORKDIR /app
COPY backend/mangafrik backend/mangafrik
WORKDIR /app/backend/mangafrik
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/backend/mangafrik/target/*.war /app/app.war

# Render sets PORT; default is 8088 for local Docker runs
ENV PORT=8088
EXPOSE 8088

CMD ["sh", "-c", "java -Dserver.port=${PORT} -jar /app/app.war"]

