FROM maven:3.9.9-eclipse-temurin-17 AS builder

WORKDIR /build

COPY pom.xml ./
COPY src ./src
COPY db ./db

RUN mvn -B clean package -DskipTests

FROM eclipse-temurin:17-jre-jammy

WORKDIR /app

COPY --from=builder /build/target/*.jar /app/app.jar
COPY --from=builder /build/db/migration /app/db/migration

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
