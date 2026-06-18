using FutureOfEgypt.Application.Features.Chat;

namespace FutureOfEgypt
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddControllers()
                .ConfigureApiBehaviorOptions(options =>
                {
                    options.InvalidModelStateResponseFactory = context =>
                    {
                        var errors = context.ModelState
                            .Where(x => x.Value?.Errors.Count > 0)
                            .ToDictionary(
                                x => x.Key,
                                x => x.Value!.Errors
                                    .Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage)
                                        ? "Invalid value."
                                        : e.ErrorMessage)
                                    .ToArray());

                        var response = new ApiErrorResponse
                        {
                            Message = "Validation failed.",
                            TraceId = context.HttpContext.TraceIdentifier,
                            Errors = errors
                        };

                        return new BadRequestObjectResult(response);
                    };
                });
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("Frontend", policy =>
                {
                    var allowAnyOriginInDevelopment = builder.Configuration
                        .GetValue<bool>("Cors:AllowAnyOriginInDevelopment");

                    var allowedOrigins = builder.Configuration
                        .GetSection("Cors:AllowedOrigins")
                        .Get<string[]>() ?? Array.Empty<string>();

                    if (builder.Environment.IsDevelopment() && allowAnyOriginInDevelopment)
                    {
                        policy
                            .SetIsOriginAllowed(_ => true)
                            .AllowAnyHeader()
                            .AllowAnyMethod()
                            .AllowCredentials();

                        return;
                    }

                    policy
                        .WithOrigins(allowedOrigins)
                        .AllowAnyHeader()
                        .AllowAnyMethod()
                        .AllowCredentials();
                });
            });
            builder.Services.AddSignalR();
            builder.Services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

                options.AddPolicy("AuthPolicy", httpContext =>
                {
                    var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString()
                                    ?? "unknown-ip";

                    var permitLimit = builder.Configuration
                        .GetValue<int?>("RateLimits:Auth:PermitLimit") ?? 10;

                    var windowInMinutes = builder.Configuration
                        .GetValue<int?>("RateLimits:Auth:WindowInMinutes") ?? 1;

                    return RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: ipAddress,
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = permitLimit,
                            Window = TimeSpan.FromMinutes(windowInMinutes),
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                            QueueLimit = 0
                        });
                });

                options.AddPolicy("TrackingPolicy", httpContext =>
                {
                    var engineerPublicId = httpContext.User.FindFirstValue("engineerPublicId");

                    var partitionKey = !string.IsNullOrWhiteSpace(engineerPublicId)
                        ? engineerPublicId
                        : httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown-tracking-client";

                    var permitLimit = builder.Configuration
                        .GetValue<int?>("RateLimits:Tracking:PermitLimit") ?? 5;

                    var windowInMinutes = builder.Configuration
                        .GetValue<int?>("RateLimits:Tracking:WindowInMinutes") ?? 1;

                    return RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: partitionKey,
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = permitLimit,
                            Window = TimeSpan.FromMinutes(windowInMinutes),
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                            QueueLimit = 0
                        });
                });
            });
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(options =>
            {
                options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header,
                    Description = "Enter JWT token only."
                });
            });
            var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

            if (string.IsNullOrWhiteSpace(connectionString))
                throw new InvalidOperationException("Default connection string is missing.");

            builder.Services.AddDbContext<AppDbContext>(options =>
            {
                options.UseNpgsql(connectionString);
            });
            builder.Services.AddScoped<ITrackingService, TrackingService>();
            builder.Services.AddScoped<IEngineerService, EngineerService>(); 
            builder.Services.AddScoped<IDeviceService, DeviceService>();
            builder.Services.AddScoped<IEngineerDeviceService, EngineerDeviceService>();
            builder.Services.AddScoped<IAuthService, AuthService>();
            builder.Services.AddScoped<IDeviceAccessRequestService, DeviceAccessRequestService>();
            builder.Services.AddScoped<IDashboardService, DashboardService>();
            builder.Services.AddScoped<ILocationNotifier, SignalRLocationNotifier>();
            builder.Services.AddScoped<IAuditLogService, AuditLogService>();
            builder.Services.AddScoped<IChatService, ChatService>();
            builder.Services.AddScoped<IChatRealtimeNotifier, SignalRChatRealtimeNotifier>();
            builder.Services.AddIdentity<ApplicationUser, ApplicationRole>().AddEntityFrameworkStores<AppDbContext>().AddDefaultTokenProviders();
            var jwtKey = builder.Configuration["Jwt:Key"];

            if (string.IsNullOrWhiteSpace(jwtKey))
            {
                throw new InvalidOperationException("JWT key is missing.");
            }
            builder.Services
                .AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
                })
                .AddJwtBearer(options =>
                {
                    options.RequireHttpsMetadata = false;

                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidIssuer = builder.Configuration["Jwt:Issuer"],

                        ValidateAudience = true,
                        ValidAudience = builder.Configuration["Jwt:Audience"],

                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = new SymmetricSecurityKey(
                            Encoding.UTF8.GetBytes(jwtKey)),

                        ValidateLifetime = true,
                        ClockSkew = TimeSpan.FromMinutes(1),

                        RoleClaimType = ClaimTypes.Role
                    };

                    options.Events = new JwtBearerEvents
                    {
                        OnMessageReceived = context =>
                        {
                            var accessToken = context.Request.Query["access_token"];

                            var path = context.HttpContext.Request.Path;

                            if (!string.IsNullOrEmpty(accessToken) &&
                                (path.StartsWithSegments("/hubs/locations") ||
                                 path.StartsWithSegments("/hubs/chat")))
                            {
                                context.Token = accessToken;
                            }

                            return Task.CompletedTask;
                        }
                    };
                });
            builder.Services.AddHealthChecks()
                .AddNpgSql(
                    builder.Configuration.GetConnectionString("DefaultConnection")
                    ?? throw new InvalidOperationException("Default connection string is missing."),
                    name: "postgresql");
            var app = builder.Build();
            if (!app.Environment.IsDevelopment())
            {
                app.UseForwardedHeaders(new ForwardedHeadersOptions
                {
                    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
                });
            }
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();   
                app.UseSwaggerUI();
            }

            app.UseGlobalExceptionHandling();

            app.UseRequestLogging();

            app.UseHttpsRedirection();

            app.UseCors("Frontend");

            app.UseAuthentication();

            app.UseRateLimiter();

            app.UseAuthorization();

            app.MapControllers();

            app.MapHub<LocationHub>("/hubs/locations");

            app.MapHub<ChatHub>("/hubs/chat");

            app.MapHealthChecks("/health");

            app.Run();
        }
    }
}