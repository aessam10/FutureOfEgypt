# FutureOfEgypt Backend Deployment Notes

## Environment

Set:

ASPNETCORE_ENVIRONMENT=Production

## Required environment variables

ConnectionStrings__DefaultConnection=Host=...;Port=5432;Database=...;Username=...;Password=...

Jwt__Key=VERY_LONG_RANDOM_SECRET_KEY
Jwt__Issuer=FutureOfEgypt
Jwt__Audience=FutureOfEgyptUsers
Jwt__ExpiresInMinutes=120
Jwt__RefreshTokenExpiresInDays=30

Bootstrap__FirstAdminPassword=VERY_STRONG_ONE_TIME_PASSWORD

Cors__AllowedOrigins__0=https://dashboard.futureofegypt.com
Cors__AllowAnyOriginInDevelopment=false

## Tracking interval

Flutter app should send location every 60 seconds.

Rate limit:
Tracking PermitLimit = 5 per minute per engineer.

## Database migration

Before running production API:

dotnet ef database update --project FutureOfEgypt.Infrastructure --startup-project FutureOfEgypt

## Health checks

Basic:
GET /health

API:
GET /api/Health

## SignalR hub

/hubs/locations

Admin dashboard connects using access_token.

## First admin

Use:
POST /api/Auth/create-first-admin

Only works if no Admin exists.
After first admin is created, rotate or remove Bootstrap__FirstAdminPassword.

## Production notes

- Do not store real secrets in appsettings.json.
- Use HTTPS only.
- Configure reverse proxy.
- Configure database backups.
- Swagger should remain disabled in production.