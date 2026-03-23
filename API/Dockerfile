# Etapa 1: Build (Utiliza o SDK do .NET 9.0 para compilar o código)
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copia a Solution e os arquivos de projeto primeiro para otimizar o cache do Docker
COPY ["InventoryManager.sln", "./"]
COPY ["src/API/InventoryManager.API.csproj", "src/API/"]
COPY ["src/Application/InventoryManager.Application.csproj", "src/Application/"]
COPY ["src/Domain/InventoryManager.Domain.csproj", "src/Domain/"]
COPY ["src/Infrastructure/InventoryManager.Infrastructure.csproj", "src/Infrastructure/"]

# Restaura as dependências de todos os projetos na Solution
RUN dotnet restore "InventoryManager.sln"

# Copia todo o restante do código da aplicação
COPY . .

# Altera o diretório para o projeto da API e realiza a publicação
WORKDIR "/src/src/API"
RUN dotnet publish "InventoryManager.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Etapa 2: Runtime (Utiliza apenas o ambiente de execução do ASP.NET 9.0 para uma imagem mais leve)
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Opcional: define a porta que a aplicação vai escutar (o padrão no .NET 8+ costuma ser 8080)
EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080

# Copia os arquivos compilados da etapa de build para a imagem final
COPY --from=build /app/publish .

# Define o ponto de entrada da aplicação
ENTRYPOINT ["dotnet", "InventoryManager.API.dll"]