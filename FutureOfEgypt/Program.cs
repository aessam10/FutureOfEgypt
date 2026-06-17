using FutureOfEgypt.Application.Features.AuditLog;
using FutureOfEgypt.Application.Features.Auth;
using FutureOfEgypt.Application.Features.Dashboard;
using FutureOfEgypt.Application.Features.DeviceAccessRequests;
using FutureOfEgypt.Application.Features.Devices;
using FutureOfEgypt.Application.Features.EngineerDevices;
using FutureOfEgypt.Application.Features.Engineers;
using FutureOfEgypt.Application.Features.Tracking;
using FutureOfEgypt.Hubs;
using FutureOfEgypt.Infrastructure.Identity;
using FutureOfEgypt.Infrastructure.Persistence;
using FutureOfEgypt.Infrastructure.Services;
using FutureOfEgypt.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using System.Security.Claims;
using System.Text;

namespace FutureOfEgypt
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddControllers();
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("LocalFrontend", policy =>
                {
                    policy
                        .SetIsOriginAllowed(_ => true) // Development only
                        .AllowAnyHeader()
                        .AllowAnyMethod()
                        .AllowCredentials();
                    /*
                     .WithOrigins(
    "https://dashboard.futureofegypt.com",
    "https://admin.futureofegypt.com"
)
.AllowAnyHeader()
.AllowAnyMethod()
.AllowCredentials();
                     */

                });
            });
            builder.Services.AddSignalR();
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
                    Description = "Enter JWT token only. Do not write Bearer manually."
                });
            });
            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

            builder.Services.AddScoped<ITrackingService, TrackingService>();
            builder.Services.AddScoped<IEngineerService, EngineerService>(); 
            builder.Services.AddScoped<IDeviceService, DeviceService>();
            builder.Services.AddScoped<IEngineerDeviceService, EngineerDeviceService>();
            builder.Services.AddScoped<IAuthService, AuthService>();
            builder.Services.AddScoped<IDeviceAccessRequestService, DeviceAccessRequestService>();
            builder.Services.AddScoped<IDashboardService, DashboardService>();
            builder.Services.AddScoped<ILocationNotifier, SignalRLocationNotifier>();
            builder.Services.AddScoped<IAuditLogService, AuditLogService>();
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

                            if (!string.IsNullOrWhiteSpace(accessToken)
                                && path.StartsWithSegments("/hubs/locations"))
                            {
                                context.Token = accessToken;
                            }

                            return Task.CompletedTask;
                        }
                    };
                });

            var app = builder.Build();

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();   
                app.UseSwaggerUI();
            }
            app.Use(async (context, next) =>
            {
                try
                {
                    await next();
                }
                catch (InvalidOperationException ex)
                {
                    context.Response.StatusCode = StatusCodes.Status400BadRequest;
                    context.Response.ContentType = "application/json";

                    await context.Response.WriteAsJsonAsync(new
                    {
                        message = ex.Message
                    });
                }
                catch (Exception)
                {
                    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                    context.Response.ContentType = "application/json";

                    await context.Response.WriteAsJsonAsync(new
                    {
                        message = "An unexpected error occurred."
                    });
                }
            });
            app.UseHttpsRedirection();
            app.UseCors("LocalFrontend");

            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();
            app.MapHub<LocationHub>("/hubs/locations");

            app.Run();
        }
    }
}