FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["InventoryManager.sln", "./"]
COPY ["src/API/InventoryManager.API.csproj", "src/API/"]
COPY ["src/Application/InventoryManager.Application.csproj", "src/Application/"]
COPY ["src/Domain/InventoryManager.Domain.csproj", "src/Domain/"]
COPY ["src/Infrastructure/InventoryManager.Infrastructure.csproj", "src/Infrastructure/"]

RUN dotnet restore "InventoryManager.sln"

COPY . .

WORKDIR "/src/src/API"
RUN dotnet publish "InventoryManager.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "InventoryManager.API.dll"]